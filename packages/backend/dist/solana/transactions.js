/**
 * Transaction Builders
 *
 * Utilities to construct transactions for each lotto instruction.
 */
import { SystemProgram, } from '@solana/web3.js';
import BN from 'bn.js';
import { findRoundPda, findTreasuryPda, findTreasuryVaultPda, findEntryPda } from './pdas.js';
/**
 * Build initialize_round transaction
 */
export async function buildInitializeRoundTx(program, authority, args) {
    const programId = program.programId;
    const [roundPda] = findRoundPda(authority, args.roundId, programId);
    const [treasuryPda] = findTreasuryPda(authority, programId);
    const [treasuryVaultPda] = findTreasuryVaultPda(authority, programId);
    const tx = await program.methods
        .initializeRound({
        roundId: new BN(args.roundId.toString()),
        ticketPriceLamports: new BN(args.ticketPriceLamports.toString()),
        maxEntries: args.maxEntries,
        durationSlots: new BN(args.durationSlots.toString()),
        retainedBps: args.retainedBps,
    })
        .accounts({
        authority,
        round: roundPda,
        treasury: treasuryPda,
        treasuryVault: treasuryVaultPda,
        systemProgram: SystemProgram.programId,
    })
        .transaction();
    return tx;
}
/**
 * Build join_round transaction
 */
export async function buildJoinRoundTx(program, entrant, roundPda, args, authority) {
    const programId = program.programId;
    const [treasuryPda] = findTreasuryPda(authority, programId);
    const [treasuryVaultPda] = findTreasuryVaultPda(authority, programId);
    const [entryPda] = findEntryPda(roundPda, entrant, args.nonce, programId);
    const tx = await program.methods
        .joinRound({
        tickets: args.tickets,
        nonce: args.nonce,
    })
        .accounts({
        entrant,
        round: roundPda,
        treasury: treasuryPda,
        treasuryVault: treasuryVaultPda,
        entry: entryPda,
        systemProgram: SystemProgram.programId,
    })
        .transaction();
    return tx;
}
/**
 * Build settle_round transaction
 */
export async function buildSettleRoundTx(program, authority, roundPda, winningEntryPda) {
    const programId = program.programId;
    const [treasuryPda] = findTreasuryPda(authority, programId);
    const tx = await program.methods
        .settleRound()
        .accounts({
        authority,
        round: roundPda,
        treasury: treasuryPda,
        winningEntry: winningEntryPda,
    })
        .transaction();
    return tx;
}
/**
 * Build claim_payout transaction
 */
export async function buildClaimPayoutTx(program, winner, roundPda, authority) {
    const programId = program.programId;
    const [treasuryPda] = findTreasuryPda(authority, programId);
    const [treasuryVaultPda] = findTreasuryVaultPda(authority, programId);
    const tx = await program.methods
        .claimPayout()
        .accounts({
        winner,
        round: roundPda,
        treasury: treasuryPda,
        treasuryVault: treasuryVaultPda,
        systemProgram: SystemProgram.programId,
    })
        .transaction();
    return tx;
}
/**
 * Build claim_refund transaction
 */
export async function buildClaimRefundTx(program, entrant, roundPda, entryPda, authority) {
    const programId = program.programId;
    const [treasuryPda] = findTreasuryPda(authority, programId);
    const [treasuryVaultPda] = findTreasuryVaultPda(authority, programId);
    const tx = await program.methods
        .claimRefund()
        .accounts({
        entrant,
        round: roundPda,
        treasury: treasuryPda,
        treasuryVault: treasuryVaultPda,
        entry: entryPda,
        systemProgram: SystemProgram.programId,
    })
        .transaction();
    return tx;
}
/**
 * Build admin_close transaction
 */
export async function buildAdminCloseTx(program, authority, roundPda, reason) {
    const tx = await program.methods
        .adminClose(reason)
        .accounts({
        authority,
        round: roundPda,
    })
        .transaction();
    return tx;
}
/**
 * Sign and send a transaction
 */
export async function signAndSendTransaction(connection, transaction, signers) {
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    transaction.feePayer = signers[0].publicKey;
    transaction.sign(...signers);
    const signature = await connection.sendRawTransaction(transaction.serialize());
    await connection.confirmTransaction(signature, 'confirmed');
    return signature;
}
