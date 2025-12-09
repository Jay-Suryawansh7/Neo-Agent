/**
 * Chat Routes
 * /api/chat endpoints
 */

import { Router } from 'express';
import { chatController } from '../controllers/chat.controller';
import { chatRateLimiter } from '../middleware/rate-limit';
import { validateRequest, chatMessageSchema } from '../middleware/validation';

const router = Router();

// POST /api/chat - Send message and get streaming response
router.post(
  '/',
  chatRateLimiter,
  validateRequest(chatMessageSchema),
  (req, res) => chatController.chat(req, res)
);

// GET /api/chat/history - Get chat history
router.get('/history', (req, res) => chatController.getHistory(req, res));

// DELETE /api/chat/history - Clear chat history
router.delete('/history', (req, res) => chatController.clearHistory(req, res));

export default router;
