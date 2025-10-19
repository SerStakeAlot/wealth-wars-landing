/**
 * API Middleware
 *
 * Request validation, authentication, and error handling.
 */
import { z } from 'zod';
// ============================================================================
// Request Validation Middleware
// ============================================================================
/**
 * Validate request body against Zod schema
 */
export function validateBody(schema) {
    return (req, res, next) => {
        try {
            req.body = schema.parse(req.body);
            next();
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation error',
                    details: error.errors.map(e => ({
                        field: e.path.join('.'),
                        message: e.message,
                    })),
                });
            }
            next(error);
        }
    };
}
/**
 * Validate query parameters against Zod schema
 */
export function validateQuery(schema) {
    return (req, res, next) => {
        try {
            req.query = schema.parse(req.query);
            next();
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid query parameters',
                    details: error.errors.map(e => ({
                        field: e.path.join('.'),
                        message: e.message,
                    })),
                });
            }
            next(error);
        }
    };
}
/**
 * Validate route parameters against Zod schema
 */
export function validateParams(schema) {
    return (req, res, next) => {
        try {
            req.params = schema.parse(req.params);
            next();
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid route parameters',
                    details: error.errors.map(e => ({
                        field: e.path.join('.'),
                        message: e.message,
                    })),
                });
            }
            next(error);
        }
    };
}
// ============================================================================
// Authentication Middleware
// ============================================================================
/**
 * Simple admin authentication (Bearer token)
 * In production, use proper JWT or session-based auth
 */
export function requireAdmin(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required',
        });
    }
    const token = authHeader.substring(7);
    const adminToken = process.env.ADMIN_API_TOKEN;
    if (!adminToken) {
        console.error('[Auth] ADMIN_API_TOKEN not configured');
        return res.status(500).json({
            success: false,
            error: 'Server configuration error',
        });
    }
    if (token !== adminToken) {
        return res.status(403).json({
            success: false,
            error: 'Invalid credentials',
        });
    }
    next();
}
// ============================================================================
// Error Handling Middleware
// ============================================================================
/**
 * Global error handler
 */
export function errorHandler(error, req, res, next) {
    console.error('[API Error]', error);
    // Don't send error details in production
    const isDev = process.env.NODE_ENV !== 'production';
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        ...(isDev && { details: error.message, stack: error.stack }),
    });
}
/**
 * Async route handler wrapper (catches promise rejections)
 */
export function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
// ============================================================================
// Response Helpers
// ============================================================================
/**
 * Standard success response
 */
export function successResponse(res, data, status = 200) {
    return res.status(status).json({
        success: true,
        data,
    });
}
/**
 * Standard error response
 */
export function errorResponse(res, error, status = 400) {
    return res.status(status).json({
        success: false,
        error,
    });
}
