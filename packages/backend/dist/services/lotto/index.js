/**
 * Lotto Services
 *
 * Main exports for on-chain lotto functionality.
 */
import { createLottoProgram } from '../../solana/index.js';
export { RoundManager } from './round-manager.js';
export { EntryProcessor } from './entry-processor.js';
export { SettlementService } from './settlement-service.js';
export { ClaimService } from './claim-service.js';
import { RoundManager } from './round-manager.js';
import { EntryProcessor } from './entry-processor.js';
import { SettlementService } from './settlement-service.js';
import { ClaimService } from './claim-service.js';
/**
 * Initialize all lotto services with shared dependencies
 */
export async function initializeLottoServices(connection, authority, prisma) {
    // Load the program
    const program = createLottoProgram(connection, authority);
    // Initialize services
    const roundManager = new RoundManager(program, connection, authority, prisma);
    const entryProcessor = new EntryProcessor(program, connection, authority, prisma);
    const settlementService = new SettlementService(program, connection, authority, prisma);
    const claimService = new ClaimService(program, connection, authority, prisma);
    return {
        roundManager,
        entryProcessor,
        settlementService,
        claimService,
    };
}
