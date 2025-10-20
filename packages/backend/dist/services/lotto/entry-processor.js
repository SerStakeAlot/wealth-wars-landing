/**
 * Entry Processor Service
 *
 * Handles ticket purchases (joining rounds) on-chain.
 */
import { PublicKey } from '@solana/web3.js';
import { findEntryPda, findTreasuryVaultPda, buildJoinRoundTx, signAndSendTransaction, } from '../../solana/index.js';
export class EntryProcessor {
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
     * Get the next entry nonce for a round
     */
    async getNextEntryNonce(onchainRoundId) {
        const latestEntry = await this.prisma.entry.findFirst({
            where: {
                round: { onchainRoundId: onchainRoundId },
                nonce: { not: null },
            },
            orderBy: { nonce: 'desc' },
            select: { nonce: true },
        });
        if (!latestEntry || latestEntry.nonce === null) {
            return 0;
        }
        return latestEntry.nonce + 1;
    }
    /**
     * Process a user joining a round (buying a ticket)
     */
    async joinRound(params) {
        // Get the round from database
        const dbRound = await this.prisma.round.findUnique({
            where: { id: params.roundId },
        });
        if (!dbRound) {
            throw new Error('Round not found');
        }
        if (dbRound.status !== 'OPEN') {
            throw new Error(`Round is not open (status: ${dbRound.status})`);
        }
        if (!dbRound.onchainRoundId || !dbRound.onchainAddress) {
            throw new Error('Round is not on-chain');
        }
        const onchainRoundId = BigInt(dbRound.onchainRoundId.toString());
        // Check if user already has an entry
        const existingEntry = await this.prisma.entry.findFirst({
            where: {
                roundId: params.roundId,
                userId: params.userId,
            },
        });
        if (existingEntry) {
            throw new Error('User already has an entry in this round');
        }
        // Get next entry nonce
        const nonce = await this.getNextEntryNonce(onchainRoundId);
        // Derive PDAs
        const roundPda = new PublicKey(dbRound.onchainAddress);
    const [entryPda] = findEntryPda(roundPda, params.userWallet, nonce, this.program.programId);
        const [treasuryVaultPda] = findTreasuryVaultPda(this.authority.publicKey, this.program.programId);
        console.log(`[EntryProcessor] User ${params.userId} joining round ${onchainRoundId} (nonce: ${nonce})`);
        console.log(`[EntryProcessor] Entry PDA: ${entryPda.toBase58()}`);
        // Build and send join transaction
        // Note: In production, the user would sign this transaction
        // For now, we'll use the authority as a placeholder
        const mode = (process.env.LOTTO_MODE || 'sol').toLowerCase();
        if (mode === 'spl') {
            throw new Error('LOTTO_MODE=spl not yet supported in deployed program. Deploy SPL-enabled program and update builders.');
        }
        const tx = await buildJoinRoundTx(this.program, params.userWallet, roundPda, { tickets: 1, nonce }, this.authority.publicKey);
        const signature = await signAndSendTransaction(this.connection, tx, [this.authority] // In production, user would sign
        );
        console.log(`[EntryProcessor] Entry created: ${signature}`);
        // Create database record
        const dbEntry = await this.prisma.entry.create({
            data: {
                roundId: params.roundId,
                userId: params.userId,
                wallet: params.userWallet.toBase58(),
                onchainAddress: entryPda.toBase58(),
                amount: BigInt(dbRound.ticketPriceLamports.toString()),
                nonce,
                joinTxSignature: signature,
                claimed: false,
                lastSyncedAt: new Date(),
            },
        });
        // Update round entry count
        await this.prisma.round.update({
            where: { id: params.roundId },
            data: {
                entryCount: { increment: 1 },
                potAmount: {
                    increment: BigInt(dbRound.ticketPriceLamports.toString()),
                },
            },
        });
        return {
            id: dbEntry.id,
            roundId: dbEntry.roundId,
            userId: dbEntry.userId,
            wallet: dbEntry.wallet,
            onchainAddress: entryPda.toBase58(),
            nonce,
            joinTxSignature: signature,
            createdAt: dbEntry.createdAt,
        };
    }
    /**
     * Get all entries for a round
     */
    async getRoundEntries(roundId) {
        const entries = await this.prisma.entry.findMany({
            where: { roundId },
            orderBy: { createdAt: 'asc' },
        });
        return entries.map(entry => ({
            id: entry.id,
            roundId: entry.roundId,
            userId: entry.userId,
            wallet: entry.wallet,
            onchainAddress: entry.onchainAddress,
            nonce: entry.nonce,
            joinTxSignature: entry.joinTxSignature,
            createdAt: entry.createdAt,
        }));
    }
    /**
     * Get user's entry for a specific round
     */
    async getUserEntry(roundId, userId) {
        const entry = await this.prisma.entry.findFirst({
            where: {
                roundId,
                userId,
            },
        });
        if (!entry || !entry.onchainAddress) {
            return null;
        }
        return {
            id: entry.id,
            roundId: entry.roundId,
            userId: entry.userId,
            wallet: entry.wallet,
            onchainAddress: entry.onchainAddress,
            nonce: entry.nonce,
            joinTxSignature: entry.joinTxSignature,
            createdAt: entry.createdAt,
        };
    }
}
