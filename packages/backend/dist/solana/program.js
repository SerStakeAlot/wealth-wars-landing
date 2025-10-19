/**
 * Lotto Program Interface
 *
 * Loads the IDL and provides typed access to the Lotto program.
 */
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/**
 * Load the Lotto program IDL from the workspace
 */
export function loadLottoIdl() {
    // IDL is at workspace root: target/idl/lotto.json
    const idlPath = path.join(__dirname, '../../../../target/idl/lotto.json');
    if (!fs.existsSync(idlPath)) {
        throw new Error(`Lotto IDL not found at ${idlPath}. Run 'anchor build' first.`);
    }
    const idlJson = fs.readFileSync(idlPath, 'utf-8');
    return JSON.parse(idlJson);
}
/**
 * Get the program ID from environment or IDL
 */
export function getLottoProgramId() {
    const envProgramId = process.env.LOTTO_PROGRAM_ID;
    if (envProgramId) {
        return new PublicKey(envProgramId);
    }
    // Fall back to IDL address
    const idl = loadLottoIdl();
    if ('address' in idl && typeof idl.address === 'string') {
        return new PublicKey(idl.address);
    }
    throw new Error('LOTTO_PROGRAM_ID not set and not found in IDL');
}
/**
 * Create an Anchor program instance
 */
export function createLottoProgram(connection, wallet) {
    const idl = loadLottoIdl();
    const programId = getLottoProgramId();
    // Create a minimal wallet interface for the provider
    const walletInterface = {
        publicKey: wallet.publicKey,
        signTransaction: async (tx) => {
            tx.partialSign(wallet);
            return tx;
        },
        signAllTransactions: async (txs) => {
            txs.forEach(tx => tx.partialSign(wallet));
            return txs;
        },
    };
    const provider = new AnchorProvider(connection, walletInterface, { commitment: 'confirmed' });
    return new Program(idl, provider);
}
/**
 * Get program info for health checks
 */
export async function getProgramInfo(connection, programId) {
    const accountInfo = await connection.getAccountInfo(programId);
    if (!accountInfo) {
        throw new Error(`Program ${programId.toBase58()} not found`);
    }
    return {
        executable: accountInfo.executable,
        owner: accountInfo.owner.toBase58(),
        lamports: accountInfo.lamports,
    };
}
