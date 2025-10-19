/**
 * Enhanced Telegram Bot with Lotto Service Integration
 * 
 * This version integrates with the on-chain lotto program using
 * EntryProcessor and SettlementService for real blockchain transactions.
 */

import { Telegraf, Context } from 'telegraf';
import { PrismaClient } from '@prisma/client';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import { UserIdentityService } from './services/user-identity.js';
import { LottoServices } from './services/lotto/index.js';
import { getWealth } from './index.js';

const toBigInt = (value: number | bigint) => (typeof value === 'bigint' ? value : BigInt(value));
const bigintToLamports = (value: number | bigint) => Number(toBigInt(value)) / 1e9;
const lamportsToWealth = (lamports: bigint) => Number(lamports) / 1e9;

// In-memory store for pending wallet links
const pendingWalletLinks = new Map<string, {
  userId: string;
  message: string;
  code: string;
  walletAddress?: string;
  signature?: string;
  timestamp: number;
}>();

interface BotServices {
  prisma: PrismaClient;
  userIdentity: UserIdentityService;
  lottoServices: LottoServices;
}

// Helpers to tolerate legacy DB missing users.username
function isMissingUsernameColumn(err: any): boolean {
  const msg = String(err?.message || '');
  return err?.code === 'P2022' || /users\.username/.test(msg);
}

async function ensureUsersUsername(prisma: PrismaClient) {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" TEXT`);
    await prisma.$executeRawUnsafe(`UPDATE "users"
      SET "username" = COALESCE(NULLIF("username", ''),
        CASE WHEN "telegramId" IS NOT NULL THEN '@' || "telegramId"
             ELSE 'user_' || SUBSTR("id", 1, 8) END)
      WHERE "username" IS NULL OR "username" = ''`);
  } catch (e) {
    // Best effort; continue even if this fails
  }
}

/**
 * Create enhanced Telegram bot with lotto service integration
 */
