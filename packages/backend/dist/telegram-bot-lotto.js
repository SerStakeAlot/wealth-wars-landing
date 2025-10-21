/**
 * Enhanced Telegram Bot with Lotto Service Integration
 *
 * This version integrates with the on-chain lotto program using
 * EntryProcessor and SettlementService for real blockchain transactions.
 */
import { Telegraf } from 'telegraf';
import { PrismaClient } from '@prisma/client';
import { PublicKey } from '@solana/web3.js';
import { findTreasuryPda, findTreasuryVaultPda } from './solana/index.js';
import nacl from 'tweetnacl';
import { getWealth } from './index.js';
import { botNotifier } from './services/bot-notifier.js';
const RAW_WEBAPP_URL = process.env.PUBLIC_WEBAPP_URL || process.env.WEBAPP_URL || 'https://wealthwars.fun';
const WEBAPP_URL = /\.railway\.internal\b/i.test(RAW_WEBAPP_URL) ? 'https://wealthwars.fun' : RAW_WEBAPP_URL;
const toBigInt = (value) => (typeof value === 'bigint' ? value : BigInt(value));
const bigintToLamports = (value) => Number(toBigInt(value)) / 1e9;
const lamportsToWealth = (lamports) => Number(lamports) / 1e9;
// In-memory store for pending wallet links
const pendingWalletLinks = new Map();
// Helpers to tolerate legacy DB missing users.username
function isMissingUsernameColumn(err) {
        const msg = String((err === null || err === void 0 ? void 0 : err.message) || '');
        return ((err === null || err === void 0 ? void 0 : err.code) === 'P2022') || /users\.username/.test(msg);
}
async function ensureUsersUsername(prisma) {
        try {
                await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" TEXT`);
                await prisma.$executeRawUnsafe(`UPDATE "users"
            SET "username" = COALESCE(NULLIF("username", ''),
                CASE WHEN "telegramId" IS NOT NULL THEN '@' || "telegramId"
                         ELSE 'user_' || SUBSTR("id", 1, 8) END)
            WHERE "username" IS NULL OR "username" = ''`);
        }
        catch (e) { }
}
/**
 * Create enhanced Telegram bot with lotto service integration
 */
