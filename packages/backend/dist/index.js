/**
 * Enhanced Backend Server with Lotto Services
 *
 * This replaces the main index.ts with integrated lotto functionality.
 */
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { LRUCache } from 'lru-cache';
import { PrismaClient } from '@prisma/client';
import { ServiceManager } from './services/service-manager.js';
import { UserIdentityService } from './services/user-identity.js';
import { createLottoRoutes } from './api/lotto-routes.js';
import { errorHandler } from './api/middleware.js';
import { createTelegramBot as createSimpleBot } from './telegram-bot.js';
import { createTelegramBot as createLottoBot, handleTelegramWebhook } from './telegram-bot-lotto.js';
// =============================================================================
// Environment Configuration
// =============================================================================
const PORT = parseInt(process.env.PORT || '3000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const WEALTH_MINT = process.env.WEALTH_MINT || '56vQJqn9UekqgV52ff2DYvTqxK74sHNxAQVZgXeEpump';
const WEALTH_SYMBOL = process.env.WEALTH_SYMBOL || 'WEALTH';
const ENTRY_WEALTH = parseFloat(process.env.ENTRY_WEALTH || '100');
const PAYOUT_WINNER_BPS = parseInt(process.env.PAYOUT_WINNER_BPS || '8000', 10);
const PAYOUT_TREASURY_BPS = parseInt(process.env.PAYOUT_TREASURY_BPS || '2000', 10);
// =============================================================================
// Initialize Database & Cache
// =============================================================================
const prisma = new PrismaClient({
    log: NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});
const cache = new LRUCache({ max: 1000, ttl: 30_000 });
const conn = new Connection(RPC_URL, 'confirmed');
async function fetchMintDecimals(mintStr) {
    const mintPk = new PublicKey(mintStr);
    const info = await conn.getParsedAccountInfo(mintPk);
    const parsed = info.value?.data;
    const decimals = parsed?.parsed?.info?.decimals;
    if (typeof decimals !== 'number') {
        throw new Error(`Failed to fetch mint decimals for ${mintStr}`);
    }
    return decimals;
}
async function detectTokenProgram(mintStr) {
    const mintPk = new PublicKey(mintStr);
    const acct = await conn.getAccountInfo(mintPk);
    if (!acct)
        throw new Error('Mint account not found');
    const owner = acct.owner.toBase58();
    process.env.WEALTH_TOKEN_PROGRAM = owner;
    return owner;
}

// Ensure critical DB columns exist in production (self-healing)
async function ensureDbSchema() {
        try {
                // Add missing columns if needed (PostgreSQL)
                await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" TEXT`);
                await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "wallet" TEXT UNIQUE`);
                await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegramId" TEXT UNIQUE`);
                // Backfill username for existing rows where null/empty
                await prisma.$executeRawUnsafe(`UPDATE "users"
            SET "username" = COALESCE(NULLIF("username", ''),
                CASE WHEN "telegramId" IS NOT NULL THEN '@' || "telegramId"
                         ELSE 'user_' || SUBSTR("id", 1, 8) END)
            WHERE "username" IS NULL OR "username" = ''`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "rounds" ADD COLUMN IF NOT EXISTS "mint" TEXT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "rounds" ADD COLUMN IF NOT EXISTS "entryAmountBaseUnits" BIGINT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "rounds" ADD COLUMN IF NOT EXISTS "potAta" TEXT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "rounds" ADD COLUMN IF NOT EXISTS "winnerAmountBaseUnits" BIGINT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "rounds" ADD COLUMN IF NOT EXISTS "treasuryAmountBaseUnits" BIGINT`);

        await prisma.$executeRawUnsafe(`ALTER TABLE "entries" ADD COLUMN IF NOT EXISTS "mint" TEXT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "entries" ADD COLUMN IF NOT EXISTS "amountBaseUnits" BIGINT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "entries" ADD COLUMN IF NOT EXISTS "userAta" TEXT`);

        await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS entries_round_wallet_unique ON "entries" ("roundId", "wallet")`);

        console.log('[Database] ✅ Schema checked/extended (users + SPL fields)');
        }
        catch (err) {
                console.warn('[Database] ⚠️ Schema check failed (continuing):', err?.message || err);
        }
}
// =============================================================================
// Legacy Helper Functions (for Telegram Bot compatibility)
// =============================================================================
/**
 * Get or create a user by ID (for telegram bot compatibility)
 */
