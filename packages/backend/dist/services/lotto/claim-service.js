/**
 * Claim Service
 *
 * Handles claiming payouts (for winners) and refunds (for cancelled rounds).
 */
import { PublicKey } from '@solana/web3.js';
import { findTreasuryVaultPda, buildClaimPayoutTx, buildClaimRefundTx, signAndSendTransaction, } from '../../solana/index.js';
export class ClaimService {
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
     * Claim a payout for a winning entry
     */
    async claimPayout(params) {
        // Get the entry from database
        const dbEntry = await this.prisma.entry.findUnique({
            where: { id: params.entryId },
            include: {
                round: true,
            },
        });
        if (!dbEntry) {
            throw new Error('Entry not found');
        }
        if (!dbEntry.onchainAddress) {
            throw new Error('Entry is not on-chain');
        }
        if (dbEntry.claimed) {
            throw new Error('Entry already claimed');
        }
        const round = dbEntry.round;
        if (round.status !== 'SETTLED') {
            throw new Error(`Round is not settled (status: ${round.status})`);
        }
        if (round.winner !== dbEntry.wallet) {
            throw new Error('Entry is not the winner');
        }
        if (!round.onchainAddress) {
            throw new Error('Round is not on-chain');
        }
        const entryPda = new PublicKey(dbEntry.onchainAddress);
        const roundPda = new PublicKey(round.onchainAddress);
        const [treasuryVaultPda] = findTreasuryVaultPda(this.authority.publicKey, this.program.programId);
        console.log(`[ClaimService] Claiming payout for entry ${dbEntry.id}`);
        // Build and send claim payout transaction
        const tx = await buildClaimPayoutTx(this.program, params.userWallet, roundPda, entryPda, treasuryVaultPda);
        // In production, the user would sign this
        const signature = await signAndSendTransaction(this.connection, tx, [this.authority]);
        console.log(`[ClaimService] Payout claimed: ${signature}`);
        // Calculate payout amount
        const potAmount = BigInt(round.potAmount.toString());
        const retainedBps = round.retainedBps || 0;
        const treasuryCut = (potAmount * BigInt(retainedBps)) / 10000n;
        const payoutAmount = potAmount - treasuryCut;
        // Update database
        await this.prisma.entry.update({
            where: { id: params.entryId },
            data: {
                claimed: true,
                claimedAt: new Date(),
                claimTxSignature: signature,
            },
        });
        return {
            entryId: dbEntry.id,
            amount: payoutAmount,
            txSignature: signature,
            claimType: 'payout',
        };
    }
    /**
     * Claim a refund for an entry in a cancelled round
     */
    async claimRefund(params) {
        // Get the entry from database
        const dbEntry = await this.prisma.entry.findUnique({
            where: { id: params.entryId },
            include: {
                round: true,
            },
        });
        if (!dbEntry) {
            throw new Error('Entry not found');
        }
        if (!dbEntry.onchainAddress) {
            throw new Error('Entry is not on-chain');
        }
        if (dbEntry.claimed) {
            throw new Error('Entry already claimed');
        }
        const round = dbEntry.round;
        if (round.status !== 'CANCELLED') {
            throw new Error(`Round is not cancelled (status: ${round.status})`);
        }
        if (!round.onchainAddress) {
            throw new Error('Round is not on-chain');
        }
        const entryPda = new PublicKey(dbEntry.onchainAddress);
        const roundPda = new PublicKey(round.onchainAddress);
        const [treasuryVaultPda] = findTreasuryVaultPda(this.authority.publicKey, this.program.programId);
        console.log(`[ClaimService] Claiming refund for entry ${dbEntry.id}`);
        // Build and send claim refund transaction
        const tx = await buildClaimRefundTx(this.program, params.userWallet, roundPda, entryPda, treasuryVaultPda);
        // In production, the user would sign this
        const signature = await signAndSendTransaction(this.connection, tx, [this.authority]);
        console.log(`[ClaimService] Refund claimed: ${signature}`);
        // Refund amount is the ticket price
        const refundAmount = BigInt(dbEntry.amount.toString());
        // Update database
        await this.prisma.entry.update({
            where: { id: params.entryId },
            data: {
                claimed: true,
                claimedAt: new Date(),
                claimTxSignature: signature,
            },
        });
        return {
            entryId: dbEntry.id,
            amount: refundAmount,
            txSignature: signature,
            claimType: 'refund',
        };
    }
    /**
     * Check if an entry can claim a payout
     */
    async canClaimPayout(entryId) {
        const dbEntry = await this.prisma.entry.findUnique({
            where: { id: entryId },
            include: {
                round: true,
            },
        });
        if (!dbEntry || dbEntry.claimed) {
            return false;
        }
        const round = dbEntry.round;
        return (round.status === 'SETTLED' &&
            round.winner === dbEntry.wallet &&
            !!dbEntry.onchainAddress);
    }
    /**
     * Check if an entry can claim a refund
     */
    async canClaimRefund(entryId) {
        const dbEntry = await this.prisma.entry.findUnique({
            where: { id: entryId },
            include: {
                round: true,
            },
        });
        if (!dbEntry || dbEntry.claimed) {
            return false;
        }
        return dbEntry.round.status === 'CANCELLED' && !!dbEntry.onchainAddress;
    }
}