export function createTelegramBot(token, services) {
    const bot = new Telegraf(token);
    // Fallback prisma if services not provided (for backward compatibility)
    const prisma = services?.prisma || new PrismaClient();
    const userIdentity = services?.userIdentity;
    const lottoServices = services?.lottoServices;
    const MODE = (process.env.LOTTO_MODE || 'sol').toLowerCase();
    const API_BASE = (process.env.PUBLIC_API_URL || process.env.PUBLIC_WEBAPP_URL || '').replace(/\/$/, '');
    const buildJoinUrl = (roundId) => {
        const base = process.env.SIGNING_BASE_URL || 'https://wealthwars.fun';
        const api = API_BASE || base; // fallback to same host if PUBLIC_API_URL not set
        const url = `${base.replace(/\/$/, '')}/join.html?round=${roundId}&api=${encodeURIComponent(api)}`;
        return url;
    };
    // =============================================================================
    // Start & Help Commands
    // =============================================================================
    bot.start(async (ctx) => {
        if (!WEBAPP_URL) {
            await ctx.reply('🚀 Mini-App URL not configured. Please set PUBLIC_WEBAPP_URL.');
            return;
        }
        const chatType = ctx.chat?.type || 'private';
        const isPrivate = chatType === 'private';
        const button = isPrivate
            ? [{ text: 'Open Mini‑App', web_app: { url: WEBAPP_URL } }]
            : [{ text: 'Open Mini‑App', url: WEBAPP_URL }];
        await ctx.reply('🚀 Open the Wealth Wars Mini‑App to play the lotto:', {
            reply_markup: { inline_keyboard: [button] },
        });
    });
    bot.help(async (ctx) => {
        await ctx.reply(`🎰 Wealth Wars Lotto Bot Commands:

/link - Link your wallet (send address, then sign message)
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
    // Audit Command - Show core addresses
    // =============================================================================
    bot.command('audit', async (ctx) => {
        try {
            if (!lottoServices) {
                return ctx.reply('❌ Lotto services not initialized');
            }
            const programId = lottoServices.roundManager.program.programId;
            const authorityPk = lottoServices.roundManager.authority.publicKey;
            const [treasuryPda] = findTreasuryPda(authorityPk, programId);
            const [treasuryVaultPda] = findTreasuryVaultPda(authorityPk, programId);
            const apiBase = process.env.PUBLIC_API_URL || process.env.PUBLIC_WEBAPP_URL || 'https://wealthwars.fun';
            const auditOverview = `${apiBase.replace(/\/$/, '')}/api/audit/lotto/overview`;
            await ctx.reply(`🧾 Audit Overview

Program: \`${programId.toBase58()}\`
Authority: \`${authorityPk.toBase58()}\`
Treasury PDA: \`${treasuryPda.toBase58()}\`
Treasury Vault PDA: \`${treasuryVaultPda.toBase58()}\`

REST: ${auditOverview}
Tip: Use /round and /close, then claims to move funds out as designed.`);
        }
        catch (e) {
            console.error('Audit command error:', e);
            ctx.reply('❌ Audit failed');
        }
    });
    // =============================================================================
    // Link Command - Guide user to link wallet
    // =============================================================================
    bot.command('link', async (ctx) => {
        const base = process.env.SIGNING_BASE_URL || 'https://wealthwars.fun';
        await ctx.reply(`🔗 Wallet Linking

1) Send your Solana wallet address in this chat (Phantom → Account → Copy address).
2) I will reply with a short message for you to sign.
3) Sign it via Phantom or open the signing page:
${base.replace(/\/$/, '')}/sign.html

After you paste the signature back here, your wallet will be linked.`);
    });
    // =============================================================================
    // Test Command - Verify bot version
    // =============================================================================
    bot.command('version', async (ctx) => {
        ctx.reply('✅ Bot Version: 2.0 (Updated Oct 19, 2025)\nCommands: /bet <amount>, /join, /balance');
    });
    // =============================================================================
    // Close Command (Admin) - Close and settle the current round
    // =============================================================================
    bot.command('close', async (ctx) => {
        try {
            if (!lottoServices) return ctx.reply('❌ Lotto services not initialized.');
            const adminList = (process.env.ADMIN_TELEGRAM_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
            const tgId = ctx.from.id.toString();
            if (adminList.length > 0 && !adminList.includes(tgId)) {
                return ctx.reply('🚫 Not authorized to close rounds.');
            }
            // Find most recent OPEN round; if none, try most recent CLOSED round for settlement
            let round = await prisma.round.findFirst({ where: { status: 'OPEN' }, orderBy: { createdAt: 'desc' }, select: { id: true, status: true } });
            if (!round) {
                round = await prisma.round.findFirst({ where: { status: 'CLOSED' }, orderBy: { createdAt: 'desc' }, select: { id: true, status: true } });
            }
            if (!round) {
                return ctx.reply('ℹ️ No round to close or settle.');
            }
            // Force close if still OPEN (bypass end slot requirement)
            if (round.status === 'OPEN') {
                await prisma.round.update({ where: { id: round.id }, data: { status: 'CLOSED', closedAt: new Date() } });
                await ctx.reply(`🔒 Round #${round.id} closed. Settling...`);
            }
            else {
                await ctx.reply(`⚙️ Settling round #${round.id}...`);
            }
            // Settle on-chain and announce winner
            const result = await lottoServices.settlementService.settleRound({ roundId: round.id });
            const payoutSol = lamportsToWealth(result.payoutAmount);
            const winner = result.winnerWallet;
            const short = `${winner.slice(0, 4)}...${winner.slice(-4)}`;
            await ctx.reply(`🏁 Round Settled!

Winner: \`${short}\`
Payout: ${payoutSol.toFixed(3)} SOL
Tx: \`${result.txSignature}\``);
        }
        catch (e) {
            console.error('Close command error:', e);
            const msg = (e?.message || '').toString();
            ctx.reply(`❌ Failed to close/settle round: ${msg}`);
        }
    });
    // =============================================================================
    // Round Command - Show current round status
    // =============================================================================
    bot.command('round', async (ctx) => {
        try {
            const prismaClient = prisma;
            const round = await prismaClient.round.findFirst({
                where: { status: 'OPEN' },
                orderBy: { createdAt: 'desc' },
                select: { id: true, entryCount: true, potAmount: true, ticketPriceLamports: true, createdAt: true },
            });
            if (!round) {
                return ctx.reply('ℹ️ No active round. Use /bet <amount> to start one.');
            }
            const mode = MODE;
            const decimals = parseInt(process.env.WEALTH_DECIMALS || '6', 10);
            const potUnits = BigInt(round.potAmount?.toString?.() || '0');
            const ticketUnits = BigInt(round.ticketPriceLamports?.toString?.() || '0');
            const toUi = (units) => mode === 'spl' ? Number(units) / Math.pow(10, decimals) : Number(units) / 1e9;
            const potWealth = toUi(potUnits);
            const ticketWealth = mode === 'spl' ? parseFloat(process.env.ENTRY_WEALTH || '100') : toUi(ticketUnits);
            const unit = mode === 'spl' ? '$WEALTH' : 'SOL';
            await ctx.reply(`🎰 Current Round #${round.id}

Entries: ${round.entryCount || 0}
Ticket: ${ticketWealth.toFixed(2)} ${unit}
Pot: ${potWealth.toFixed(2)} ${unit}`);
        }
        catch (e) {
            console.error('Round command error:', e);
            ctx.reply('❌ Failed to fetch current round.');
        }
    });
    // =============================================================================
    // Balance Command
    // =============================================================================
    bot.command('balance', async (ctx) => {
        try {
            const telegramId = ctx.from.id.toString();
            let user = null;
            try {
                user = await prisma.user.findFirst({
                    where: { telegramId },
                    select: { id: true, wallet: true, telegramId: true },
                });
            }
            catch (err) {
                if (isMissingUsernameColumn(err)) {
                    await ensureUsersUsername(prisma);
                    user = await prisma.user.findFirst({
                        where: { telegramId },
                        select: { id: true, wallet: true, telegramId: true },
                    });
                }
                else {
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
        }
        catch (error) {
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
            let round = await prisma.round.findFirst({
                where: { status: 'OPEN' },
                orderBy: { createdAt: 'desc' },
            });
            if (!round) {
                try {
                    const ticketLamports = BigInt(Math.round(amount * 1e9));
                    const created = await lottoServices.roundManager.createRound({
                        ticketPriceLamports: ticketLamports,
                        maxEntries: 0,
                        durationSlots: 600n,
                        retainedBps: 0,
                    });
                    round = await prisma.round.findUnique({ where: { id: created.id } });
                    if (!round) {
                        return ctx.reply('❌ Failed to create a new round. Please try again.');
                    }
                    const unit = MODE === 'spl' ? '$WEALTH' : 'SOL';
                    const msg = await ctx.reply(`🎰 Created a new round #${created.id}

Ticket price: ${amount.toFixed(2)} ${unit}
Use /join to participate!`);
                    // Track lobby message so we can edit it live
                    botNotifier.setLobby(created.id, ctx.chat.id, msg.message_id);
                }
                catch (e) {
                    console.error('Create round error:', e);
                    return ctx.reply('❌ Could not create a round at the moment. Please try again.');
                }
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
            if (MODE === 'spl') {
                const joinUrl = buildJoinUrl(round.id);
                return ctx.reply(`⚠️ This entry requires your wallet signature.\n\nPlease complete via the Mini‑App:\n${joinUrl}`);
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
                // Fetch updated pot to include in message
                const updated = await prisma.round.findUnique({ where: { id: round.id }, select: { potAmount: true, entryCount: true } });
                const potLamports = BigInt(updated?.potAmount?.toString?.() || '0');
                const potWealth = lamportsToWealth(potLamports);
                const successMsg = `✅ **Entry Successful!**

Round: #${round.id}
Amount: ${amount.toFixed(3)} SOL
Tickets: 1
Pot is now: ${potWealth.toFixed(3)} SOL (${updated?.entryCount || 0} entries)
Transaction: \`${confirmedEntry.joinTxSignature}\`

Good luck! 🍀`;
                await ctx.reply(successMsg);
                // Emit a lobby update (API already emits; this is extra safety)
                botNotifier.emit('round:joined', { roundId: round.id, wallet: user.wallet, username });
            }
            else {
                ctx.reply(`⏳ Entry submitted!

Round: #${round.id}
Amount: ${amount.toFixed(2)} $WEALTH

Transaction is confirming... Check /round for updates.`);
            }
        }
        catch (error) {
            console.error('Bet command error:', error);
            const msg = (error?.message || '').toString();
            if (/User signature required/i.test(msg) || /LOTTO_MODE=spl/i.test(msg) || /not yet supported/i.test(msg)) {
                try {
                    const current = await prisma.round.findFirst({ where: { status: 'OPEN' }, orderBy: { createdAt: 'desc' }, select: { id: true } });
                    if (current?.id) {
                        const joinUrl = buildJoinUrl(current.id);
                        return ctx.reply(`⚠️ This entry requires your wallet signature.\n\nPlease complete via the Mini‑App:\n${joinUrl}`);
                    }
                }
                catch {}
            }
            ctx.reply(`❌ Error entering round: ${msg || 'Unknown error'}`);
        }
    });

    // ---------------------------------------------------------------------
    // Live Lobby Updates: respond to events from API and edit message
    // ---------------------------------------------------------------------
    async function buildLobbyText(prisma, roundId) {
        const round = await prisma.round.findUnique({ where: { id: roundId }, select: { id: true, status: true, entryCount: true, ticketPriceLamports: true } });
        if (!round) return `❌ Round not found`;
        const entries = await prisma.entry.findMany({ where: { roundId }, orderBy: { createdAt: 'asc' }, select: { wallet: true, userId: true } });
        const users = await prisma.user.findMany({ where: { id: { in: entries.map(e => e.userId) } }, select: { id: true, username: true } });
        const nameOf = (id) => users.find(u => u.id === id)?.username || 'player';
        const list = entries.map((e, i) => `${i + 1}. ${nameOf(e.userId)} (${e.wallet.slice(0, 4)}...${e.wallet.slice(-4)})`).join('\n') || '—';
        const mode = (process.env.LOTTO_MODE || 'sol').toLowerCase();
        const ticketStr = (() => {
            if (mode === 'spl') {
                const entryWealth = parseFloat(process.env.ENTRY_WEALTH || '100');
                return `${isFinite(entryWealth) ? entryWealth.toFixed(2) : '—'} $WEALTH`;
            }
            try { return `${lamportsToWealth(BigInt(round.ticketPriceLamports?.toString?.() || '0')).toFixed(3)} SOL`; } catch { return '—'; }
        })();
        return `🎰 Round #${round.id} — ${round.status}
Ticket: ${ticketStr}
Entries (${round.entryCount || 0}):
${list}`;
    }

    // When a round is created, we keep the lobby in the originating chat (tracked in /bet)
    botNotifier.on('round:created', async () => { /* no-op here */ });

    // When someone joins, edit the lobby message to reflect latest entries
    botNotifier.on('round:joined', async ({ roundId }) => {
        try {
            const lobby = botNotifier.getLobby(roundId);
            const txt = await buildLobbyText(prisma, roundId);
            if (lobby?.chatId && lobby?.messageId) {
                try {
                    await bot.telegram.editMessageText(lobby.chatId, lobby.messageId, undefined, txt, { parse_mode: 'Markdown' });
                }
                catch (e) {
                    // If edit fails (e.g., message too old), send a new one and track it
                    const res = await bot.telegram.sendMessage(lobby.chatId, txt, { parse_mode: 'Markdown' });
                    if (res?.chat?.id && res?.message_id) botNotifier.setLobby(roundId, res.chat.id, res.message_id);
                }
            }
        }
        catch (e) {
            console.warn('round:joined notify failed:', e?.message || e);
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
            if (MODE === 'spl') {
                const joinUrl = buildJoinUrl(round.id);
                return ctx.reply(`⚠️ This entry requires your wallet signature.\n\nOpen Mini‑App to sign & join:\n${joinUrl}`);
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
                // Fetch updated pot to include in message
                const updated = await prisma.round.findUnique({ where: { id: round.id }, select: { potAmount: true, entryCount: true } });
                const potLamports = BigInt(updated?.potAmount?.toString?.() || '0');
                const potWealth = lamportsToWealth(potLamports);
                ctx.reply(`✅ **Joined Successfully!**

Round: #${round.id}
Amount: ${ticketPrice.toFixed(3)} SOL
Tickets: 1
Pot is now: ${potWealth.toFixed(3)} SOL (${updated?.entryCount || 0} entries)
Transaction: \`${confirmedEntry.joinTxSignature}\`

Good luck! 🍀`);
            }
            else {
                ctx.reply(`⏳ Entry submitted!

Round: #${round.id}
Amount: ${ticketPrice.toFixed(2)} $WEALTH

Transaction is confirming...`);
            }
        }
        catch (error) {
            console.error('Join command error:', error);
            const msg = (error?.message || '').toString();
            if (/User signature required/i.test(msg) || /LOTTO_MODE=spl/i.test(msg) || /not yet supported/i.test(msg)) {
                try {
                    const current = await prisma.round.findFirst({ where: { status: 'OPEN' }, orderBy: { createdAt: 'desc' }, select: { id: true } });
                    if (current?.id) {
                        const joinUrl = buildJoinUrl(current.id);
                        return ctx.reply(`⚠️ Wallet signature needed.\n\nOpen Mini‑App to sign & join:\n${joinUrl}`);
                    }
                }
                catch {}
            }
            ctx.reply(`❌ Error joining round: ${msg || 'Unknown error'}`);
        }
    });
    // =============================================================================
    // Wallet Linking Flow
    // =============================================================================
    bot.on('text', async (ctx) => {
        // Sanitize incoming text to avoid zero-width chars or formatting remnants
        const raw = (ctx.message.text || '');
        const text = raw
            .replace(/[\u200B-\u200D\uFEFF]/g, '') // zero-width chars
            .replace(/[`'"<>]/g, '') // stray quotes/backticks/angle brackets
            .replace(/\s+/g, '') // all whitespace/newlines
            .trim();
        const telegramId = ctx.from.id.toString();
        try {
            console.log('[Bot] Text received:', { tg: telegramId, rawLen: raw.length, textLen: text.length, preview: raw.slice(0, 20) });
        }
        catch { }
        // Skip commands
        if (text.startsWith('/'))
            return;
        try {
            // Check if user already has wallet
            let existingUser = null;
            try {
                existingUser = await prisma.user.findFirst({
                    where: { telegramId },
                    select: { id: true, wallet: true, telegramId: true },
                });
            }
            catch (err) {
                if (isMissingUsernameColumn(err)) {
                    await ensureUsersUsername(prisma);
                    existingUser = await prisma.user.findFirst({
                        where: { telegramId },
                        select: { id: true, wallet: true, telegramId: true },
                    });
                }
                else {
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
            // Extract address from common deep-link formats (phantom://..., ?address= or ?pubkey=)
            let candidate = text;
            try {
                const url = new URL(text);
                const addrParam = url.searchParams.get('address') || url.searchParams.get('pubkey');
                if (addrParam)
                    candidate = addrParam;
            }
            catch {
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
            // Check if looks like Solana address
            if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(candidate)) {
                try {
                    new PublicKey(candidate);
                    try {
                        console.log('[Bot] Address candidate OK (direct):', candidate.slice(0, 4) + '...' + candidate.slice(-4));
                    }
                    catch { }
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
                    const webSignUrl = `${process.env.SIGNING_BASE_URL || 'https://wealthwars.fun'}/sign.html?message=${encodedMessage}`;
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
                }
                catch (e) {
                    console.warn('Wallet address parse failed:', e);
                    return ctx.reply('❌ Invalid Solana wallet address. Please paste the base58 address from your wallet.');
                }
            }
            // Fallback: scan message for any base58-looking substrings and validate
            const matches = text.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/g) || [];
            for (const m of matches) {
                try {
                    new PublicKey(m);
                    try {
                        console.log('[Bot] Address candidate OK (scanned):', m.slice(0, 4) + '...' + m.slice(-4));
                    }
                    catch { }
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
                    const webSignUrl = `${process.env.SIGNING_BASE_URL || 'https://wealthwars.fun'}/sign.html?message=${encodedMessage}`;
                    ctx.reply(`✅ **Wallet Address Received:** \`${m}\`\n\n**🔐 Sign this message to verify ownership:**\n\`${message}\`\n\n**Option 1 - Mobile:**\nTap: ${phantomDeepLink}\n\n**Option 2 - Browser:**\nVisit: ${webSignUrl}\n\n**Option 3 - Manual:**\nSign in Phantom app and paste signature here.\n\n⏰ Expires in 10 minutes`);
                    return;
                }
                catch { }
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
                    const isValid = nacl.sign.detached.verify(new Uint8Array(messageBytes), new Uint8Array(signatureBytes), publicKey.toBytes());
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
                    }
                    else {
                        // Fallback: direct database update without username column
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
                        }
                        catch (err) {
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
                            }
                            else {
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
                }
                catch (error) {
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
        }
        catch (error) {
            console.error('Text handler error:', error);
            ctx.reply('❌ An error occurred.');
        }
    });
    return bot;
}
/**
 * Webhook handler for Express
 */
export async function handleTelegramWebhook(req, res, bot) {
    try {
        await bot.handleUpdate(req.body);
        res.json({ ok: true });
    }
    catch (error) {
        console.error('Telegram webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
}