export async function getOrCreateUser(userId) {
    let user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        // Create with a username from the userId
        user = await prisma.user.create({
            data: {
                id: userId,
                username: `user_${userId.slice(0, 8)}` // Simple default username
            }
        });
    }
    return { id: user.id, wallet: user.wallet };
}
/**
 * Get wealth balance for a wallet address
 */
export async function getWealth(wallet) {
    const cacheKey = `wealth:${wallet}`;
    let wealth = cache.get(cacheKey);
    if (!wealth) {
        try {
            console.log(`[backend] Checking wealth for wallet: ${wallet}, mint: ${WEALTH_MINT}`);
            const owner = new PublicKey(wallet);
            const mint = new PublicKey(WEALTH_MINT);
            const resp = await conn.getParsedTokenAccountsByOwner(owner, { mint });
            let uiAmount = 0;
            for (const a of resp.value) {
                const info = a.account.data.parsed.info;
                const amount = Number(info.tokenAmount.uiAmount || 0);
                uiAmount += amount;
            }
            wealth = { uiAmount, tier: wealthTier(uiAmount) };
            console.log(`[backend] Wealth result: ${uiAmount} $WEALTH`);
        }
        catch (error) {
            console.warn(`[backend] Failed to get wealth for wallet ${wallet}:`, error.message || error);
            // For demo purposes, return some mock wealth if wallet is linked
            if (wallet && wallet !== '11111111111111111111111111111112') {
                wealth = { uiAmount: 100, tier: 'Citizen' }; // Mock 100 $WEALTH for testing
            }
            else {
                wealth = { uiAmount: 0, tier: 'Citizen' };
            }
        }
        cache.set(cacheKey, wealth);
    }
    return wealth;
}
/**
 * Compute wealth tier from amount
 */