export function createTelegramBot(token: string, services?: BotServices) {
  const bot = new Telegraf(token);
  
  // Fallback prisma if services not provided (for backward compatibility)
  const prisma = services?.prisma || new PrismaClient();
  const userIdentity = services?.userIdentity;
  const lottoServices = services?.lottoServices;

  // =============================================================================
  // Start & Help Commands
  // =============================================================================

  bot.start(async (ctx) => {
    await ctx.reply(`🎰 Welcome to Wealth Wars Lotto Bot!

**How it works:**
• Start a round with /bet <amount>
• Others join with /join
• 80% goes to one random winner
• 20% split among losers (claimable)

**Commands:**
/bet <amount> - Start a round (e.g., /bet 100)
/join - Join the current round
/balance - Check your $WEALTH balance
/help - Show this help

**First, link your wallet:**
Send your Solana wallet address, then sign the verification message.`);
  });

  bot.help(async (ctx) => {
    await ctx.reply(`🎰 Wealth Wars Lotto Bot Commands:

/bet <amount> - Start a new round (e.g., /bet 100)
/join - Join the current round
/balance - Check your $WEALTH balance
/help - Show this help

**How It Works:**
1. Someone starts a round with /bet
2. Others join with /join
3. When settled: 80% → winner, 20% → losers
4. Claim your winnings

**Need Help?** Make sure your wallet is linked first!`);
  });

  // =============================================================================
  // Test Command - Verify bot version
  // =============================================================================

  bot.command('version', async (ctx) => {
    ctx.reply('✅ Bot Version: 2.0 (Updated Oct 19, 2025)\nCommands: /bet <amount>, /join, /balance');
  });

  // =============================================================================
  // Balance Command
  // =============================================================================

  bot.command('balance', async (ctx) => {
    try {
      const telegramId = ctx.from.id.toString();
      let user = null as null | { id: string; wallet: string | null; telegramId: string | null };
      try {
        user = await prisma.user.findFirst({
          where: { telegramId },
          select: { id: true, wallet: true, telegramId: true },
        });
      } catch (err: any) {
        if (isMissingUsernameColumn(err)) {
          await ensureUsersUsername(prisma);
          user = await prisma.user.findFirst({
            where: { telegramId },
            select: { id: true, wallet: true, telegramId: true },
          });
        } else {
          throw err;
        }
      }

      if (!user || !user.wallet) {
        await ctx.reply('⚠️ No wallet linked. Send your Solana wallet address first!');
        return;
      }

      // Get wealth balance
      const wealth = await getWealth(user.wallet);
      
      await ctx.reply(`💰 Your $WEALTH Balance:

Wallet: \`${user.wallet.slice(0, 4)}...${user.wallet.slice(-4)}\`
Balance: **${wealth.uiAmount.toFixed(2)} $WEALTH**
Tier: ${wealth.tier}

Ready to join a match! Use /bet to start or /join to enter an existing one.`);
    } catch (error) {
      console.error('Balance command error:', error);
      await ctx.reply('❌ Failed to fetch balance. Please try again.');
    }
  });

  // =============================================================================
  // Bet Command - Start or view current round
  // =============================================================================

  bot.command('bet', async (ctx) => {
    if (!lottoServices || !userIdentity) {
      return ctx.reply('❌ Lotto services not initialized. Please contact admin.');
    }

    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
      return ctx.reply('❌ Please specify amount: /bet <amount>\nExample: /bet 100');
    }

    const amountStr = args[1];
    const amount = parseFloat(amountStr);

    if (isNaN(amount) || amount <= 0) {
      return ctx.reply('❌ Invalid amount. Must be positive.');
    }

    try {
      const telegramId = ctx.from.id.toString();
      const username = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name || `user_${telegramId.slice(0, 8)}`;

      // Get or create user using UserIdentityService
      let user = await userIdentity.getUserByTelegram(telegramId);
      if (!user) {
        user = await userIdentity.getOrCreateTelegramUser(telegramId, username);
      }

      if (!user.wallet) {
        return ctx.reply('❌ Please link your wallet first. Send your Solana wallet address.');
      }

      // Check balance
      const wealth = await getWealth(user.wallet);
      if (wealth.uiAmount < amount) {
        return ctx.reply(`❌ Insufficient balance.

You have: ${wealth.uiAmount.toFixed(2)} $WEALTH
Required: ${amount.toFixed(2)} $WEALTH`);
      }

      // Find current round
      const round = await prisma.round.findFirst({
        where: { status: 'OPEN' },
        orderBy: { createdAt: 'desc' },
      });

      if (!round) {
        return ctx.reply('❌ No active round. Wait for an admin to create one!');
      }

      // Check if user already entered
      const existingEntry = await prisma.entry.findFirst({
        where: {
          roundId: round.id,
          userId: user.id,
        },
      });

      if (existingEntry) {
        return ctx.reply('❌ You have already entered this round!');
      }

      ctx.reply('⏳ Processing your entry... Please wait.');

      // Convert amount to lamports
      const amountLamports = BigInt(Math.round(amount * 1e9));

      // Use EntryProcessor to join the round (handles on-chain transaction)
      const entry = await lottoServices.entryProcessor.joinRound({
        roundId: round.id,
        userId: user.id,
        userWallet: new PublicKey(user.wallet),
      });

      // Wait a bit for transaction confirmation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check entry status
      const confirmedEntry = await prisma.entry.findUnique({
        where: { id: entry.id },
      });

      if (confirmedEntry?.joinTxSignature) {
        ctx.reply(`✅ **Entry Successful!**

Round: #${round.id}
Amount: ${amount.toFixed(2)} $WEALTH
Tickets: 1
Transaction: \`${confirmedEntry.joinTxSignature}\`

Good luck! 🍀`);
      } else {
        ctx.reply(`⏳ Entry submitted!

Round: #${round.id}
Amount: ${amount.toFixed(2)} $WEALTH

Transaction is confirming... Check /round for updates.`);
      }

    } catch (error: any) {
      console.error('Bet command error:', error);
      ctx.reply(`❌ Error entering round: ${error.message || 'Unknown error'}`);
    }
  });

  // =============================================================================
  // Join Command - Quick Join Current Round
  // =============================================================================

  bot.command('join', async (ctx) => {
    if (!lottoServices || !userIdentity) {
      return ctx.reply('❌ Lotto services not initialized. Please contact admin.');
    }

    try {
      const telegramId = ctx.from.id.toString();
      const username = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name || `user_${telegramId.slice(0, 8)}`;

      // Get or create user
      let user = await userIdentity.getUserByTelegram(telegramId);
      if (!user) {
        user = await userIdentity.getOrCreateTelegramUser(telegramId, username);
      }

      if (!user.wallet) {
        return ctx.reply('❌ Please link your wallet first. Send your Solana wallet address.');
      }

      // Find current round
      const round = await prisma.round.findFirst({
        where: { status: 'OPEN' },
        orderBy: { createdAt: 'desc' },
      });

      if (!round) {
        return ctx.reply('❌ No active round. Wait for an admin to create one!');
      }

      if (!round.ticketPriceLamports) {
        return ctx.reply('❌ Round ticket price not set. Use /bet <amount> instead.');
      }

      const ticketPrice = lamportsToWealth(BigInt(round.ticketPriceLamports.toString()));

      // Check balance
      const wealth = await getWealth(user.wallet);
      if (wealth.uiAmount < ticketPrice) {
        return ctx.reply(`❌ Insufficient balance.

You have: ${wealth.uiAmount.toFixed(2)} $WEALTH
Required: ${ticketPrice.toFixed(2)} $WEALTH`);
      }

      // Check if already entered
      const existingEntry = await prisma.entry.findFirst({
        where: {
          roundId: round.id,
          userId: user.id,
        },
      });

      if (existingEntry) {
        return ctx.reply('❌ You have already entered this round!');
      }

      ctx.reply('⏳ Processing your entry... Please wait.');

      // Join with ticket price
      const entry = await lottoServices.entryProcessor.joinRound({
        roundId: round.id,
        userId: user.id,
        userWallet: new PublicKey(user.wallet),
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      const confirmedEntry = await prisma.entry.findUnique({
        where: { id: entry.id },
      });

      if (confirmedEntry?.joinTxSignature) {
        ctx.reply(`✅ **Joined Successfully!**

Round: #${round.id}
Amount: ${ticketPrice.toFixed(2)} $WEALTH
Tickets: 1
Transaction: \`${confirmedEntry.joinTxSignature}\`

Good luck! 🍀`);
      } else {
        ctx.reply(`⏳ Entry submitted!

Round: #${round.id}
Amount: ${ticketPrice.toFixed(2)} $WEALTH

Transaction is confirming...`);
      }

    } catch (error: any) {
      console.error('Join command error:', error);
      ctx.reply(`❌ Error joining round: ${error.message || 'Unknown error'}`);
    }
  });

  // =============================================================================
  // Wallet Linking Flow
  // =============================================================================

  bot.on('text', async (ctx) => {
    // Sanitize incoming text to avoid zero-width chars or formatting remnants
    const raw = ctx.message.text || '';
    const text = raw
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // zero-width chars
      .replace(/[`'"<>]/g, '') // stray quotes/backticks/angle brackets
      .replace(/\s+/g, '') // all whitespace/newlines
      .trim();
    const telegramId = ctx.from.id.toString();
    try { console.log('[Bot] Text received:', { tg: telegramId, rawLen: raw.length, textLen: text.length, preview: raw.slice(0, 20) }); } catch {}

    // Skip commands
    if (text.startsWith('/')) return;

    try {
      // Check if user already has wallet
      let existingUser: { id: string; wallet: string | null; telegramId: string | null } | null = null;
      try {
        existingUser = await prisma.user.findFirst({
          where: { telegramId },
          select: { id: true, wallet: true, telegramId: true },
        });
      } catch (err: any) {
        if (isMissingUsernameColumn(err)) {
          await ensureUsersUsername(prisma);
          existingUser = await prisma.user.findFirst({
            where: { telegramId },
            select: { id: true, wallet: true, telegramId: true },
          });
        } else {
          throw err;
        }
      }

      if (existingUser?.wallet) {
        return ctx.reply(`✅ Wallet already linked: \`${existingUser.wallet}\`

**Available Commands:**
• /bet <amount> - Enter current round
• /join - Quick-join current round
• /balance - Check balance
• /round - View round info
• /help - Show help`);
      }

      // Extract address from common deep-link formats (e.g., solana:<addr>, phantom://...address=<addr>)
      let candidate = text;
      try {
        const url = new URL(text);
        const addrParam = url.searchParams.get('address') || url.searchParams.get('pubkey');
        if (addrParam) candidate = addrParam;
      } catch {
        // not a URL; ignore
      }

      // Handle protocol-prefixed addresses like solana:<pubkey>
      if (/^solana:/.test(candidate)) {
        candidate = candidate.replace(/^solana:/, '');
      }

      // If user pasted an SNS name, guide them
      if (/\.sol$/i.test(candidate)) {
        return ctx.reply('⚠️ .sol names aren\'t supported yet. Please paste your base58 wallet address (from Phantom → Account → Copy address).');
      }

      // Check if looks like Solana address (base58, 32–44 chars)
      if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(candidate)) {
        try {
          new PublicKey(candidate);
          try { console.log('[Bot] Address candidate OK (direct):', candidate.slice(0,4)+'...'+candidate.slice(-4)); } catch {}

          const code = Math.random().toString(36).slice(2, 6).toUpperCase();
          const message = `Link Wealth Wars wallet ${code}`;

          pendingWalletLinks.set(telegramId, {
            userId: `tg_${telegramId}`,
            message,
            code,
            walletAddress: candidate,
            timestamp: Date.now(),
          });

          const encodedMessage = encodeURIComponent(message);
          const phantomDeepLink = `phantom://sign-message?message=${encodedMessage}`;
          const webSignUrl = `${process.env.SIGNING_BASE_URL || 'http://localhost:3000'}/sign.html?message=${encodedMessage}`;

          ctx.reply(`✅ **Wallet Address Received:** \`${candidate}\`

**🔐 Sign this message to verify ownership:**
\`${message}\`

**Option 1 - Mobile:**
Tap: ${phantomDeepLink}

**Option 2 - Browser:**
Visit: ${webSignUrl}

**Option 3 - Manual:**
Sign in Phantom app and paste signature here.

⏰ Expires in 10 minutes`);
          return;
        } catch (e) {
          console.warn('Wallet address parse failed:', e);
          return ctx.reply('❌ Invalid Solana wallet address. Please paste the base58 address from your wallet.');
        }
      }

      // Fallback: scan message for any base58-looking substrings and validate
      const matches = text.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/g) || [];
      for (const m of matches) {
        try {
          new PublicKey(m);
          try { console.log('[Bot] Address candidate OK (scanned):', m.slice(0,4)+'...'+m.slice(-4)); } catch {}
          const code = Math.random().toString(36).slice(2, 6).toUpperCase();
          const message = `Link Wealth Wars wallet ${code}`;
          pendingWalletLinks.set(telegramId, {
            userId: `tg_${telegramId}`,
            message,
            code,
            walletAddress: m,
            timestamp: Date.now(),
          });
          const encodedMessage = encodeURIComponent(message);
          const phantomDeepLink = `phantom://sign-message?message=${encodedMessage}`;
          const webSignUrl = `${process.env.SIGNING_BASE_URL || 'http://localhost:3000'}/sign.html?message=${encodedMessage}`;
          ctx.reply(`✅ **Wallet Address Received:** \`${m}\`\n\n**🔐 Sign this message to verify ownership:**\n\`${message}\`\n\n**Option 1 - Mobile:**\nTap: ${phantomDeepLink}\n\n**Option 2 - Browser:**\nVisit: ${webSignUrl}\n\n**Option 3 - Manual:**\nSign in Phantom app and paste signature here.\n\n⏰ Expires in 10 minutes`);
          return;
        } catch {}
      }

      // Check if looks like signature
      if (/^[A-Za-z0-9+/=]{64,344}$/.test(text) && text.length % 4 === 0) {
        const pending = pendingWalletLinks.get(telegramId);
        if (!pending || !pending.walletAddress) {
          return ctx.reply('❌ No pending wallet link. Send your wallet address first.');
        }

        try {
          const messageBytes = Buffer.from(pending.message, 'utf8');
          const signatureBytes = Buffer.from(text, 'base64');
          const publicKey = new PublicKey(pending.walletAddress);
          
          const isValid = nacl.sign.detached.verify(
            new Uint8Array(messageBytes),
            new Uint8Array(signatureBytes),
            publicKey.toBytes()
          );

          if (!isValid) {
            return ctx.reply('❌ Signature verification failed.');
          }

          // Use UserIdentityService if available
          const username = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name || `user_${telegramId.slice(0, 8)}`;
          
          if (userIdentity) {
            // Link wallet to existing telegram user
            let user = await userIdentity.getUserByTelegram(telegramId);
            if (!user) {
              user = await userIdentity.getOrCreateTelegramUser(telegramId, username);
            }
            
            await prisma.user.update({
              where: { id: user.id },
              data: { wallet: pending.walletAddress },
            });
          } else {
            // Fallback: direct database update without touching username
            try {
              await prisma.user.upsert({
                where: { telegramId },
                update: { wallet: pending.walletAddress },
                create: { 
                  id: `tg_${telegramId}`, 
                  telegramId, 
                  wallet: pending.walletAddress,
                  username: `user_${telegramId.slice(0, 8)}`,
                },
              });
            } catch (err: any) {
              if (isMissingUsernameColumn(err)) {
                await ensureUsersUsername(prisma);
                await prisma.user.upsert({
                  where: { telegramId },
                  update: { wallet: pending.walletAddress },
                  create: { 
                    id: `tg_${telegramId}`, 
                    telegramId, 
                    wallet: pending.walletAddress,
                    username: `user_${telegramId.slice(0, 8)}`,
                  },
                });
              } else {
                throw err;
              }
            }
          }

          pendingWalletLinks.delete(telegramId);

          ctx.reply(`✅ **Wallet Successfully Linked!**

Address: \`${pending.walletAddress}\`

**Ready to play:**
• /bet <amount> - Enter round
• /join - Quick-join
• /balance - Check balance
• /round - View round

Good luck! 🎰`);
          return;
        } catch (error) {
          console.error('Signature verification error:', error);
          return ctx.reply('❌ Error verifying signature. Ensure you signed the exact message and pasted the signature (Base64).');
        }
      }

      // Default response
  ctx.reply(`🤖 Send your Solana wallet address to link it. Tips:
• Paste base58 address (no .sol names yet)
• Remove spaces/newlines
• From Phantom: Account → Copy address

Or use commands:

• /bet <amount> - Enter round
• /join - Quick-join
• /balance - Check balance
• /round - View round info
• /help - Show help`);
    } catch (error) {
      console.error('Text handler error:', error);
      ctx.reply('❌ An error occurred.');
    }
  });

  return bot;
}

/**
 * Webhook handler for Express
 */
export async function handleTelegramWebhook(req: any, res: any, bot: Telegraf) {
  try {
    await bot.handleUpdate(req.body);
    res.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}
