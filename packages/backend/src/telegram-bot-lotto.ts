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
import { LottoServices } from './services/lotto-services.js';
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
• Admin creates lotto rounds
• Players join with $WEALTH tokens
• 80% goes to one random winner
• 20% split among losers (claimable)
• All on-chain and verifiable

**Commands:**
/bet - View current lotto round
/join - Join the active round
/balance - Check your $WEALTH balance
/help - Show this help

**First, link your wallet:**
Send your Solana wallet address, then sign the verification message.`);
  });

  bot.help(async (ctx) => {
    await ctx.reply(`🎰 Wealth Wars Lotto Bot Commands:

/bet - View current lotto round details
/join - Join the active lotto round
/balance - Check your $WEALTH balance
/help - Show this help

**How It Works:**
1. Admin creates a lotto round
2. Players join with /join (costs ticket price)
3. When round closes: 80% → random winner, 20% → losers split
4. Winners and losers claim their share

**Need Help?** Make sure your wallet is linked first!`);
  });

  // =============================================================================
  // Balance Command
  // =============================================================================

  bot.command('balance', async (ctx) => {
    try {
      const telegramId = ctx.from.id.toString();
      const user = await prisma.user.findFirst({
        where: { telegramId },
      });

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
        wallet: user.wallet,
        amount: amountLamports,
        tickets: 1, // Each entry gets 1 ticket for now
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
        wallet: user.wallet,
        amount: BigInt(round.ticketPriceLamports.toString()),
        tickets: 1,
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
    const text = ctx.message.text.trim();
    const telegramId = ctx.from.id.toString();

    // Skip commands
    if (text.startsWith('/')) return;

    try {
      // Check if user already has wallet
      const existingUser = await prisma.user.findFirst({
        where: { telegramId },
      });

      if (existingUser?.wallet) {
        return ctx.reply(`✅ Wallet already linked: \`${existingUser.wallet}\`

**Available Commands:**
• /bet <amount> - Enter current round
• /join - Quick-join current round
• /balance - Check balance
• /round - View round info
• /help - Show help`);
      }

      // Check if looks like Solana address
      if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(text)) {
        try {
          new PublicKey(text);

          const code = Math.random().toString(36).slice(2, 6).toUpperCase();
          const message = `Link Wealth Wars wallet ${code}`;

          pendingWalletLinks.set(telegramId, {
            userId: `tg_${telegramId}`,
            message,
            code,
            walletAddress: text,
            timestamp: Date.now(),
          });

          const encodedMessage = encodeURIComponent(message);
          const phantomDeepLink = `phantom://sign-message?message=${encodedMessage}`;
          const webSignUrl = `${process.env.SIGNING_BASE_URL || 'http://localhost:3000'}/sign.html?message=${encodedMessage}`;

          ctx.reply(`✅ **Wallet Address Received:** \`${text}\`

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
        } catch {
          return ctx.reply('❌ Invalid Solana wallet address.');
        }
      }

      // Check if looks like signature
      if (/^[A-Za-z0-9+/=]{64,88}$/.test(text) && text.length % 4 === 0) {
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
            // Fallback: direct database update
            await prisma.user.upsert({
              where: { telegramId },
              update: { wallet: pending.walletAddress },
              create: { 
                id: `tg_${telegramId}`, 
                telegramId, 
                wallet: pending.walletAddress,
                username,
              },
            });
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
          return ctx.reply('❌ Error verifying signature.');
        }
      }

      // Default response
      ctx.reply(`🤖 Send your Solana wallet address to link it, or use:

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