function wealthTier(amount) {
    if (amount >= 1_000_000)
        return 'Tycoon';
    if (amount >= 250_000)
        return 'Magnate';
    if (amount >= 50_000)
        return 'Industrialist';
    return 'Citizen';
}
// =============================================================================
// Initialize Lotto Services
// =============================================================================
let serviceManager = null;
let userIdentityService = null;
async function initializeLottoServices() {
    try {
        await ensureDbSchema();
        // Load authority keypair
        const authoritySecretKey = process.env.AUTHORITY_SECRET_KEY;
        if (!authoritySecretKey) {
            throw new Error('AUTHORITY_SECRET_KEY not configured');
        }
        let authorityKeypair;
        try {
            // Try base58 format
            const secretKeyBytes = bs58.decode(authoritySecretKey);
            authorityKeypair = Keypair.fromSecretKey(secretKeyBytes);
        }
        catch {
            try {
                // Try JSON array format
                const secretKeyBytes = new Uint8Array(JSON.parse(authoritySecretKey));
                authorityKeypair = Keypair.fromSecretKey(secretKeyBytes);
            }
            catch {
                throw new Error('Invalid AUTHORITY_SECRET_KEY format');
            }
        }
        console.log('[Lotto] Authority:', authorityKeypair.publicKey.toBase58());
        // Initialize service manager
        serviceManager = new ServiceManager({
            authorityKeypair,
            enableHealthMonitor: true,
            healthCheckIntervalMs: 30000,
        });
        await serviceManager.start();
        // Get services
        const services = serviceManager.getServices();
        // Initialize user identity service
        userIdentityService = new UserIdentityService(services.prisma);
        console.log('[Lotto] ✅ All services initialized successfully');
    }
    catch (error) {
        console.error('[Lotto] ❌ Failed to initialize services:', error);
        throw error;
    }
}
// =============================================================================
// Initialize Telegram Bot (Optional)
// =============================================================================
let telegramBot = null;
function initializeTelegramBot() {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const mode = (process.env.TELEGRAM_MODE || 'polling').toLowerCase();
    if (mode === 'disabled') {
        console.log('[Telegram] Bot disabled via TELEGRAM_MODE=disabled');
        return;
    }
    if (!botToken || botToken === 'your_bot_token_here') {
        console.log('[Telegram] Bot token not configured, skipping');
        return;
    }
    try {
        // If lotto services are ready, use the lotto-integrated bot
        if (serviceManager && typeof serviceManager.isReady === 'function' && serviceManager.isReady() && userIdentityService) {
            const services = serviceManager.getServices();
            const botServices = {
                prisma: services.prisma,
                userIdentity: userIdentityService,
                lottoServices: services.lottoServices,
            };
            telegramBot = createLottoBot(botToken, botServices);
            console.log('[Telegram] Using lotto-integrated bot');
        }
        else {
            console.log('[Telegram] Lotto services not ready; using standalone bot');
            telegramBot = createSimpleBot(botToken, undefined);
        }
        if (mode === 'webhook') {
            const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
            const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
            if (webhookUrl) {
                telegramBot.telegram.setWebhook(webhookUrl, secret ? { secret_token: secret } : undefined)
                    .then(() => console.log('[Telegram] ✅ Webhook set:', webhookUrl))
                    .catch((err) => console.error('[Telegram] ❌ Failed to set webhook:', err?.message || err));
            }
            else {
                console.warn('[Telegram] TELEGRAM_MODE=webhook but TELEGRAM_WEBHOOK_URL not set; set it or configure webhook manually.');
            }
            console.log('[Telegram] Using webhook mode');
        }
        else {
            // Catch launch errors (e.g., 409 conflict when another instance is running)
            telegramBot.launch().catch((err) => {
                console.error('[Telegram] Launch failed:', err?.message || err);
            });
            console.log('[Telegram] ✅ Bot initialized and launched (polling)');
        }
    }
    catch (error) {
        console.error('[Telegram] ❌ Failed to initialize bot:', error);
    }
}
// =============================================================================
// Express App Setup
// =============================================================================
const app = express();
// Global BigInt-safe JSON responder: monkey-patch res.json to stringify BigInt
app.use((req, res, next) => {
    const json = res.json.bind(res);
    res.json = (body) => {
        try {
            const replacer = (_k, v) => (typeof v === 'bigint' ? v.toString() : v);
            const str = JSON.stringify(body, replacer);
            return res.type('application/json').send(str);
        }
        catch {
            return json(body);
        }
    };
    next();
});
// Trust proxy (for Railway, Heroku, etc.)
app.set('trust proxy', 1);
// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
}));
app.use(express.json());
// Rate limiting
const limiter = rateLimit({
    windowMs: 60_000, // 1 minute
    max: 100, // 100 requests per minute
    message: { success: false, error: 'Too many requests' },
});
app.use('/api/', limiter);
// Serve static files
app.use(express.static('public'));
// =============================================================================
// Health Check Routes
// =============================================================================
// Telegram webhook endpoint (only used if TELEGRAM_MODE=webhook)
app.post('/api/telegram/webhook', async (req, res) => {
    try {
        if (!telegramBot) {
            return res.status(503).json({ success: false, error: 'Telegram bot not initialized' });
        }
        const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
        const header = req.headers['x-telegram-bot-api-secret-token'];
        if (expected && header !== expected) {
            return res.status(401).json({ success: false, error: 'Invalid webhook secret' });
        }
        await handleTelegramWebhook(req, res, telegramBot);
    }
    catch (err) {
        console.error('[Telegram] Webhook handler error:', err?.message || err);
        res.status(500).json({ success: false, error: 'Webhook handling failed' });
    }
});
app.get('/api/telegram/health', async (req, res) => {
    try {
        const mode = (process.env.TELEGRAM_MODE || 'polling').toLowerCase();
        const hasToken = !!process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN !== 'your_bot_token_here';
        let webhookInfo = null;
        if (mode === 'webhook' && telegramBot) {
            try {
                webhookInfo = await telegramBot.telegram.getWebhookInfo();
            }
            catch (e) {
                webhookInfo = { error: e?.message || 'failed to fetch' };
            }
        }
        res.json({
            success: true,
            data: {
                mode,
                configured: hasToken,
                webhookUrl: process.env.TELEGRAM_WEBHOOK_URL ? 'set' : 'not set',
                status: mode === 'webhook' ? (webhookInfo?.url ? 'OK' : 'misconfigured') : (mode === 'disabled' ? 'disabled' : 'polling'),
                webhookInfo: webhookInfo && webhookInfo.url ? { url: webhookInfo.url, hasCustomCert: webhookInfo.has_custom_certificate, pending: webhookInfo.pending_update_count } : undefined,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to get Telegram health' });
    }
});
/**
 * GET / (root)
 * Root endpoint for Railway healthcheck
 */
app.get('/', (req, res) => {
    res.json({
        success: true,
        data: {
            service: 'Wealth Wars Backend',
            status: 'healthy',
            version: '2.0',
            timestamp: new Date().toISOString(),
        },
    });
});
/**
 * GET /health
 * Overall system health check
 */
app.get('/health', async (req, res) => {
    try {
        // Check database
        await prisma.$queryRaw `SELECT 1`;
        // Get lotto services health if available
        let lottoHealth = null;
        if (serviceManager && serviceManager.isReady()) {
            const services = serviceManager.getServices();
            if (services.healthMonitor) {
                lottoHealth = services.healthMonitor.getLastHealthCheck();
            }
        }
        res.json({
            success: true,
            data: {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                services: {
                    database: 'healthy',
                    lotto: serviceManager?.isReady() ? 'healthy' : 'not initialized',
                    telegram: telegramBot ? 'healthy' : 'not configured',
                },
                lottoHealth,
            },
        });
    }
    catch (error) {
        res.status(503).json({
            success: false,
            error: 'Service unavailable',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /api/health
 * API-specific health check
 */
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        data: {
            status: 'healthy',
            service: 'api',
            timestamp: new Date().toISOString(),
        },
    });
});

// =============================================================================
// Admin: Ensure DB schema (protected)
// =============================================================================
app.post('/api/admin/ensure-db', async (req, res) => {
    try {
        const adminKey = process.env.ADMIN_API_KEY || process.env.ADMIN_API_TOKEN;
        const auth = req.headers['authorization'] || '';
        if (!adminKey || typeof auth !== 'string' || !auth.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const token = auth.slice('Bearer '.length);
        if (token !== adminKey) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        await ensureDbSchema();
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: err?.message || 'Failed to ensure DB schema' });
    }
});
// =============================================================================
// Lotto API Routes
// =============================================================================
/**
 * Mount lotto routes if services are initialized
 */
app.use('/api/lotto', (req, res, next) => {
    if (!serviceManager || !userIdentityService) {
        return res.status(503).json({
            success: false,
            error: 'Lotto services not initialized',
        });
    }
    const services = serviceManager.getServices();
    const lottoRouter = createLottoRoutes(services.lottoServices, userIdentityService);
    lottoRouter(req, res, next);
});
// =============================================================================
// Error Handling
// =============================================================================
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Not found',
        path: req.path,
    });
});
// Global error handler
app.use(errorHandler);
// =============================================================================
// Server Startup
// =============================================================================
async function startServer() {
    // Try to connect to the database, but don't crash the bot if it fails
    let dbConnected = false;
    try {
        await prisma.$connect();
        dbConnected = true;
        console.log('[Database] ✅ Connected');
    }
    catch (error) {
        console.warn('[Database] ⚠️ Failed to connect. Continuing in degraded mode (bot and API may be limited).');
    }
    // Fetch mint decimals and cache; fail if not available
    try {
        const decimals = await fetchMintDecimals(WEALTH_MINT);
        const tokenProgram = await detectTokenProgram(WEALTH_MINT);
        process.env.WEALTH_DECIMALS = String(decimals);
        console.log(`[Token] ${WEALTH_SYMBOL} mint ${WEALTH_MINT} decimals: ${decimals} | program: ${tokenProgram}`);
        console.log(`[Token] Entry amount: ${ENTRY_WEALTH} ${WEALTH_SYMBOL} | Payout: ${PAYOUT_WINNER_BPS / 100}% winner / ${PAYOUT_TREASURY_BPS / 100}% treasury`);
    }
    catch (e) {
        console.error('[Token] ❌ Failed to load mint decimals:', e?.message || e);
        throw e;
    }
    // Initialize lotto services (optional)
    try {
        await initializeLottoServices();
    }
    catch (lottoError) {
        console.warn('[Lotto] ⚠️  Lotto services disabled:', lottoError.message);
        console.warn('[Lotto] ⚠️  Bot will work but lotto features unavailable');
    }
    // Initialize Telegram bot regardless of DB/lotto state
    initializeTelegramBot();
    // Start Express server
    app.listen(PORT, () => {
        console.log('='.repeat(60));
        console.log(`✅ Server running on http://localhost:${PORT}`);
        console.log('='.repeat(60));
        console.log('Mode:');
        console.log(`  Database: ${dbConnected ? 'connected' : 'degraded (not connected)'}`);
        console.log(`  Lotto: ${serviceManager?.isReady() ? 'initialized' : 'disabled'}`);
        console.log(`  Telegram: ${process.env.TELEGRAM_BOT_TOKEN ? 'enabled' : 'not configured'}`);
        console.log('');
        console.log('Available endpoints:');
        console.log(`  GET  /health              - System health check`);
        console.log(`  GET  /api/health          - API health check`);
        console.log(`  GET  /api/lotto/health    - Lotto services health`);
        console.log('');
        console.log('Lotto API:');
        console.log(`  POST /api/lotto/users/web         - Create web user`);
        console.log(`  POST /api/lotto/users/telegram    - Create Telegram user`);
        console.log(`  POST /api/lotto/rounds            - Create round (admin)`);
        console.log(`  GET  /api/lotto/rounds/current    - Get current round`);
        console.log(`  POST /api/lotto/rounds/:id/join/web      - Join as web user`);
        console.log(`  POST /api/lotto/rounds/:id/join/telegram - Join as Telegram user`);
        console.log(`  POST /api/lotto/rounds/:id/settle - Settle round (admin)`);
        console.log(`  POST /api/lotto/entries/:id/claim - Claim payout/refund`);
        console.log('='.repeat(60));
        if (process.env.WEALTH_DECIMALS) {
            console.log(`[Token] ${WEALTH_SYMBOL} mint ${WEALTH_MINT} decimals: ${process.env.WEALTH_DECIMALS}`);
            console.log(`[Token] Entry amount: ${ENTRY_WEALTH} ${WEALTH_SYMBOL} | Payout: ${PAYOUT_WINNER_BPS / 100}% winner / ${PAYOUT_TREASURY_BPS / 100}% treasury`);
        }
    });
}
// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('\nSIGTERM received, shutting down gracefully...');
    if (serviceManager) {
        await serviceManager.stop();
    }
    if (telegramBot) {
        telegramBot.stop();
    }
    await prisma.$disconnect();
    process.exit(0);
});
process.on('SIGINT', async () => {
    console.log('\nSIGINT received, shutting down gracefully...');
    if (serviceManager) {
        await serviceManager.stop();
    }
    if (telegramBot) {
        telegramBot.stop();
    }
    await prisma.$disconnect();
    process.exit(0);
});
// Start the server
startServer().catch((error) => {
    console.error('Startup error (non-fatal):', error);
});
