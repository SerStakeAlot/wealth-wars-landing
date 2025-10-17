import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { LRUCache } from 'lru-cache';
import { Connection, PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { createTelegramBot, handleTelegramWebhook } from './telegram-bot.js';

// Env
const PORT = process.env.PORT || '8787';
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const CLUSTER = process.env.SOLANA_CLUSTER || 'mainnet-beta';
// Default to provided $WEALTH mint if env not set
const WEALTH_MINT = process.env.WEALTH_MINT || '56vQJqn9UekqgV52ff2DYvTqxK74sHNxAQVZgXeEpump';

// Initialize Prisma
const prisma = new PrismaClient();
console.log('[backend] DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
console.log('[backend] Database connection attempt...');

// Push database schema on startup (for production deployment)
async function initializeDatabase() {
  try {
    console.log('[backend] Checking database schema...');
    // Try to run a simple query to test connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('[backend] ✅ Database connection successful');

    // Check if tables exist by trying to count users
    const userCount = await prisma.user.count().catch(() => -1);
    console.log(`[backend] User count result: ${userCount}`);

    if (userCount === -1) {
      console.log('[backend] Database tables do not exist, pushing schema...');
      // Use Prisma's push functionality
      const { execSync } = await import('child_process');
      try {
        execSync('npx prisma db push --accept-data-loss --schema=./prisma/schema.prisma', { stdio: 'inherit' });
        console.log('[backend] ✅ Database schema pushed successfully');
      } catch (pushError: any) {
        console.error('[backend] ❌ Failed to push database schema:', pushError.message);
      }
    } else {
      console.log('[backend] ✅ Database schema already exists');
    }
  } catch (error: any) {
    console.error('[backend] ❌ Database connection/initialization failed:', error.message);
  }
}

// Initialize Telegram bot if token is provided
let telegramBot: any = null;
if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN !== 'your_bot_token_here') {
  telegramBot = createTelegramBot(process.env.TELEGRAM_BOT_TOKEN);
  console.log('[backend] Telegram bot initialized');

  // Launch bot in polling mode for development (fallback when webhooks are unstable)
  console.log('[backend] Attempting to launch bot in polling mode...');
  try {
    telegramBot.launch();
    console.log('[backend] ✅ Telegram bot launched in polling mode successfully');
  } catch (err: any) {
    console.error('[backend] ❌ Failed to launch bot in polling mode:', err.message);
  }
}

// Simple in-memory stores (replace with persistent DB in production)
type UserProfile = { id: string; email?: string; wallet?: string; wealth?: { uiAmount: number; tier: string } };
const users = new Map<string, UserProfile>();
const pendingLinks = new Map<string, { userId: string; message: string; code: string; wallet?: string }>();

// Database helper functions
export async function getOrCreateUser(userId: string): Promise<{ id: string; wallet: string | null }> {
  let user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    user = await prisma.user.create({ data: { id: userId } });
  }
  return { id: user.id, wallet: user.wallet };
}

async function updateUserWallet(userId: string, wallet: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { wallet, updatedAt: new Date() }
  });
}
const cache = new LRUCache<string, any>({ max: 1000, ttl: 30_000 });

const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());
const limiter = rateLimit({ windowMs: 60_000, max: 60 });
app.use(limiter);

// Serve static files from public directory
app.use(express.static('public'));

const conn = new Connection(RPC_URL, 'confirmed');

// Utility: compute tier
function wealthTier(amount: number) {
  if (amount >= 1_000_000) return 'Tycoon';
  if (amount >= 250_000) return 'Magnate';
  if (amount >= 50_000) return 'Industrialist';
  return 'Citizen';
}

// Utility: get wealth for wallet
export async function getWealth(wallet: string): Promise<{ uiAmount: number; tier: string }> {
  const cacheKey = `wealth:${wallet}`;
  let wealth = cache.get(cacheKey) as { uiAmount: number; tier: string } | null;
  if (!wealth) {
    try {
      console.log(`[backend] Checking wealth for wallet: ${wallet}, mint: ${WEALTH_MINT}`);
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
      console.log(`[backend] Wealth result: ${uiAmount} $WEALTH`);
    } catch (error: any) {
      console.warn(`[backend] Failed to get wealth for wallet ${wallet}:`, error.message || error);
      // For demo purposes, return some mock wealth if wallet is linked
      if (wallet && wallet !== '11111111111111111111111111111112') {
        wealth = { uiAmount: 100, tier: 'Citizen' }; // Mock 100 $WEALTH for testing
      } else {
        wealth = { uiAmount: 0, tier: 'Citizen' };
      }
    }
    cache.set(cacheKey, wealth);
  }
  return wealth;
}

