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
        });
        if (existing) {
            // Update username if different
            if (existing.username !== username.trim()) {
                const updated = await this.prisma.user.update({
                    where: { wallet },
                    data: { username: username.trim() },
                });
                return this.toUserInfo(updated, 'web');
            }
            return this.toUserInfo(existing, 'web');
        }
        // Create new web user
        const user = await this.prisma.user.create({
            data: {
                wallet,
                username: username.trim(),
            },
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
        });
        if (!user) {
            // Create new Telegram user
            user = await this.prisma.user.create({
                data: {
                    telegramId,
                    username: username.startsWith('@') ? username : `@${username}`,
                },
            });
        }
        else {
            // Update username if changed
            const newUsername = username.startsWith('@') ? username : `@${username}`;
            if (user.username !== newUsername) {
                user = await this.prisma.user.update({
                    where: { id: user.id },
                    data: { username: newUsername },
                });
            }
        }
        return this.toUserInfo(user, 'telegram');
    }
    /**
     * Get user by ID
     */
    async getUserById(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
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
        });
        return user ? this.toUserInfo(user, 'web') : null;
    }
    /**
     * Get user by Telegram ID (bot users)
     */
    async getUserByTelegram(telegramId) {
        const user = await this.prisma.user.findUnique({
            where: { telegramId },
        });
        return user ? this.toUserInfo(user, 'telegram') : null;
    }
    /**
     * Check if username is available
     */
    async isUsernameAvailable(username) {
        const existing = await this.prisma.user.findFirst({
            where: { username: username.trim() },
        });
        return !existing;
    }
    /**
     * Convert database user to UserInfo
     */
    toUserInfo(user, source) {
        return {
            id: user.id,
            wallet: user.wallet,
            telegramId: user.telegramId,
            username: user.username,
            source,
        };
    }
}
