/**
 * RAG Controller
 * Knowledge base management
 */

import { Request, Response } from 'express';
import { retrieveContext } from '../services/rag/rag.interface';

export class RAGController {
  /**
   * Search knowledge base
   */
  async search(req: Request, res: Response): Promise<void> {
    try {
      const { question, query, intent, topic, tokenBudget } = req.body;

      const searchResult = await retrieveContext({
        question: question || query, // Support both
        intent: intent || 'question', // Default intent
        topic: topic,
        tokenBudget: tokenBudget
      });

      res.json(searchResult);
    } catch (error) {
      console.error('RAG search error:', error);
      res.status(500).json({
        error: 'Search failed',
        code: 'SEARCH_ERROR',
      });
    }
  }

  /**
   * Re-ingest knowledge base - DEPRECATED/DISABLED
   */
  async ingest(_req: Request, res: Response): Promise<void> {
    res.status(410).json({
      error: 'Ingestion is disabled in this environment.',
      code: 'INGESTION_DISABLED'
    });
  }

  /**
   * Get Pinecone stats - DEPRECATED/DISABLED
   */
  async getStats(_req: Request, res: Response): Promise<void> {
    // Stats collection not implemented in simple client
    res.json({
      success: true,
      data: {
        message: "Stats not available in this configuration"
      }
    });
  }
}

export const ragController = new RAGController();
