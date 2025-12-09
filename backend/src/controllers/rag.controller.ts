/**
 * RAG Controller
 * Knowledge base management
 */

import { Request, Response } from 'express';
import { knowledgeService } from '../services/knowledge.service';
import { pineconeService } from '../services/pinecone.service';

export class RAGController {
  /**
   * Search knowledge base
   */
  async search(req: Request, res: Response): Promise<void> {
    try {
      const { query, topK, category } = req.body;

      const filter = category ? { category } : undefined;
      const results = await knowledgeService.search(query, topK, filter);

      res.json({
        success: true,
        data: {
          query,
          results,
          totalResults: results.length,
        },
      });
    } catch (error) {
      console.error('RAG search error:', error);
      res.status(500).json({
        error: 'Search failed',
        code: 'SEARCH_ERROR',
      });
    }
  }

  /**
   * Re-ingest knowledge base
   */
  async ingest(req: Request, res: Response): Promise<void> {
    try {
      // This is a heavy operation - should be async in production
      await knowledgeService.ingestKnowledge();

      res.json({
        success: true,
        data: {
          message: 'Knowledge base ingested successfully',
        },
      });
    } catch (error) {
      console.error('Ingestion error:', error);
      res.status(500).json({
        error: 'Ingestion failed',
        code: 'INGESTION_ERROR',
      });
    }
  }

  /**
   * Get Pinecone stats
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await pineconeService.getStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Stats error:', error);
      res.status(500).json({
        error: 'Failed to get stats',
        code: 'STATS_ERROR',
      });
    }
  }
}

export const ragController = new RAGController();
