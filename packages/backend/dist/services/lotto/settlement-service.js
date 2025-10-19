/**
 * Settlement Service
 *
 * Handles round settlement and winner selection on-chain.
 */
import { PublicKey } from '@solana/web3.js';
import { findTreasuryPda, findTreasuryVaultPda, buildSettleRoundTx, signAndSendTransaction, } from '../../solana/index.js';
export class SettlementService {
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
     * Settle a round - select winner and distribute funds
     */
    async settleRound(params) {
        // Get the round from database
        const dbRound = await this.prisma.round.findUnique({
            where: { id: params.roundId },
            include: {
                entries: true,
            },
        });
        if (!dbRound) {
            throw new Error('Round not found');
        }
        if (dbRound.status !== 'CLOSED') {
            throw new Error(`Round is not closed (status: ${dbRound.status})`);
        }
        if (!dbRound.onchainAddress) {
            throw new Error('Round is not on-chain');
        }
        if (dbRound.entries.length === 0) {
            throw new Error('Round has no entries');
        }
        const roundPda = new PublicKey(dbRound.onchainAddress);
        const [treasuryPda] = findTreasuryPda(this.authority.publicKey, this.program.programId);
        const [treasuryVaultPda] = findTreasuryVaultPda(this.authority.publicKey, this.program.programId);
        console.log(`[SettlementService] Settling round ${dbRound.id}`);
        console.log(`[SettlementService] Total entries: ${dbRound.entries.length}`);
        // Build and send settle transaction
        const tx = await buildSettleRoundTx(this.program, this.authority.publicKey, roundPda, treasuryPda, treasuryVaultPda);
        const signature = await signAndSendTransaction(this.connection, tx, [this.authority]);
        console.log(`[SettlementService] Round settled: ${signature}`);
        // Fetch the round account to get the winner
        const roundAccount = await this.program.account.round.fetch(roundPda);
        // Find the winning entry
        const winnerEntry = dbRound.entries.find(entry => entry.wallet === roundAccount.winner.toBase58());
        if (!winnerEntry) {
            throw new Error('Winner entry not found in database');
        }
        // Calculate amounts
        const potAmount = BigInt(dbRound.potAmount.toString());
        const retainedBps = dbRound.retainedBps || 0;
        const treasuryCut = (potAmount * BigInt(retainedBps)) / 10000n;
        const payoutAmount = potAmount - treasuryCut;
        // Update database
        await this.prisma.round.update({
            where: { id: params.roundId },
            data: {
                status: 'SETTLED',
                winner: winnerEntry.wallet,
                winnerEntryId: winnerEntry.id,
                settledAt: new Date(),
                settleTxSignature: signature,
                treasuryCutLamports: treasuryCut,
            },
        });
        return {
            roundId: dbRound.id,
            winnerWallet: winnerEntry.wallet,
            winnerEntryId: winnerEntry.id,
            payoutAmount,
            treasuryCut,
            txSignature: signature,
        };
    }
    /**
     * Check if a round is ready to settle (past end slot)
     */
    async isRoundReadyToSettle(roundId) {
        const dbRound = await this.prisma.round.findUnique({
            where: { id: roundId },
        });
        if (!dbRound || !dbRound.endSlot) {
            return false;
        }
        const currentSlot = await this.connection.getSlot();
        return BigInt(currentSlot) >= BigInt(dbRound.endSlot.toString());
    }
    /**
     * Close a round (transition from OPEN to CLOSED)
     */
    async closeRound(roundId) {
        const dbRound = await this.prisma.round.findUnique({
            where: { id: roundId },
        });
        if (!dbRound) {
            throw new Error('Round not found');
        }
        if (dbRound.status !== 'OPEN') {
            throw new Error(`Round is not open (status: ${dbRound.status})`);
        }
        // Check if end slot has been reached
        const isReady = await this.isRoundReadyToSettle(roundId);
        if (!isReady) {
            throw new Error('Round end slot not reached yet');
        }
        // Update status to CLOSED
        await this.prisma.round.update({
            where: { id: roundId },
            data: {
                status: 'CLOSED',
                closedAt: new Date(),
            },
        });
        console.log(`[SettlementService] Round ${roundId} closed and ready for settlement`);
    }
}
