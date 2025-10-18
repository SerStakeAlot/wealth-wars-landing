/**
 * Simplified Telegram Bot - Basic Commands Only
 * Focus on balance and wallet linking
 */

import { Telegraf, Context } from 'telegraf';
import { PrismaClient } from '@prisma/client';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { UserIdentityService } from './services/user-identity.js';
import { getWealth } from './index.js';

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
}

/**
 * Create simplified Telegram bot
 */
export function createTelegramBot(token: string, services?: BotServices) {
  const bot = new Telegraf(token);
  
  const prisma = services?.prisma || new PrismaClient();
  const userIdentity = services?.userIdentity;

  // =============================================================================
  // Start & Help Commands
  // =============================================================================

  bot.start((ctx) => {
    ctx.reply(`🎰 Welcome to Wealth Wars Lotto Bot!

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

  bot.help((ctx) => {
    ctx.reply(`🎰 Wealth Wars Lotto Bot Commands:

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
      
      // Find user in database
      const user = await prisma.user.findFirst({
        where: { telegramId },
      });

      if (!user || !user.wallet) {
        return ctx.reply('❌ Please link your wallet first. Send your Solana wallet address.');
      }

      // Fetch wealth balance using the getWealth function
      const wealth = await getWealth(user.wallet);
      
      ctx.reply(`💰 Your Balance

$WEALTH: ${wealth.uiAmount.toFixed(2)}
Tier: ${wealth.tier}
Wallet: ${user.wallet.slice(0, 8)}...${user.wallet.slice(-8)}`);
    } catch (error) {
      console.error('Balance command error:', error);
      ctx.reply('❌ Error fetching balance. Please make sure you have linked a valid Solana wallet.');
    }
  });

  // =============================================================================
  // Bet Command - Coming Soon
  // =============================================================================

  bot.command('bet', async (ctx) => {
    ctx.reply(`🚧 Betting matches coming soon!

For now, you can:
• Link your wallet (send your Solana address)
• Check your balance with /balance
• Get help with /help`);
  });

  // =============================================================================
  // Join Command - Coming Soon
  // =============================================================================

  bot.command('join', async (ctx) => {
    ctx.reply(`🚧 Joining matches coming soon!

For now, you can:
• Link your wallet (send your Solana address)
• Check your balance with /balance
• Get help with /help`);
  });

  // =============================================================================
  // Cancel Command - Coming Soon
  // =============================================================================

  bot.command('cancel', async (ctx) => {
    ctx.reply(`🚧 Match cancellation coming soon!

For now, you can:
• Link your wallet (send your Solana address)
• Check your balance with /balance
• Get help with /help`);
  });

  // =============================================================================
  // Wallet Linking Flow
  // =============================================================================

  bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    const telegramId = ctx.from.id.toString();
    const username = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name || `user_${telegramId}`;

    // Check if this is a wallet address
    if (text.length >= 32 && text.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(text)) {
      try {
        // Validate it's a real Solana address
        new PublicKey(text);

        // Generate verification message
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        const message = `Wealth Wars Bot Verification\nCode: ${code}\nWallet: ${text}\nUser: ${username}`;

        // Store pending verification
        pendingWalletLinks.set(telegramId, {
          userId: telegramId,
          message,
          code,
          walletAddress: text,
          timestamp: Date.now(),
        });

        // Send verification instructions
        ctx.reply(`✅ Wallet address detected!

**Verification Required:**
Please sign this message with your wallet:

\`\`\`
${message}
\`\`\`

**How to sign:**
1. Open your Solana wallet (Phantom, Solflare, etc.)
2. Go to Settings → Sign Message
3. Paste the message above
4. Sign it
5. Send the signature here (long base58 string)

⏱️ You have 5 minutes to complete verification.`);

      } catch (error) {
        console.error('Invalid wallet address:', error);
        ctx.reply('❌ Invalid Solana wallet address. Please check and try again.');
      }
      return;
    }

    // Check if this is a signature (long base58 string)
    if (text.length > 64 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(text)) {
      const pending = pendingWalletLinks.get(telegramId);

      if (!pending) {
        return ctx.reply('❌ No pending wallet verification. Please send your wallet address first.');
      }

      // Check if expired (5 minutes)
      if (Date.now() - pending.timestamp > 5 * 60 * 1000) {
        pendingWalletLinks.delete(telegramId);
        return ctx.reply('❌ Verification expired. Please send your wallet address again.');
      }

      try {
        // Verify signature
        const publicKey = new PublicKey(pending.walletAddress!);
        const messageBytes = new TextEncoder().encode(pending.message);
        const signatureBytes = bs58.decode(text);

        const verified = nacl.sign.detached.verify(
          messageBytes,
          signatureBytes,
          publicKey.toBytes()
        );

        if (!verified) {
          return ctx.reply('❌ Invalid signature. Please sign the exact message provided.');
        }

        // Signature verified! Link wallet
        if (userIdentity) {
          // Use UserIdentityService
          let user = await userIdentity.getUserByTelegram(telegramId);
          if (!user) {
            user = await userIdentity.getOrCreateTelegramUser(telegramId, username);
          }
          // Update user's wallet
          await prisma.user.update({
            where: { id: user.id },
            data: { wallet: pending.walletAddress! },
          });
        } else {
          // Fallback: direct prisma update
          await prisma.user.upsert({
            where: { telegramId },
            create: {
              telegramId,
              username,
              wallet: pending.walletAddress!,
            },
            update: {
              wallet: pending.walletAddress!,
            },
          });
        }

        // Remove from pending
        pendingWalletLinks.delete(telegramId);

        ctx.reply(`✅ **Wallet Verified!**

Your wallet is now linked to your Telegram account.

Wallet: \`${pending.walletAddress}\`

You can now:
• Check balance with /balance
• Start matches with /bet <amount>
• Join matches with /join

Good luck! 🎰`);

      } catch (error) {
        console.error('Signature verification error:', error);
        ctx.reply('❌ Error verifying signature. Please make sure you signed the correct message.');
      }
      return;
    }

    // Unknown text
    ctx.reply('❓ Unknown command. Use /help to see available commands.');
  });

  return bot;
}
