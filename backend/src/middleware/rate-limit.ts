/**
 * Rate Limiting Middleware
 * Protect against abuse and spam
 */

import rateLimit from 'express-rate-limit';
import config from '../config';

export const chatRateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (_req) => {
    // Skip rate limiting in development
    return config.nodeEnv === 'development';
  },
});

export const strictRateLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    error: 'Rate limit exceeded for this endpoint.',
    code: 'STRICT_RATE_LIMIT',
  },
});