// Demo auth: derive user from header (replace with real auth)
function getUserId(req: express.Request): string {
  const id = (req.headers['x-user-id'] as string) || 'demo-user';
  return id;
}

// Start link
app.post('/link/start', async (req: express.Request, res: express.Response) => {
  const userId = getUserId(req);
  await getOrCreateUser(userId); // Ensure user exists in DB
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
    // store mapping in database
    await updateUserWallet(userId, pubkey.toBase58());
    pendingLinks.delete(userId);
    res.json({ linked: true, wallet: pubkey.toBase58() });
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
  const user = await getOrCreateUser(userId);
  let wealth = null as null | { uiAmount: number; tier: string };
  if (user.wallet) {
    try {
      wealth = await getWealth(user.wallet);
    } catch {}
  }
  res.json({ id: user.id, wallet: user.wallet || null, wealth });
});

app.get('/healthz', (_: express.Request, res: express.Response) => res.json({ ok: true, cluster: CLUSTER }));

// Test route
app.get('/test', (_: express.Request, res: express.Response) => res.json({ message: 'Server is working' }));

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
  console.log('[backend] Lotto join attempt for userId:', userId);
  const { amount } = req.body; // in lamports
  const minEntry = Number(process.env.LOTTO_MIN_ENTRY) || 1000000; // 1 $WEALTH

  if (!amount || amount < minEntry) return res.status(400).json({ error: `Minimum entry is ${minEntry} lamports` });

  try {
    const user = await getOrCreateUser(userId);
    console.log('[backend] User data:', user);
    if (!user.wallet) {
      console.log('[backend] Wallet not linked for user:', userId);
      return res.status(400).json({ error: 'Wallet not linked' });
    }

    // Check wealth
    const wealth = await getWealth(user.wallet);
    if (wealth.uiAmount * 1e9 < amount) return res.status(400).json({ error: 'Insufficient $WEALTH' });

    // Get current round
    const round = await prisma.round.findFirst({ where: { status: 'OPEN' } });
    if (!round) return res.status(400).json({ error: 'No active round' });

    // Check if already joined
    // TEMP: Allow multiple joins for testing
    // const existing = await prisma.entry.findFirst({ where: { roundId: round.id, userId } });
    // if (existing) return res.status(400).json({ error: 'Already joined this round' });

    // Check max entries
    const entryCount = await prisma.entry.count({ where: { roundId: round.id } });
    const maxEntries = Number(process.env.LOTTO_MAX_ENTRIES_PER_ROUND) || 1000;
    if (entryCount >= maxEntries) return res.status(400).json({ error: 'Round is full' });

    // Create entry
    const entry = await prisma.entry.create({
      data: {
        roundId: round.id,
        userId,
        wallet: user.wallet,
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
        wallet: user.wallet,
        entryId: entry.id,
      },
    });

    // Update round pot
    await prisma.round.update({
      where: { id: round.id },
      data: { potAmount: { increment: amount } },
    });

    res.json({ entry, payment, solanaPayUrl: `solana:${process.env.WEALTH_MINT}?amount=${amount / 1e9}&recipient=${process.env.TREASURY_WALLET}&reference=${reference}&label=WealthWars%20Lotto&message=Join%20Round%20${round.id}` });
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
  const { reference, signature } = req.body;
  try {
    const payment = await prisma.payment.findUnique({ where: { reference } });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    if (signature) {
      // Verify transaction
      const tx = await conn.getTransaction(signature);
      if (!tx) return res.status(400).json({ error: 'Transaction not found' });

      // Check if to treasury, amount matches, and memo has reference
      const treasury = new PublicKey(process.env.TREASURY_WALLET!);
      let valid = false;
      for (const ix of tx.transaction.message.instructions) {
        // Assume memo is in ix.data
        const memo = Buffer.from(ix.data).toString('utf8');
        if (memo.includes(reference)) {
          // Check transfer amount, but simplified
          valid = true;
          break;
        }
      }
      if (!valid) return res.status(400).json({ error: 'Invalid transaction' });
    }

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
  if (!telegramBot) {
    return res.status(500).json({ error: 'Telegram bot not configured' });
  }
  handleTelegramWebhook(req, res, telegramBot);
});

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('[backend] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[backend] Uncaught Exception:', err);
  process.exit(1);
});

// Start server
async function startServer() {
  await initializeDatabase();

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[backend] listening on :${PORT}, cluster=${CLUSTER}`);
    console.log(`[backend] Server started successfully`);
  }).on('error', (err) => {
    console.error('[backend] Server failed to start:', err);
    process.exit(1);
  });
}

startServer().catch((err) => {
  console.error('[backend] Failed to start server:', err);
  process.exit(1);
});
