/**
 * Solana RPC Connection Manager
 *
 * Provides a configured connection to the Solana cluster with retry logic
 * and connection health monitoring.
 */
import { Connection } from '@solana/web3.js';
/**
 * Create a Solana connection with sensible defaults
 */
export function createConnection(config) {
    const { rpcUrl, commitment = 'confirmed', confirmTransactionInitialTimeout = 60000, } = config;
    return new Connection(rpcUrl, {
        commitment,
        confirmTransactionInitialTimeout,
    });
}
/**
 * Test connection health
 */
export async function checkConnection(connection) {
    try {
        const version = await connection.getVersion();
        console.log('[connection] RPC version:', version);
        return true;
    }
    catch (error) {
        console.error('[connection] Health check failed:', error);
        return false;
    }
}
/**
 * Get detailed connection health information
 */
export async function getConnectionHealth(connection) {
    const [version, slot, blockHeight] = await Promise.all([
        connection.getVersion(),
        connection.getSlot(),
        connection.getBlockHeight(),
    ]);
    return { version, slot, blockHeight };
}
/**
 * Get connection from environment variables
 */
export function getConnectionFromEnv() {
    const rpcUrl = process.env.SOLANA_RPC_URL || 'http://127.0.0.1:8899';
    const commitment = (process.env.SOLANA_COMMITMENT || 'confirmed');
    console.log(`[connection] Connecting to ${rpcUrl} (${commitment})`);
    return createConnection({
        rpcUrl,
        commitment,
    });
}
