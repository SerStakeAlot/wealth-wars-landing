/**
 * Service Manager
 *
 * Manages the lifecycle of all backend services with graceful shutdown
 * and error recovery.
 */
import { PrismaClient } from '@prisma/client';
import { getConnectionFromEnv } from '../solana/connection.js';
import { createLottoProgram } from '../solana/program.js';
import { initializeLottoServices } from './lotto/index.js';
import { HealthMonitor } from './health-monitor.js';
export class ServiceManager {
    config;
    connection = null;
    prisma = null;
    lottoServices = null;
    healthMonitor = null;
    isRunning = false;
    shutdownHandlers = [];
    constructor(config) {
        this.config = config;
    }
    /**
     * Initialize all services
     */
    async start() {
        if (this.isRunning) {
            console.log('[ServiceManager] Already running');
            return;
        }
        console.log('[ServiceManager] Starting services...');
        try {
            // 1. Initialize database
            console.log('[ServiceManager] Connecting to database...');
            this.prisma = new PrismaClient({
                log: ['error', 'warn'],
            });
            await this.prisma.$connect();
            console.log('[ServiceManager] ✓ Database connected');
            // 2. Initialize Solana connection
            console.log('[ServiceManager] Connecting to Solana RPC...');
            this.connection = getConnectionFromEnv();
            const version = await this.connection.getVersion();
            console.log('[ServiceManager] ✓ Solana RPC connected:', version);
            // 3. Initialize Lotto program and services
            console.log('[ServiceManager] Initializing lotto services...');
            const program = createLottoProgram(this.connection, this.config.authorityKeypair);
            console.log('[ServiceManager] ✓ Program loaded:', program.programId.toBase58());
            this.lottoServices = await initializeLottoServices(this.connection, this.config.authorityKeypair, this.prisma);
            console.log('[ServiceManager] ✓ Lotto services initialized');
            // 4. Start health monitoring
            if (this.config.enableHealthMonitor !== false) {
                console.log('[ServiceManager] Starting health monitor...');
                this.healthMonitor = new HealthMonitor(this.connection, program, this.prisma, this.config.healthCheckIntervalMs);
                this.healthMonitor.start();
                console.log('[ServiceManager] ✓ Health monitor started');
            }
            // 5. Setup graceful shutdown
            this.setupGracefulShutdown();
            this.isRunning = true;
            console.log('[ServiceManager] ✅ All services started successfully');
        }
        catch (error) {
            console.error('[ServiceManager] Failed to start services:', error);
            await this.stop();
            throw error;
        }
    }
    /**
     * Gracefully shut down all services
     */
    async stop() {
        if (!this.isRunning) {
            console.log('[ServiceManager] Not running');
            return;
        }
        console.log('[ServiceManager] Shutting down services...');
        this.isRunning = false;
        // Stop health monitor
        if (this.healthMonitor) {
            this.healthMonitor.stop();
            this.healthMonitor = null;
        }
        // Run custom shutdown handlers
        for (const handler of this.shutdownHandlers) {
            try {
                await handler();
            }
            catch (error) {
                console.error('[ServiceManager] Shutdown handler error:', error);
            }
        }
        // Disconnect database
        if (this.prisma) {
            try {
                await this.prisma.$disconnect();
                console.log('[ServiceManager] ✓ Database disconnected');
            }
            catch (error) {
                console.error('[ServiceManager] Database disconnect error:', error);
            }
            this.prisma = null;
        }
        this.connection = null;
        this.lottoServices = null;
        console.log('[ServiceManager] ✅ All services stopped');
    }
    /**
     * Restart all services
     */
    async restart() {
        console.log('[ServiceManager] Restarting services...');
        await this.stop();
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        await this.start();
    }
    /**
     * Get the initialized services
     */
    getServices() {
        if (!this.isRunning || !this.prisma || !this.connection || !this.lottoServices) {
            throw new Error('Services not initialized. Call start() first.');
        }
        return {
            prisma: this.prisma,
            connection: this.connection,
            lottoServices: this.lottoServices,
            healthMonitor: this.healthMonitor,
        };
    }
    /**
     * Check if services are running
     */
    isReady() {
        return this.isRunning;
    }
    /**
     * Register a custom shutdown handler
     */
    onShutdown(handler) {
        this.shutdownHandlers.push(handler);
    }
    /**
     * Setup graceful shutdown handlers for process signals
     */
    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            console.log(`\n[ServiceManager] Received ${signal}, shutting down gracefully...`);
            await this.stop();
            process.exit(0);
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
        // Handle uncaught errors
        process.on('uncaughtException', async (error) => {
            console.error('[ServiceManager] Uncaught exception:', error);
            await this.stop();
            process.exit(1);
        });
        process.on('unhandledRejection', async (reason, promise) => {
            console.error('[ServiceManager] Unhandled rejection at:', promise, 'reason:', reason);
            await this.stop();
            process.exit(1);
        });
    }
}
/**
 * Helper function to create and start a service manager
 */
export async function startServices(config) {
    const manager = new ServiceManager(config);
    await manager.start();
    return manager;
}
