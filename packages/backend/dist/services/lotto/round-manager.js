/**
 * Round Manager Service
 *
 * Handles creation and management of lotto rounds on-chain.
 */
import { PublicKey } from '@solana/web3.js';
import { findRoundPda, findTreasuryPda, buildInitializeRoundTx, buildAdminCloseTx, signAndSendTransaction, } from '../../solana/index.js';
export class RoundManager {
    program;
    connection;
    authority;
    prisma;
    constructor(program, connection, authority, prisma) {
        this.program = program;
        this.connection = connection;
        this.authority = authority;
        this.prisma = prisma;
    }
    /**
     * Get the next round ID by finding the highest existing ID
     */
    async getNextRoundId() {
        const latestRound = await this.prisma.round.findFirst({
            where: { onchainRoundId: { not: null } },
            orderBy: { onchainRoundId: 'desc' },
            select: { onchainRoundId: true },
        });
        if (!latestRound || !latestRound.onchainRoundId) {
            return 1n;
        }
        return BigInt(latestRound.onchainRoundId.toString()) + 1n;
    }
    /**
     * Create a new round on-chain and in the database
     */
    async createRound(params) {
        const roundId = await this.getNextRoundId();
        const programId = this.program.programId;
        // Derive PDAs
        const [roundPda] = findRoundPda(this.authority.publicKey, roundId, programId);
        const [treasuryPda] = findTreasuryPda(this.authority.publicKey, programId);
        console.log(`[RoundManager] Creating round ${roundId}`);
        console.log(`[RoundManager] Round PDA: ${roundPda.toBase58()}`);
        console.log(`[RoundManager] Treasury PDA: ${treasuryPda.toBase58()}`);
        // Build and send initialize transaction
        const mode = (process.env.LOTTO_MODE || 'sol').toLowerCase();
        let signature = 'offchain-spl-init';
        // In SPL mode, we do not initialize on-chain; we derive PDAs and create DB record only
        let startSlot = 0n;
        let endSlot = 0n;
        if (mode !== 'spl') {
            const tx = await buildInitializeRoundTx(this.program, this.authority.publicKey, {
                roundId,
                ticketPriceLamports: params.ticketPriceLamports,
                maxEntries: params.maxEntries,
                durationSlots: params.durationSlots,
                retainedBps: params.retainedBps,
            });
            signature = await signAndSendTransaction(this.connection, tx, [this.authority]);
            console.log(`[RoundManager] Round initialized: ${signature}`);
            // Get current slot for start/end tracking
            const currentSlot = await this.connection.getSlot();
            startSlot = BigInt(currentSlot);
            endSlot = startSlot + params.durationSlots;
        } else {
            try {
                const currentSlot = await this.connection.getSlot();
                startSlot = BigInt(currentSlot);
                endSlot = startSlot + params.durationSlots;
            } catch {
                // leave defaults if slot fetch fails
                startSlot = 0n; endSlot = params.durationSlots;
            }
        }
        // Create database record
        const dbRound = await this.prisma.round.create({
            data: {
                onchainRoundId: roundId,
                onchainAddress: roundPda.toBase58(),
                authorityAddress: this.authority.publicKey.toBase58(),
                status: 'OPEN',
                potAmount: 0n,
                ticketPriceLamports: params.ticketPriceLamports,
                maxEntries: params.maxEntries,
                startSlot,
                endSlot,
                retainedBps: params.retainedBps,
                treasuryCutLamports: 0n,
                entryCount: 0,
                initTxSignature: signature,
                lastSyncedAt: new Date(),
            },
        });
        return {
            id: dbRound.id,
            onchainRoundId: roundId,
            onchainAddress: roundPda.toBase58(),
            status: dbRound.status,
            potAmount: BigInt(dbRound.potAmount.toString()),
            ticketPriceLamports: params.ticketPriceLamports,
            maxEntries: params.maxEntries,
            startSlot,
            endSlot,
            entryCount: 0,
            winner: null,
        };
    }
    /**
     * Get current active round
     */
    async getCurrentRound() {
        const dbRound = await this.prisma.round.findFirst({
            where: {
                status: 'OPEN',
                onchainRoundId: { not: null },
            },
            orderBy: { createdAt: 'desc' },
        });
        if (!dbRound || !dbRound.onchainRoundId) {
            return null;
        }
        return {
            id: dbRound.id,
            onchainRoundId: BigInt(dbRound.onchainRoundId.toString()),
            onchainAddress: dbRound.onchainAddress,
            status: dbRound.status,
            potAmount: BigInt(dbRound.potAmount.toString()),
            ticketPriceLamports: BigInt(dbRound.ticketPriceLamports.toString()),
            maxEntries: dbRound.maxEntries,
            startSlot: BigInt(dbRound.startSlot.toString()),
            endSlot: BigInt(dbRound.endSlot.toString()),
            entryCount: dbRound.entryCount,
            winner: dbRound.winner,
        };
    }
    /**
     * Close a round (admin only)
     */
    async closeRound(roundId, reason = 1) {
        const dbRound = await this.prisma.round.findUnique({
            where: { id: roundId },
        });
        if (!dbRound || !dbRound.onchainAddress) {
            throw new Error('Round not found or not on-chain');
        }
        const roundPda = new PublicKey(dbRound.onchainAddress);
        // Build and send admin close transaction
        const tx = await buildAdminCloseTx(this.program, this.authority.publicKey, roundPda, reason);
        const signature = await signAndSendTransaction(this.connection, tx, [this.authority]);
        console.log(`[RoundManager] Round closed: ${signature}`);
        // Update database
        await this.prisma.round.update({
            where: { id: roundId },
            data: {
                status: 'CANCELLED',
                closedAt: new Date(),
            },
        });
    }
    /**
     * Get round by ID
     */
    async getRoundById(id) {
        const dbRound = await this.prisma.round.findUnique({
            where: { id },
        });
        if (!dbRound || !dbRound.onchainRoundId) {
            return null;
        }
        return {
            id: dbRound.id,
            onchainRoundId: BigInt(dbRound.onchainRoundId.toString()),
            onchainAddress: dbRound.onchainAddress,
            status: dbRound.status,
            potAmount: BigInt(dbRound.potAmount.toString()),
            ticketPriceLamports: BigInt(dbRound.ticketPriceLamports.toString()),
            maxEntries: dbRound.maxEntries,
            startSlot: BigInt(dbRound.startSlot.toString()),
            endSlot: BigInt(dbRound.endSlot.toString()),
            entryCount: dbRound.entryCount,
            winner: dbRound.winner,
        };
    }
}
