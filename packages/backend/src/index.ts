import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { LRUCache } from 'lru-cache';
import { Connection, PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import { z } from 'zod';
import { PrismaClient } from './generated/prisma';

// Env
const PORT = process.env.PORT || '8787';
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const CLUSTER = process.env.SOLANA_CLUSTER || 'mainnet-beta';
// Default to provided $WEALTH mint if env not set
const WEALTH_MINT = process.env.WEALTH_MINT || '56vQJqn9UekqgV52ff2DYvTqxK74sHNxAQVZgXeEpump';

// Initialize Prisma
const prisma = new PrismaClient();

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

// Utility: get wealth for wallet
async function getWealth(wallet: string): Promise<{ uiAmount: number; tier: string }> {
  const cacheKey = `wealth:${wallet}`;
  let wealth = cache.get(cacheKey) as { uiAmount: number; tier: string } | null;
  if (!wealth) {
    const owner = new PublicKey(wallet);
    const mint = new PublicKey(WEALTH_MINT);
    const resp = await conn.getParsedTokenAccountsByOwner(owner, { mint });
    let uiAmount = 0;
    for (const a of resp.value) {
      const info: any = a.account.data.parsed.info;
      const amount = Number(info.tokenAmount.uiAmount || 0);
      uiAmount += amount;
    }
    wealth = { uiAmount, tier: wealthTier(uiAmount) };
    cache.set(cacheKey, wealth);
  }
  return wealth;
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
  if (profile.wallet) {
    try {
      wealth = await getWealth(profile.wallet);
    } catch {}
  }
  res.json({ id: profile.id, wallet: profile.wallet || null, wealth });
});

app.get('/healthz', (_: express.Request, res: express.Response) => res.json({ ok: true, cluster: CLUSTER }));

// Lotto API routes
app.get('/api/lotto/rounds', async (req: express.Request, res: express.Response) => {
  try {
    const rounds = await prisma.round.findMany({
      include: { entries: { include: { payments: true } }, winnerEntry: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json(rounds);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rounds' });
  }
});

app.get('/api/lotto/current-round', async (req: express.Request, res: express.Response) => {
  try {
    const round = await prisma.round.findFirst({
      where: { status: 'OPEN' },
      include: { entries: { include: { payments: true } } },
    });
    if (!round) return res.status(404).json({ error: 'No active round' });
    res.json(round);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch current round' });
  }
});

app.post('/api/lotto/rounds', async (req: express.Request, res: express.Response) => {
  // Admin only - check header or env
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_KEY) return res.status(403).json({ error: 'Unauthorized' });

  try {
    const round = await prisma.round.create({ data: {} });
    res.json(round);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create round' });
  }
});

app.put('/api/lotto/rounds/:id/close', async (req: express.Request, res: express.Response) => {
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_KEY) return res.status(403).json({ error: 'Unauthorized' });

  const { id } = req.params;
  try {
    const round = await prisma.round.findUnique({ where: { id }, include: { entries: true } });
    if (!round || round.status !== 'OPEN') return res.status(400).json({ error: 'Round not open' });

    // Pick winner randomly
    const entries = round.entries;
    if (entries.length === 0) return res.status(400).json({ error: 'No entries' });

    const winnerEntry = entries[Math.floor(Math.random() * entries.length)];

    await prisma.round.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        winner: winnerEntry.wallet,
        winnerEntryId: winnerEntry.id,
      },
    });

    res.json({ message: 'Round closed', winner: winnerEntry.wallet });
  } catch (error) {
    res.status(500).json({ error: 'Failed to close round' });
  }
});

app.post('/api/lotto/join', async (req: express.Request, res: express.Response) => {
  const userId = getUserId(req);
  const { amount } = req.body; // in lamports
  const minEntry = Number(process.env.LOTTO_MIN_ENTRY) || 1000000; // 1 $WEALTH

  if (!amount || amount < minEntry) return res.status(400).json({ error: `Minimum entry is ${minEntry} lamports` });

  try {
    const profile = users.get(userId);
    if (!profile?.wallet) return res.status(400).json({ error: 'Wallet not linked' });

    // Check wealth
    const wealth = await getWealth(profile.wallet);
    if (wealth.uiAmount * 1e9 < amount) return res.status(400).json({ error: 'Insufficient $WEALTH' });

    // Get current round
    const round = await prisma.round.findFirst({ where: { status: 'OPEN' } });
    if (!round) return res.status(400).json({ error: 'No active round' });

    // Check if already joined
    const existing = await prisma.entry.findFirst({ where: { roundId: round.id, userId } });
    if (existing) return res.status(400).json({ error: 'Already joined this round' });

    // Check max entries
    const entryCount = await prisma.entry.count({ where: { roundId: round.id } });
    const maxEntries = Number(process.env.LOTTO_MAX_ENTRIES_PER_ROUND) || 1000;
    if (entryCount >= maxEntries) return res.status(400).json({ error: 'Round is full' });

    // Create entry
    const entry = await prisma.entry.create({
      data: {
        roundId: round.id,
        userId,
        wallet: profile.wallet,
        amount,
        ticketCount: Math.floor(amount / minEntry), // 1 ticket per min entry
      },
    });

    // Create payment (pending)
    const reference = `lotto-${entry.id}-${Date.now()}`;
    const payment = await prisma.payment.create({
      data: {
        reference,
        amount,
        wallet: profile.wallet,
        entryId: entry.id,
      },
    });

    // Update round pot
    await prisma.round.update({
      where: { id: round.id },
      data: { potAmount: { increment: amount } },
    });

    res.json({ entry, payment, solanaPayUrl: `solana:${process.env.WEALTH_MINT}?amount=${amount / 1e9}&reference=${reference}&label=WealthWars%20Lotto&message=Join%20Round%20${round.id}` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to join' });
  }
});

app.get('/api/lotto/my-entries', async (req: express.Request, res: express.Response) => {
  const userId = getUserId(req);
  try {
    const entries = await prisma.entry.findMany({
      where: { userId },
      include: { round: true, payments: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

app.post('/api/lotto/confirm-payment', async (req: express.Request, res: express.Response) => {
  const { reference } = req.body;
  try {
    const payment = await prisma.payment.findUnique({ where: { reference } });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    // In real, check Solana transaction
    // For MVP, mark as confirmed
    await prisma.payment.update({
      where: { reference },
      data: { status: 'CONFIRMED' },
    });

    res.json({ message: 'Payment confirmed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

// Telegram webhook
app.post('/api/tg/webhook', (req: express.Request, res: express.Response) => {
  // Placeholder for TG webhook
  res.json({ ok: true });
});

app.listen(Number(PORT), () => {
  console.log(`[backend] listening on :${PORT}, cluster=${CLUSTER}`);
});
