/**
 * PDA (Program Derived Address) Utilities
 *
 * Functions to derive PDAs matching the on-chain program's seed constants.
 */
import { PublicKey } from '@solana/web3.js';
// Seed constants must match programs/lotto/src/lib.rs
const ROUND_SEED = Buffer.from('round');
const ENTRY_SEED = Buffer.from('entry');
const TREASURY_SEED = Buffer.from('treasury');
const TREASURY_VAULT_SEED = Buffer.from('treasury_vault');
/**
 * Find Round PDA
 * Seeds: [b"round", authority, round_id (u64 LE)]
 */
export function findRoundPda(authority, roundId, programId) {
    const roundIdBuffer = Buffer.alloc(8);
    roundIdBuffer.writeBigUInt64LE(BigInt(roundId));
    return PublicKey.findProgramAddressSync([ROUND_SEED, authority.toBuffer(), roundIdBuffer], programId);
}
/**
 * Find Treasury PDA
 * Seeds: [b"treasury", authority]
 */
export function findTreasuryPda(authority, programId) {
    return PublicKey.findProgramAddressSync([TREASURY_SEED, authority.toBuffer()], programId);
}
/**
 * Find Treasury Vault PDA
 * Seeds: [b"treasury_vault", authority]
 */
export function findTreasuryVaultPda(authority, programId) {
    return PublicKey.findProgramAddressSync([TREASURY_VAULT_SEED, authority.toBuffer()], programId);
}
/**
 * Find Entry PDA
 * Seeds: [b"entry", round, entrant, nonce (u8)]
 */
export function findEntryPda(round, entrant, nonce, programId) {
    const nonceBuffer = Buffer.from([nonce]);
    return PublicKey.findProgramAddressSync([ENTRY_SEED, round.toBuffer(), entrant.toBuffer(), nonceBuffer], programId);
}
/**
 * Helper to convert round ID to bytes for PDA derivation
 */
export function roundIdToBytes(roundId) {
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64LE(BigInt(roundId));
    return buffer;
}
