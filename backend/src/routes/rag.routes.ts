/**
 * RAG Routes
 * /api/rag endpoints
 */

import { Router } from 'express';
import { ragController } from '../controllers/rag.controller';
import { strictRateLimiter } from '../middleware/rate-limit';
import { validateRequest, ragSearchSchema } from '../middleware/validation';

const router = Router();

// POST /api/rag/search - Search knowledge base
router.post(
  '/search',
  validateRequest(ragSearchSchema),
  (req, res) => ragController.search(req, res)
);

// POST /api/rag/ingest - Re-ingest knowledge base (admin only)
router.post(
  '/ingest',
  strictRateLimiter,
  (req, res) => ragController.ingest(req, res)
);

// GET /api/rag/stats - Get Pinecone stats
router.get('/stats', (req, res) => ragController.getStats(req, res));

export default router;
