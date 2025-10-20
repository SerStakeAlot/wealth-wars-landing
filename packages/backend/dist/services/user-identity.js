/**
 * User Identity Service
 *
 * Simple unified user system:
 * - Telegram users: use @username from Telegram
 * - Web users: connect wallet + choose username
 * - Both play the same lotto game
 */
import { PublicKey } from '@solana/web3.js';
export class UserIdentityService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    /**
     * Create or get web user (wallet + username)
     * Used when user connects wallet on website and enters a username
     */
    async createWebUser(wallet, username) {
        // Validate wallet
        try {
            new PublicKey(wallet);
        }
        catch {
            throw new Error('Invalid wallet address');
        }
        // Validate username
        if (!username || username.trim().length === 0) {
            throw new Error('Username is required');
        }
        if (username.length > 50) {
            throw new Error('Username too long (max 50 characters)');
        }
        // Check if wallet already exists
        const existing = await this.prisma.user.findUnique({
            where: { wallet },
            select: { id: true, wallet: true, telegramId: true, username: true },
        });
        if (existing) {
            // Skip username updates to tolerate DBs missing the column
            return this.toUserInfo(existing, 'web');
        }
        // Create new web user (avoid username column)
        const user = await this.prisma.user.create({
            data: { wallet, username },
            select: { id: true, wallet: true, telegramId: true, username: true },
        });
        return this.toUserInfo(user, 'web');
    }
    /**
     * Get or create Telegram user
     * Used by the bot
     */
    async getOrCreateTelegramUser(telegramId, username) {
        // Check if user exists
        let user = await this.prisma.user.findUnique({
            where: { telegramId },
            select: { id: true, wallet: true, telegramId: true, username: true },
        });
        if (!user) {
            // Create new Telegram user without touching username
            user = await this.prisma.user.create({
                data: { telegramId, username },
                select: { id: true, wallet: true, telegramId: true, username: true },
            });
        }
        else {
            // Skip username updates; DB may not have the column
        }
        return this.toUserInfo(user, 'telegram');
    }
    /**
     * Get user by ID
     */
    async getUserById(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, wallet: true, telegramId: true, username: true },
        });
        if (!user)
            return null;
        const source = user.telegramId ? 'telegram' : 'web';
        return this.toUserInfo(user, source);
    }
    /**
     * Get user by wallet (web users)
     */
    async getUserByWallet(wallet) {
        const user = await this.prisma.user.findUnique({
            where: { wallet },
            select: { id: true, wallet: true, telegramId: true, username: true },
        });
        return user ? this.toUserInfo(user, 'web') : null;
    }
    /**
     * Get user by Telegram ID (bot users)
     */
    async getUserByTelegram(telegramId) {
        const user = await this.prisma.user.findUnique({
            where: { telegramId },
            select: { id: true, wallet: true, telegramId: true, username: true },
        });
        return user ? this.toUserInfo(user, 'telegram') : null;
    }
    /**
     * Check if username is available
     */
    async isUsernameAvailable(username) {
        try {
            const existing = await this.prisma.user.findFirst({
                where: { username: username.trim() },
            });
            return !existing;
        }
        catch (err) {
            // If legacy DB is missing the column, treat as available to avoid P2022 crashes
            if ((err === null || err === void 0 ? void 0 : err.code) === 'P2022' || /users\.username/.test(String((err === null || err === void 0 ? void 0 : err.message) || ''))) {
                return true;
            }
            throw err;
        }
    }
    /**
     * Convert database user to UserInfo
     */
    toUserInfo(user, source) {
        const fallbackUsername = (user?.telegramId)
            ? `@${user.telegramId}`
            : `user_${(user?.id || 'unknown').toString().slice(0, 8)}`;
        return {
            id: user.id,
            wallet: user.wallet,
            telegramId: user.telegramId,
            username: user.username || fallbackUsername,
            source,
        };
    }
}
