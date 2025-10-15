import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { LRUCache } from 'lru-cache';
import { Connection, PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import { z } from 'zod';

// Env
const PORT = process.env.PORT || '8787';
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const CLUSTER = process.env.SOLANA_CLUSTER || 'mainnet-beta';
// Default to provided $WEALTH mint if env not set
const WEALTH_MINT = process.env.WEALTH_MINT || '56vQJqn9UekqgV52ff2DYvTqxK74sHNxAQVZgXeEpump';

// Simple in-memory stores (replace with persistent DB in production)
type UserProfile = { id: string; email?: string; wallet?: string; wealth?: { uiAmount: number; tier: string } };
const users = new Map<string, UserProfile>();
const pendingLinks = new Map<string, { userId: string; message: string; code: string; wallet?: string }>();

// Cache for RPC results
const cache = new LRUCache<string, any>({ max: 1000, ttl: 30_000 });

const app = express();
app.use(cors());
app.use(express.json());
const limiter = rateLimit({ windowMs: 60_000, max: 60 });
app.use(limiter);

const conn = new Connection(RPC_URL, 'confirmed');

// Utility: compute tier
function wealthTier(amount: number) {
  if (amount >= 1_000_000) return 'Tycoon';
  if (amount >= 250_000) return 'Magnate';
  if (amount >= 50_000) return 'Industrialist';
  return 'Citizen';
}

// Demo auth: derive user from header (replace with real auth)
function getUserId(req: express.Request): string {
  const id = (req.headers['x-user-id'] as string) || 'demo-user';
  if (!users.has(id)) users.set(id, { id });
  return id;
}

// Start link
app.post('/link/start', (req: express.Request, res: express.Response) => {
  const userId = getUserId(req);
  const code = Math.random().toString(36).slice(2, 6).toUpperCase();
  const message = `Wealth Wars — Link wallet for user ${userId}, code ${code}`;
  pendingLinks.set(userId, { userId, message, code });
  res.json({ message });
});

// Finish link
const finishBody = z.object({ address: z.string(), signature: z.string() });
app.post('/link/finish', async (req: express.Request, res: express.Response) => {
  const parse = finishBody.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid body' });
  const { address, signature } = parse.data;
  const userId = getUserId(req);
  const pending = pendingLinks.get(userId);
  if (!pending) return res.status(400).json({ error: 'No pending link' });
  try {
    const pubkey = new PublicKey(address);
    // Verify signature: message must match exactly
    const msgBytes = Buffer.from(pending.message, 'utf8');
    const sigBytes = Buffer.from(signature, 'base64');
  // Verify with ed25519 (tweetnacl)
  const ok = nacl.sign.detached.verify(new Uint8Array(msgBytes), new Uint8Array(sigBytes), pubkey.toBytes());
    if (!ok) return res.status(400).json({ error: 'Bad signature' });
    // store mapping
    const profile = users.get(userId)!;
    profile.wallet = pubkey.toBase58();
    pendingLinks.delete(userId);
    res.json({ linked: true, wallet: profile.wallet });
  } catch (e: any) {
    res.status(400).json({ error: 'Verification failed', details: e?.message });
  }
});

// Wealth balance for address
app.get('/wallet/:address/wealth', async (req: express.Request, res: express.Response) => {
  try {
    const { address } = req.params;
    if (!WEALTH_MINT) return res.status(500).json({ error: 'WEALTH_MINT not set' });
    const cacheKey = `wealth:${address}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const owner = new PublicKey(address);
    const mint = new PublicKey(WEALTH_MINT);
    // Fetch SPL token accounts for owner+mint
    const resp = await conn.getParsedTokenAccountsByOwner(owner, { mint });
    let uiAmount = 0;
    for (const a of resp.value) {
      const info: any = a.account.data.parsed.info;
      const amount = Number(info.tokenAmount.uiAmount || 0);
      uiAmount += amount;
    }
    const tier = wealthTier(uiAmount);
    const result = { address, uiAmount, tier };
    cache.set(cacheKey, result);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Failed to fetch wealth' });
  }
});

// /me combines profile + wealth (if linked)
app.get('/me', async (req: express.Request, res: express.Response) => {
  const userId = getUserId(req);
  const profile = users.get(userId)!;
  let wealth = null as null | { uiAmount: number; tier: string };
  if (profile.wallet && WEALTH_MINT) {
    try {
      const cacheKey = `wealth:${profile.wallet}`;
      wealth = cache.get(cacheKey) || null;
      if (!wealth) {
        const owner = new PublicKey(profile.wallet);
        const mint = new PublicKey(WEALTH_MINT);
        const resp = await conn.getParsedTokenAccountsByOwner(owner, { mint });
        let uiAmount = 0;
        for (const a of resp.value) {
          const info: any = a.account.data.parsed.info;
          const amount = Number(info.tokenAmount.uiAmount || 0);
          uiAmount += amount;
        }
        wealth = { uiAmount, tier: wealthTier(uiAmount) };
        cache.set(cacheKey, { address: profile.wallet, ...wealth });
      }
    } catch {}
  }
  res.json({ id: profile.id, wallet: profile.wallet || null, wealth });
});

app.get('/healthz', (_: express.Request, res: express.Response) => res.json({ ok: true, cluster: CLUSTER }));

app.listen(Number(PORT), () => {
  console.log(`[backend] listening on :${PORT}, cluster=${CLUSTER}`);
});
