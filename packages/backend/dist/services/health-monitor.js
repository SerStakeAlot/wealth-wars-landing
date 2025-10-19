/**
 * Health Monitor Service
 *
 * Monitors the health of all system components and provides status endpoints.
 */
import { checkConnection, getConnectionHealth } from '../solana/index.js';
export class HealthMonitor {
    connection;
    program;
    prisma;
    checkIntervalMs;
    startTime;
    lastHealthCheck = null;
    checkInterval = null;
    constructor(connection, program, prisma, checkIntervalMs = 30000 // 30 seconds
    ) {
        this.connection = connection;
        this.program = program;
        this.prisma = prisma;
        this.checkIntervalMs = checkIntervalMs;
        this.startTime = new Date();
    }
    /**
     * Start automated health checks
     */
    start() {
        console.log('[HealthMonitor] Starting automated health checks');
        // Initial check
        this.performHealthCheck().catch(err => {
            console.error('[HealthMonitor] Initial health check failed:', err);
        });
        // Periodic checks
        this.checkInterval = setInterval(() => {
            this.performHealthCheck().catch(err => {
                console.error('[HealthMonitor] Health check failed:', err);
            });
        }, this.checkIntervalMs);
    }
    /**
     * Stop automated health checks
     */
    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
            console.log('[HealthMonitor] Stopped automated health checks');
        }
    }
    /**
     * Perform a complete health check
     */
    async performHealthCheck() {
        const timestamp = new Date();
        // Check Solana RPC
        const solanaHealth = await this.checkSolana();
        // Check Database
        const databaseHealth = await this.checkDatabase();
        // Check Program
        const programHealth = await this.checkProgram();
        // Determine overall status
        let status = 'healthy';
        if (solanaHealth.status === 'unhealthy' || databaseHealth.status === 'unhealthy') {
            status = 'unhealthy';
        }
        else if (programHealth.status === 'unhealthy') {
            status = 'degraded';
        }
        const health = {
            status,
            timestamp,
            components: {
                solana: solanaHealth,
                database: databaseHealth,
                program: programHealth,
            },
            uptime: Date.now() - this.startTime.getTime(),
        };
        this.lastHealthCheck = health;
        if (status !== 'healthy') {
            console.warn('[HealthMonitor] System status:', status, health.components);
        }
        return health;
    }
    /**
     * Get the last health check result
     */
    getLastHealthCheck() {
        return this.lastHealthCheck;
    }
    /**
     * Check Solana RPC connection
     */
    async checkSolana() {
        try {
            const isHealthy = await checkConnection(this.connection);
            if (!isHealthy) {
                return {
                    status: 'unhealthy',
                    message: 'Solana RPC not responding',
                    lastCheck: new Date(),
                };
            }
            const details = await getConnectionHealth(this.connection);
            return {
                status: 'healthy',
                message: 'Solana RPC connected',
                lastCheck: new Date(),
                details,
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                message: `Solana check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                lastCheck: new Date(),
            };
        }
    }
    /**
     * Check database connection
     */
    async checkDatabase() {
        try {
            // Simple query to check connection
            await this.prisma.$queryRaw `SELECT 1`;
            return {
                status: 'healthy',
                message: 'Database connected',
                lastCheck: new Date(),
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                message: `Database check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                lastCheck: new Date(),
            };
        }
    }
    /**
     * Check program deployment
     */
    async checkProgram() {
        try {
            const programId = this.program.programId;
            const accountInfo = await this.connection.getAccountInfo(programId);
            if (!accountInfo) {
                return {
                    status: 'unhealthy',
                    message: 'Program not deployed',
                    lastCheck: new Date(),
                };
            }
            if (!accountInfo.executable) {
                return {
                    status: 'unhealthy',
                    message: 'Program account is not executable',
                    lastCheck: new Date(),
                };
            }
            return {
                status: 'healthy',
                message: 'Program deployed',
                lastCheck: new Date(),
                details: {
                    programId: programId.toBase58(),
                    owner: accountInfo.owner.toBase58(),
                    lamports: accountInfo.lamports,
                },
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                message: `Program check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                lastCheck: new Date(),
            };
        }
    }
    /**
     * Wait for system to become healthy
     */
    async waitForHealthy(timeoutMs = 60000) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeoutMs) {
            const health = await this.performHealthCheck();
            if (health.status === 'healthy') {
                return true;
            }
            // Wait 2 seconds before next check
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        return false;
    }
}
