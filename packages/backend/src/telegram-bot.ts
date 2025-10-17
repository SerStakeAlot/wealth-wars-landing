import { Telegraf } from 'telegraf';
import { getOrCreateUser, getWealth } from './index.js';
import { PrismaClient } from '@prisma/client';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';

const prisma = new PrismaClient();

// In-memory store for pending wallet links (in production, use database)
const pendingWalletLinks = new Map<string, {
  userId: string;
  message: string;
  code: string;
  walletAddress?: string;
  signature?: string;
  timestamp: number;
}>();

// Bot commands and handlers
export function createTelegramBot(token: string) {
  const bot = new Telegraf(token);

    // Start command
  bot.start((ctx) => {
    ctx.reply(`🎰 Welcome to Wealth Wars Lotto Bot!

**Rules:**
• Minimum entry: 100 $WEALTH
• Maximum entry: Unlimited
• 30 seconds to complete match after opponent joins

**Commands:**
/bet <amount> - Start a new match (e.g., /bet 100)
/join - Join the current waiting match
/balance - Check your $WEALTH balance
/cancel - Cancel your started match
/help - Show this help

**First, link your wallet:**
Send your Solana wallet address, then sign the verification message.`);
  });

  // Help command
  bot.help((ctx) => {
    ctx.reply(`🎰 Wealth Wars Lotto Bot

**Rules:**
• Minimum entry: 100 $WEALTH
• Maximum entry: Unlimited
• 30 seconds to complete match after opponent joins

**Commands:**
• /bet <amount> - Start a new match
• /join - Join waiting match
• /balance - Check $WEALTH balance
• /cancel - Cancel your match
• /help - This help

Example: /bet 500`);
  });

  // Balance command
  bot.command('balance', async (ctx) => {
    try {
      const telegramId = ctx.from.id.toString();
      const user = await prisma.user.findFirst({
        where: { telegramId },
      });

      if (!user || !user.wallet) {
        return ctx.reply('❌ Please link your wallet first. Send your Solana wallet address.');
      }

      const wealth = await getWealth(user.wallet);
      ctx.reply(`💰 Your Balance: ${wealth.uiAmount.toFixed(2)} $WEALTH

Tier: ${wealth.tier}
Wallet: ${user.wallet.slice(0, 8)}...${user.wallet.slice(-8)}`);
    } catch (error) {
      console.error('Balance command error:', error);
      ctx.reply('❌ Error fetching balance.');
    }
  });

  // Bet command
  bot.command('bet', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
      return ctx.reply('❌ Please specify amount: /bet <amount>\nExample: /bet 100');
    }

    const amountStr = args[1];
    const amount = parseFloat(amountStr);

    if (isNaN(amount) || amount < 100) {
      return ctx.reply('❌ Minimum entry is 100 $WEALTH.');
    }

    try {
      const telegramId = ctx.from.id.toString();
      let user = await prisma.user.findFirst({
        where: { telegramId },
      });

      if (!user) {
        user = await prisma.user.create({
          data: { id: `tg_${telegramId}`, telegramId },
        });
      }

      if (!user.wallet) {
        return ctx.reply('❌ Please link your wallet first. Send your Solana wallet address.');
      }

      // Check wealth balance
      const wealth = await getWealth(user.wallet);
      if (wealth.uiAmount < amount) {
        return ctx.reply(`❌ Insufficient balance.

You have: ${wealth.uiAmount.toFixed(2)} $WEALTH
Required: ${amount} $WEALTH`);
      }

      // Check if user already has a pending match
      const existingRound = await prisma.round.findFirst({
        where: {
          status: 'OPEN',
          entries: {
            some: { userId: user.id }
          }
        },
      });

      if (existingRound) {
        return ctx.reply('❌ You already have a pending match. Use /cancel to cancel it first.');
      }

      // Create new round
      const round = await prisma.round.create({
        data: {
          entries: {
            create: {
              userId: user.id,
              wallet: user.wallet,
              amount: Math.floor(amount * 1e9), // Convert to lamports
              ticketCount: 1,
            }
          }
        },
      });

      ctx.reply(`@${ctx.from.username || ctx.from.first_name} initiated a bet of ${amount} $WEALTH

🎰 **Match Created!**
Match ID: #${round.id}
Waiting for opponent...

Use /join to join this match!
⏰ Match begins when someone joins.`);

    } catch (error) {
      console.error('Start match error:', error);
      ctx.reply('❌ Error starting match.');
    }
  });

  // Join match command
  bot.command('join', async (ctx) => {
    try {
      const telegramId = ctx.from.id.toString();
      let user = await prisma.user.findFirst({
        where: { telegramId },
      });

      if (!user) {
        user = await prisma.user.create({
          data: { id: `tg_${telegramId}`, telegramId },
        });
      }

      if (!user.wallet) {
        return ctx.reply('❌ Please link your wallet first. Send your Solana wallet address.');
      }

      // Find an open round with only one entry
      const round = await prisma.round.findFirst({
        where: {
          status: 'OPEN',
          entries: {
            some: {} // Has at least one entry
          }
        },
        include: {
          entries: true
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!round) {
        return ctx.reply('❌ No matches waiting for players. Use /bet <amount> to start one!');
      }

      if (round.entries.length !== 1) {
        return ctx.reply('❌ Match is full or invalid.');
      }

      const opponentEntry = round.entries[0];
      if (opponentEntry.userId === user.id) {
        return ctx.reply('❌ You cannot join your own match.');
      }

      // Check if user already joined
      const existingEntry = round.entries.find(e => e.userId === user.id);
      if (existingEntry) {
        return ctx.reply('❌ You are already in this match.');
      }

      // Check wealth balance
      const entryAmount = opponentEntry.amount / 1e9; // Convert from lamports
      const wealth = await getWealth(user.wallet);
      if (wealth.uiAmount < entryAmount) {
        return ctx.reply(`❌ Insufficient balance.

You have: ${wealth.uiAmount.toFixed(2)} $WEALTH
Required: ${entryAmount} $WEALTH`);
      }

      // Add user to the round
      await prisma.entry.create({
        data: {
          roundId: round.id,
          userId: user.id,
          wallet: user.wallet,
          amount: opponentEntry.amount,
          ticketCount: 1,
        },
      });

      // Update pot amount
      await prisma.round.update({
        where: { id: round.id },
        data: {
          potAmount: opponentEntry.amount * 2,
        },
      });

      // Announce match start
      const totalPot = (entryAmount * 2).toFixed(2);
      await ctx.telegram.sendMessage(
        ctx.chat.id,
        `@${ctx.from.username || ctx.from.first_name} 🔒 Locked in ${entryAmount} $WEALTH

🎰 **Match #${round.id} Started!**
💰 **Pot Size:** ${totalPot} $WEALTH
⏰ **30-second countdown begins now!**`
      );

      // Start 30-second countdown
      let timeLeft = 30;
      const countdownInterval = setInterval(async () => {
        timeLeft -= 1;
        if (timeLeft <= 0) {
          clearInterval(countdownInterval);
          return;
        }

        // Send countdown messages at specific intervals
        if (timeLeft === 20 || timeLeft === 10 || timeLeft === 5 || timeLeft === 3 || timeLeft === 1) {
          try {
            await ctx.telegram.sendMessage(
              ctx.chat.id,
              `⏰ Match #${round.id} - ${timeLeft} seconds remaining!`
            );
          } catch (countdownError) {
            console.error('Failed to send countdown:', countdownError);
          }
        }
      }, 1000);

      // Set 30-second timer for match completion
      setTimeout(async () => {
        clearInterval(countdownInterval);
        try {
          const currentRound = await prisma.round.findUnique({
            where: { id: round.id },
            include: { entries: true },
          });

          if (currentRound && currentRound.status === 'OPEN' && currentRound.entries.length === 2) {
            // Select winner randomly
            const entries = currentRound.entries;
            const winnerEntry = Math.random() < 0.5 ? entries[0] : entries[1];
            const loserEntry = winnerEntry === entries[0] ? entries[1] : entries[0];

            // Calculate distribution: 80% to winner, 20% to dev
            const totalPotLamports = currentRound.potAmount;
            const winnerAmount = Math.floor(totalPotLamports * 0.8); // 80% to winner
            const devAmount = totalPotLamports - winnerAmount; // 20% to dev

            await prisma.round.update({
              where: { id: round.id },
              data: {
                status: 'CLOSED',
                winner: winnerEntry.wallet,
                winnerEntryId: winnerEntry.id,
                closedAt: new Date(),
              },
            });

            // Announce winner
            const entryAmount = winnerEntry.amount / 1e9;
            const totalPot = (entryAmount * 2).toFixed(2);
            const winnerPrize = (winnerAmount / 1e9).toFixed(2);
            const devFee = (devAmount / 1e9).toFixed(2);

            await ctx.telegram.sendMessage(
              ctx.chat.id,
              `🎰 **TIME'S UP! Match #${round.id} Complete!**\n\n` +
              `💰 **Total Pot:** ${totalPot} $WEALTH\n` +
              `🏆 **Winner:** \`${winnerEntry.wallet.slice(0, 8)}...${winnerEntry.wallet.slice(-8)}\`\n` +
              `💎 **Prize:** ${winnerPrize} $WEALTH\n\n` +
              `🎉 Congratulations to the winner!`
            );
          }
        } catch (error) {
          console.error('Match completion error:', error);
        }
      }, 30000);

    } catch (error) {
      console.error('Join match error:', error);
      ctx.reply('❌ Error joining match.');
    }
  });

  // Cancel match command
  bot.command('cancel', async (ctx) => {
    try {
      const telegramId = ctx.from.id.toString();
      const user = await prisma.user.findFirst({
        where: { telegramId },
      });

      if (!user) {
        return ctx.reply('❌ User not found.');
      }

      // Find user's pending match
      const round = await prisma.round.findFirst({
        where: {
          status: 'OPEN',
          entries: {
            some: { userId: user.id }
          }
        },
        include: { entries: true },
      });

      if (!round) {
        return ctx.reply('❌ No pending match to cancel.');
      }

      if (round.entries.length > 1) {
        return ctx.reply('❌ Cannot cancel - match already has an opponent.');
      }

      // Cancel the round
      await prisma.round.update({
        where: { id: round.id },
        data: { status: 'CLOSED' },
      });

      ctx.reply(`✅ Match #${round.id} cancelled successfully.`);

    } catch (error) {
      console.error('Cancel match error:', error);
      ctx.reply('❌ Error cancelling match.');
    }
  });

  // Text message handler for wallet linking
  bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    const telegramId = ctx.from.id.toString();

    // Skip if it's a command
    if (text.startsWith('/')) return;

    try {
      // Check if user already has a wallet linked
      const existingUser = await prisma.user.findFirst({
        where: { telegramId },
      });

      // If user already has a wallet, show help
      if (existingUser?.wallet) {
        ctx.reply(`🤖 **Available Commands:**

• /bet <amount> - Start a new match
• /join - Join waiting match
• /balance - Check $WEALTH balance
• /cancel - Cancel your match
• /help - Show help`);
        return;
      }

      // Check if this looks like a Solana wallet address
      if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(text)) {
        try {
          // Validate it's a valid Solana public key
          new PublicKey(text);

          // Generate signing message
          const code = Math.random().toString(36).slice(2, 6).toUpperCase();
          const message = `Link Wealth Wars wallet ${code}`;

          // Store the pending link
          pendingWalletLinks.set(telegramId, {
            userId: `tg_${telegramId}`,
            message,
            code,
            walletAddress: text,
            timestamp: Date.now(),
          });

          // Create signing links
          const encodedMessage = encodeURIComponent(message);
          const phantomDeepLink = `phantom://sign-message?message=${encodedMessage}`;
          const webSignUrl = `${process.env.SIGNING_BASE_URL || 'http://localhost:8787'}/sign.html?message=${encodedMessage}`;

          ctx.reply(`✅ **Wallet Address Received:** \`${text}\`

**🔐 To verify ownership, please sign this message:** \`${message}\`

**� Step-by-Step Instructions:**

**Option 1 - Mobile (Easiest):**
1. � **Tap this link:** ${phantomDeepLink}
2. ✅ **Sign the message** in Phantom app
3. 📤 **Signature sent automatically!**

**Option 2 - Browser:**
1. 🌐 **Click this link:** ${webSignUrl}
2. ✅ **Sign the message** in browser extension
3. 📤 **Signature sent automatically!**

**Option 3 - Manual (if auto-send fails):**
1. 📱 Open **Phantom app** → **Settings** → **Sign Message**
2. ✏️ **Paste this exact message:** \`${message}\`
3. ✅ **Sign** and **copy** the signature
4. 📤 **Send the signature back here**

⏰ **Expires in 10 minutes** - Complete quickly!`);
          return;
        } catch (error) {
          ctx.reply('❌ Invalid Solana wallet address. Please check and try again.');
          return;
        }
      }

      // Check if this looks like a signature (base64)
      if (/^[A-Za-z0-9+/=]{64,88}$/.test(text) && text.length % 4 === 0) {
        const pending = pendingWalletLinks.get(telegramId);
        if (!pending || !pending.walletAddress) {
          ctx.reply('❌ No pending wallet link. Send your wallet address first.');
          return;
        }

        try {
          // Verify the signature
          const messageBytes = Buffer.from(pending.message, 'utf8');
          const signatureBytes = Buffer.from(text, 'base64');

          const publicKey = new PublicKey(pending.walletAddress);
          const isValid = nacl.sign.detached.verify(
            new Uint8Array(messageBytes),
            new Uint8Array(signatureBytes),
            publicKey.toBytes()
          );

          if (!isValid) {
            ctx.reply('❌ Signature verification failed. Please check your signature and try again.');
            return;
          }

          // Link the wallet
          await prisma.user.upsert({
            where: { telegramId },
            update: { wallet: pending.walletAddress },
            create: { id: `tg_${telegramId}`, telegramId, wallet: pending.walletAddress },
          });

          // Clean up
          pendingWalletLinks.delete(telegramId);

          ctx.reply(`✅ **Wallet Successfully Linked!**

Address: \`${pending.walletAddress}\`

You can now use match commands:
• /bet <amount> - Start a new match
• /join - Join waiting match
• /balance - Check $WEALTH balance
• /cancel - Cancel your match

Good luck! 🎰`);
          return;
        } catch (error) {
          console.error('Signature verification error:', error);
          ctx.reply('❌ Error verifying signature. Please check the format and try again.');
          return;
        }
      }

      // If no command matched and not a wallet/sig, show help
      ctx.reply(`🤖 I didn't understand that.

**Available Commands:**
• /bet <amount> - Start a new match
• /join - Join waiting match
• /balance - Check $WEALTH balance
• /cancel - Cancel your match
• /help - Show help

Or send your Solana wallet address to link it.`);
    } catch (error) {
      console.error('Text handler error:', error);
      ctx.reply('❌ An error occurred. Please try again.');
    }
  });

  return bot;
}

// Webhook handler for Express
export async function handleTelegramWebhook(req: any, res: any, bot: Telegraf) {
  try {
    await bot.handleUpdate(req.body);
    res.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}