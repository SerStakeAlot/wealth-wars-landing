/**
 * Lotto API Routes
 *
 * REST API endpoints for the on-chain lotto system.
 * Supports both web (wallet) and Telegram users.
 */
import { Router } from 'express';
import { PublicKey } from '@solana/web3.js';
import { validateBody, validateQuery, validateParams, requireAdmin, asyncHandler, errorResponse, } from './middleware.js';
import { CreateRoundSchema, JoinRoundWebSchema, JoinRoundTelegramSchema, JoinRoundSubmitSchema, ClaimSchema, CreateWebUserSchema, CreateTelegramUserSchema, } from './schemas.js';
import { z } from 'zod';
export function createLottoRoutes(lottoServices, userService) {
    const router = Router();
    // BigInt-safe deep serializer for API responses
    const toPlain = (value) => {
        if (typeof value === 'bigint')
            return value.toString();
        if (Array.isArray(value))
            return value.map(toPlain);
        if (value && typeof value === 'object') {
            const out = {};
            for (const [k, v] of Object.entries(value))
                out[k] = toPlain(v);
            return out;
        }
        return value;
    };
    // Local JSON sender that bypasses res.json to avoid BigInt issues
    const sendJson = (res, data, status = 200) => {
        const payload = { success: true, data: toPlain(data) };
        const body = JSON.stringify(payload);
        return res.status(status).type('application/json').send(body);
    };
    // ==========================================================================
    // User Management
    // ==========================================================================
    /**
     * POST /api/lotto/users/web
     * Create or update web user (wallet + username)
     */
    router.post('/users/web', validateBody(CreateWebUserSchema), asyncHandler(async (req, res) => {
        const { wallet, username } = req.body;
        const user = await userService.createWebUser(wallet, username);
        return sendJson(res, {
            user: {
                id: user.id,
                wallet: user.wallet,
                username: user.username,
                source: user.source,
            },
        });
    }));
    /**
     * POST /api/lotto/users/telegram
     * Get or create Telegram user
     */
    router.post('/users/telegram', validateBody(CreateTelegramUserSchema), asyncHandler(async (req, res) => {
        const { telegramId, username } = req.body;
        const user = await userService.getOrCreateTelegramUser(telegramId, username || `user_${telegramId}`);
        return sendJson(res, {
            user: {
                id: user.id,
                telegramId: user.telegramId,
                username: user.username,
                source: user.source,
            },
        });
    }));
    /**
     * GET /api/lotto/users/:id
     * Get user by ID
     */
    router.get('/users/:id', validateParams(z.object({ id: z.string().cuid() })), asyncHandler(async (req, res) => {
        const { id } = req.params;
        const user = await userService.getUserById(id);
        if (!user) {
            return errorResponse(res, 'User not found', 404);
        }
        return sendJson(res, { user });
    }));
    // ==========================================================================
    // Round Management
    // ==========================================================================
    /**
     * POST /api/lotto/rounds
     * Create a new lotto round (Admin only)
     */
    router.post('/rounds', requireAdmin, validateBody(CreateRoundSchema), asyncHandler(async (req, res) => {
        const { ticketPriceLamports, maxEntries, durationSlots, retainedBps } = req.body;
        const round = await lottoServices.roundManager.createRound({
            ticketPriceLamports,
            maxEntries,
            durationSlots,
            retainedBps,
        });
        return sendJson(res, { round }, 201);
    }));
    /**
     * GET /api/lotto/rounds/current
     * Get the current active round
     */
    router.get('/rounds/current', asyncHandler(async (req, res) => {
        const round = await lottoServices.roundManager.getCurrentRound();
        if (!round) {
            return errorResponse(res, 'No active round', 404);
        }
        // Get entries for this round
        const entries = await lottoServices.entryProcessor.getRoundEntries(round.id);
        return sendJson(res, {
            round,
            entries: entries.map(e => ({
                id: e.id,
                userId: e.userId,
                wallet: e.wallet,
                username: e.userId, // Will be enriched with actual username
                createdAt: e.createdAt,
            })),
        });
    }));
    /**
     * GET /api/lotto/rounds/:id
     * Get round by ID
     */
    router.get('/rounds/:id', validateParams(z.object({ id: z.string().cuid() })), asyncHandler(async (req, res) => {
        const { id } = req.params;
        const round = await lottoServices.roundManager.getRoundById(id);
        if (!round) {
            return errorResponse(res, 'Round not found', 404);
        }
        // Get entries
        const entries = await lottoServices.entryProcessor.getRoundEntries(id);
        return sendJson(res, {
            round,
            entries,
        });
    }));
    /**
     * POST /api/lotto/rounds/:id/join/web
     * Join round as web user (wallet + username)
     */
    router.post('/rounds/:id/join/web', validateParams(z.object({ id: z.string().cuid() })), validateBody(JoinRoundWebSchema), asyncHandler(async (req, res) => {
        const { id: roundId } = req.params;
        const { wallet, username } = req.body;
        // Create or get user
        const user = await userService.createWebUser(wallet, username);
        // Join round
        const entry = await lottoServices.entryProcessor.joinRound({
            roundId,
            userId: user.id,
            userWallet: new PublicKey(wallet),
        });
        return sendJson(res, {
            entry: {
                id: entry.id,
                roundId: entry.roundId,
                username: user.username,
                wallet: entry.wallet,
                onchainAddress: entry.onchainAddress,
                txSignature: entry.joinTxSignature,
                createdAt: entry.createdAt,
            },
        }, 201);
    }));
    /**
     * POST /api/lotto/rounds/:id/join/telegram
     * Join round as Telegram user
     */
    router.post('/rounds/:id/join/telegram', validateParams(z.object({ id: z.string().cuid() })), validateBody(JoinRoundTelegramSchema), asyncHandler(async (req, res) => {
        const { id: roundId } = req.params;
        const { telegramId, username } = req.body;
        // Get or create user
        const user = await userService.getOrCreateTelegramUser(telegramId, username || `user_${telegramId}`);
        // For Telegram users, we need a wallet - this should be from a custodial wallet
        // or the user should have linked their wallet
        if (!user.wallet) {
            return errorResponse(res, 'Telegram user must link a wallet first', 400);
        }
        // Join round
        const entry = await lottoServices.entryProcessor.joinRound({
            roundId,
            userId: user.id,
            userWallet: new PublicKey(user.wallet),
        });
        return sendJson(res, {
            entry: {
                id: entry.id,
                roundId: entry.roundId,
                username: user.username,
                txSignature: entry.joinTxSignature,
                createdAt: entry.createdAt,
            },
        }, 201);
    }));
    /**
     * GET /api/lotto/rounds/:id/join/prepare
     * Prepare an unsigned transaction for user to sign
     */
    router.get('/rounds/:id/join/prepare', validateParams(z.object({ id: z.string().cuid() })), validateQuery(z.object({ wallet: z.string().min(32).max(44) })), asyncHandler(async (req, res) => {
        const { id: roundId } = req.params;
        const { wallet } = req.query;
        // Get the round from database
        const round = await lottoServices.roundManager.getRoundById(roundId);
        if (!round) {
            return errorResponse(res, 'Round not found', 404);
        }
        if (round.status !== 'OPEN') {
            return errorResponse(res, `Round is not open (status: ${round.status})`, 400);
        }
        if (!round.onchainRoundId || !round.onchainAddress) {
            return errorResponse(res, 'Round is not on-chain', 400);
        }
        // Get or create user by wallet
        let user = await userService.getUserByWallet(wallet);
        if (!user) {
            // Create a temporary user for this wallet
            user = await userService.createWebUser(wallet, `user_${wallet.slice(0, 8)}`);
        }
        // Check if user already has an entry
        const existingEntry = await lottoServices.entryProcessor.getUserEntry(roundId, user.id);
        if (existingEntry) {
            return errorResponse(res, 'User already has an entry in this round', 400);
        }
        // Get next entry nonce
        const entries = await lottoServices.entryProcessor.getRoundEntries(roundId);
        const nonce = entries.length;
        // Build unsigned transaction
        const userWallet = new PublicKey(wallet);
        const roundPda = new PublicKey(round.onchainAddress);
        // Import transaction builders
        const { buildJoinRoundTx } = await import('../../solana/index.js');
        const program = lottoServices.entryProcessor.program;
        const authority = lottoServices.entryProcessor.authority;
        const connection = lottoServices.entryProcessor.connection;
        const tx = await buildJoinRoundTx(program, userWallet, roundPda, { tickets: 1, nonce }, authority.publicKey);
        // Set recent blockhash and feePayer for serialization
        const { blockhash } = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.feePayer = userWallet;
        // Serialize transaction for client
        const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
        const txBase64 = Buffer.from(serialized).toString('base64');
        return sendJson(res, {
            tx: txBase64,
            nonce,
            roundId,
            wallet,
        });
    }));
    /**
     * POST /api/lotto/rounds/:id/join/submit
     * Submit a signed transaction signature and record the entry
     */
    router.post('/rounds/:id/join/submit', validateParams(z.object({ id: z.string().cuid() })), validateBody(JoinRoundSubmitSchema), asyncHandler(async (req, res) => {
        const { id: roundId } = req.params;
        const { wallet, signature, nonce } = req.body;
        // Get the round from database
        const round = await lottoServices.roundManager.getRoundById(roundId);
        if (!round) {
            return errorResponse(res, 'Round not found', 404);
        }
        if (round.status !== 'OPEN') {
            return errorResponse(res, `Round is not open (status: ${round.status})`, 400);
        }
        if (!round.onchainRoundId || !round.onchainAddress) {
            return errorResponse(res, 'Round is not on-chain', 400);
        }
        // Get or create user by wallet
        let user = await userService.getUserByWallet(wallet);
        if (!user) {
            user = await userService.createWebUser(wallet, `user_${wallet.slice(0, 8)}`);
        }
        // Check if user already has an entry
        const existingEntry = await lottoServices.entryProcessor.getUserEntry(roundId, user.id);
        if (existingEntry) {
            return errorResponse(res, 'User already has an entry in this round', 400);
        }
        // Derive entry PDA
        const userWallet = new PublicKey(wallet);
        const roundPda = new PublicKey(round.onchainAddress);
        const { findEntryPda } = await import('../../solana/index.js');
        const program = lottoServices.entryProcessor.program;
        const [entryPda] = findEntryPda(roundPda, userWallet, nonce, program.programId);
        // Create database record
        const prisma = lottoServices.entryProcessor.prisma;
        const dbEntry = await prisma.entry.create({
            data: {
                roundId,
                userId: user.id,
                wallet,
                onchainAddress: entryPda.toBase58(),
                amount: round.ticketPriceLamports,
                nonce,
                joinTxSignature: signature,
                claimed: false,
                lastSyncedAt: new Date(),
            },
        });
        // Update round entry count and pot amount
        await prisma.round.update({
            where: { id: roundId },
            data: {
                entryCount: { increment: 1 },
                potAmount: {
                    increment: round.ticketPriceLamports,
                },
            },
        });
        return sendJson(res, {
            entry: {
                id: dbEntry.id,
                roundId: dbEntry.roundId,
                wallet: dbEntry.wallet,
                onchainAddress: entryPda.toBase58(),
                nonce,
                txSignature: signature,
                createdAt: dbEntry.createdAt,
            },
        }, 201);
    }));
    /**
     * POST /api/lotto/rounds/:id/close
     * Close round (Admin only)
     */
    router.post('/rounds/:id/close', requireAdmin, validateParams(z.object({ id: z.string().cuid() })), asyncHandler(async (req, res) => {
        const { id } = req.params;
        await lottoServices.settlementService.closeRound(id);
        return sendJson(res, {
            message: 'Round closed successfully',
            roundId: id,
        });
    }));
    /**
     * POST /api/lotto/rounds/:id/settle
     * Settle round and select winner (Admin only)
     */
    router.post('/rounds/:id/settle', requireAdmin, validateParams(z.object({ id: z.string().cuid() })), asyncHandler(async (req, res) => {
        const { id } = req.params;
        const result = await lottoServices.settlementService.settleRound({ roundId: id });
        return sendJson(res, {
            settlement: {
                roundId: result.roundId,
                winner: result.winnerWallet,
                payoutAmount: result.payoutAmount.toString(),
                treasuryCut: result.treasuryCut.toString(),
                txSignature: result.txSignature,
            },
        });
    }));
    // ==========================================================================
    // Entry & Claims
    // ==========================================================================
    /**
     * GET /api/lotto/entries/:id
     * Get entry details
     */
    router.get('/entries/:id', validateParams(z.object({ id: z.string().cuid() })), asyncHandler(async (req, res) => {
        const { id } = req.params;
        // We'd need to add a getEntryById method to entryProcessor
        // For now, return a not implemented response
        return errorResponse(res, 'Not implemented yet', 501);
    }));
    /**
     * POST /api/lotto/entries/:id/claim
     * Claim payout or refund
     */
    router.post('/entries/:id/claim', validateParams(z.object({ id: z.string().cuid() })), validateBody(ClaimSchema), asyncHandler(async (req, res) => {
        const { id: entryId } = req.params;
        const { wallet } = req.body;
        // Check if it's a payout or refund
        const canClaimPayout = await lottoServices.claimService.canClaimPayout(entryId);
        const canClaimRefund = await lottoServices.claimService.canClaimRefund(entryId);
        if (!canClaimPayout && !canClaimRefund) {
            return errorResponse(res, 'No claimable funds for this entry', 400);
        }
        let result;
        if (canClaimPayout) {
            result = await lottoServices.claimService.claimPayout({
                entryId,
                userWallet: new PublicKey(wallet),
            });
        }
        else {
            result = await lottoServices.claimService.claimRefund({
                entryId,
                userWallet: new PublicKey(wallet),
            });
        }
        return sendJson(res, {
            claim: {
                entryId: result.entryId,
                amount: result.amount.toString(),
                type: result.claimType,
                txSignature: result.txSignature,
            },
        });
    }));
    // ==========================================================================
    // Health Check
    // ==========================================================================
    /**
     * GET /api/lotto/health
     * Simple health check for lotto services
     */
    router.get('/health', async (req, res) => {
        const decimals = process.env.WEALTH_DECIMALS ? parseInt(process.env.WEALTH_DECIMALS, 10) : undefined;
        let current = null;
        try {
            const round = await lottoServices.roundManager.getCurrentRound();
            if (round) {
                current = { id: round.id, onchainRoundId: round.onchainRoundId.toString(), entryCount: round.entryCount, status: round.status };
            }
        }
        catch { }
        return sendJson(res, {
            status: 'healthy',
            service: 'lotto-api',
            timestamp: new Date().toISOString(),
            token: {
                mint: process.env.WEALTH_MINT,
                symbol: process.env.WEALTH_SYMBOL || 'WEALTH',
                decimals,
                entryWealth: parseFloat(process.env.ENTRY_WEALTH || '100'),
                payoutWinnerBps: parseInt(process.env.PAYOUT_WINNER_BPS || '8000', 10),
                payoutTreasuryBps: parseInt(process.env.PAYOUT_TREASURY_BPS || '2000', 10),
                tokenProgram: process.env.WEALTH_TOKEN_PROGRAM,
            },
            currentRound: current,
        });
    });
    return router;
}
