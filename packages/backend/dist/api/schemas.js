/**
 * API Request/Response Validation Schemas
 *
 * Type-safe validation for all lotto API endpoints using Zod.
 */
import { z } from 'zod';
// ============================================================================
// User Schemas
// ============================================================================
export const CreateWebUserSchema = z.object({
    wallet: z.string().min(32).max(44), // Solana wallet address
    username: z.string().min(1).max(50).trim(),
});
export const CreateTelegramUserSchema = z.object({
    telegramId: z.string(),
    username: z.string().optional(),
});
// ============================================================================
// Round Schemas
// ============================================================================
export const CreateRoundSchema = z.object({
    ticketPriceLamports: z.string().or(z.number()).transform(val => BigInt(val)),
    maxEntries: z.number().int().min(0).default(0), // 0 = unlimited
    durationSlots: z.string().or(z.number()).transform(val => BigInt(val)),
    retainedBps: z.number().int().min(0).max(10000).default(500), // 500 = 5%
});
export const JoinRoundWebSchema = z.object({
    wallet: z.string().min(32).max(44),
    username: z.string().min(1).max(50).trim(),
});
export const JoinRoundTelegramSchema = z.object({
    telegramId: z.string(),
    username: z.string().optional(),
});
export const SettleRoundSchema = z.object({
    roundId: z.string().cuid(),
});
export const ClaimSchema = z.object({
    entryId: z.string().cuid(),
    wallet: z.string().min(32).max(44),
});
// ============================================================================
// Admin Authentication
// ============================================================================
export const AdminAuthSchema = z.object({
    authorization: z.string().startsWith('Bearer '),
});
// ============================================================================
// Query Parameters
// ============================================================================
export const PaginationSchema = z.object({
    page: z.string().transform(Number).pipe(z.number().int().min(1)).default('1'),
    limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).default('20'),
});
export const RoundFilterSchema = z.object({
    status: z.enum(['OPEN', 'CLOSED', 'SETTLED', 'CANCELLED']).optional(),
});
