/**
 * Validation Middleware
 * Input validation and sanitization
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export function validateRequest(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body);

    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        code: 'VALIDATION_ERROR',
        details: error.details.map(d => d.message),
      });
    }

    req.body = value;
    return next();
  };
}

// Common validation schemas
export const chatMessageSchema = Joi.object({
  message: Joi.string().required().min(1).max(5000).trim(),
  sessionId: Joi.string().uuid().optional(),
});

export const ragSearchSchema = Joi.object({
  query: Joi.string().required().min(1).max(500).trim(),
  topK: Joi.number().integer().min(1).max(20).optional(),
  category: Joi.string().optional(),
});

/**
 * Sanitize user input to prevent injection attacks
 */
export function sanitizeInput(input: string): string {
  // Remove potentially dangerous patterns
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

/**
 * Detect prompt injection attempts
 */
export function detectPromptInjection(input: string): boolean {
  const injectionPatterns = [
    /ignore\s+(previous|all)\s+instructions?/i,
    /system\s+prompt/i,
    /you\s+are\s+now/i,
    /forget\s+(everything|all)/i,
    /new\s+instructions?:/i,
    /override\s+your/i,
  ];

  return injectionPatterns.some(pattern => pattern.test(input));
}
