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
import { createTelegramBot } from './telegram-bot-lotto.js';

// =============================================================================
// Environment Configuration
// =============================================================================

const PORT = parseInt(process.env.PORT || '3000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const WEALTH_MINT = process.env.WEALTH_MINT || '56vQJqn9UekqgV52ff2DYvTqxK74sHNxAQVZgXeEpump';

// =============================================================================
// Initialize Database & Cache
// =============================================================================

const prisma = new PrismaClient({
  log: NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

const cache = new LRUCache<string, any>({ max: 1000, ttl: 30_000 });
const conn = new Connection(RPC_URL, 'confirmed');

// =============================================================================
// Legacy Helper Functions (for Telegram Bot compatibility)
// =============================================================================

/**
 * Get or create a user by ID (for telegram bot compatibility)
 */
export async function getOrCreateUser(userId: string): Promise<{ id: string; wallet: string | null }> {
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

/**
 * Compute wealth tier from amount
 */
function wealthTier(amount: number): string {
  if (amount >= 1_000_000) return 'Tycoon';
  if (amount >= 250_000) return 'Magnate';
  if (amount >= 50_000) return 'Industrialist';
  return 'Citizen';
}

// =============================================================================
// Initialize Lotto Services
// =============================================================================

let serviceManager: ServiceManager | null = null;
let userIdentityService: UserIdentityService | null = null;

async function initializeLottoServices(): Promise<void> {
  try {
    // Load authority keypair
    const authoritySecretKey = process.env.AUTHORITY_SECRET_KEY;
    if (!authoritySecretKey) {
      throw new Error('AUTHORITY_SECRET_KEY not configured');
    }

    let authorityKeypair: Keypair;
    try {
      // Try base58 format
      const secretKeyBytes = bs58.decode(authoritySecretKey);
      authorityKeypair = Keypair.fromSecretKey(secretKeyBytes);
    } catch {
      try {
        // Try JSON array format
        const secretKeyBytes = new Uint8Array(JSON.parse(authoritySecretKey));
        authorityKeypair = Keypair.fromSecretKey(secretKeyBytes);
      } catch {
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
  } catch (error) {
    console.error('[Lotto] ❌ Failed to initialize services:', error);
    throw error;
  }
}

// =============================================================================
// Initialize Telegram Bot (Optional)
// =============================================================================

let telegramBot: any = null;

function initializeTelegramBot(): void {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken || botToken === 'your_bot_token_here') {
    console.log('[Telegram] Bot token not configured, skipping');
    return;
  }

  if (!serviceManager || !userIdentityService) {
    console.log('[Telegram] Lotto services not initialized, bot will have limited functionality');
  }

  try {
    const services = serviceManager ? serviceManager.getServices() : undefined;
    const botServices = services && userIdentityService ? {
      prisma: services.prisma,
      userIdentity: userIdentityService,
      lottoServices: services.lottoServices,
    } : undefined;

    telegramBot = createTelegramBot(botToken, botServices);
    telegramBot.launch();
    console.log('[Telegram] ✅ Bot initialized and launched');
  } catch (error) {
    console.error('[Telegram] ❌ Failed to initialize bot:', error);
  }
}

// =============================================================================
// Express App Setup
// =============================================================================

const app = express();

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

/**
 * GET /health
 * Overall system health check
 */
app.get('/health', async (req, res) => {
  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;

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
  } catch (error) {
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
  try {
    // Initialize database
    await prisma.$connect();
    console.log('[Database] ✅ Connected');

    // Initialize lotto services
    await initializeLottoServices();

    // Initialize Telegram bot
    initializeTelegramBot();

    // Start Express server
    app.listen(PORT, () => {
      console.log('='.repeat(60));
      console.log(`✅ Server running on http://localhost:${PORT}`);
      console.log('='.repeat(60));
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
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
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
  console.error('Fatal error during startup:', error);
  process.exit(1);
});
