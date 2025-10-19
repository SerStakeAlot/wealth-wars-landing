#!/usr/bin/env node
/**
 * Backend Service Starter
 *
 * Main entry point for running the backend services.
 * Handles initialization, startup, and graceful shutdown.
 */
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { ServiceManager } from './services/service-manager.js';
async function main() {
    console.log('='.repeat(60));
    console.log('Wealth Wars Backend Service');
    console.log('='.repeat(60));
    // Load authority keypair from environment
    const authoritySecretKey = process.env.AUTHORITY_SECRET_KEY;
    if (!authoritySecretKey) {
        throw new Error('AUTHORITY_SECRET_KEY environment variable not set');
    }
    let authorityKeypair;
    try {
        // Try base58 format first
        const secretKeyBytes = bs58.decode(authoritySecretKey);
        authorityKeypair = Keypair.fromSecretKey(secretKeyBytes);
    }
    catch {
        try {
            // Try JSON array format
            const secretKeyBytes = new Uint8Array(JSON.parse(authoritySecretKey));
            authorityKeypair = Keypair.fromSecretKey(secretKeyBytes);
        }
        catch (error) {
            throw new Error('Invalid AUTHORITY_SECRET_KEY format. Use base58 or JSON array.');
        }
    }
    console.log('Authority:', authorityKeypair.publicKey.toBase58());
    console.log('RPC URL:', process.env.SOLANA_RPC_URL || 'http://127.0.0.1:8899');
    console.log('Database:', process.env.DATABASE_URL ? '✓ Configured' : '✗ Not configured');
    console.log('='.repeat(60));
    // Create service manager
    const manager = new ServiceManager({
        authorityKeypair,
        enableHealthMonitor: true,
        healthCheckIntervalMs: 30000, // 30 seconds
    });
    try {
        // Start all services
        await manager.start();
        console.log('\n✅ Backend services are running!');
        console.log('Press Ctrl+C to stop\n');
        // Keep the process alive
        await new Promise(() => { }); // Never resolves
    }
    catch (error) {
        console.error('\n❌ Failed to start services:', error);
        process.exit(1);
    }
}
// Run the main function
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
