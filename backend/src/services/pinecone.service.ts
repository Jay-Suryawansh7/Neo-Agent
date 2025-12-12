/**
 * Pinecone Service
 * Vector database operations for RAG
 */

import { Pinecone } from '@pinecone-database/pinecone';
import config from '../config';
import { RAGSource } from '../../../shared/types';

interface VectorMetadata extends Record<string, any> {
  content: string;
  source: string;
  category: string;
  title?: string;
}

class PineconeService {
  private client: Pinecone;
  private indexName: string;

  constructor() {
    this.client = new Pinecone({
      apiKey: config.pineconeApiKey,
    });
    this.indexName = config.pineconeIndexName;
  }

  /**
   * Query Pinecone for similar vectors
   */
  async queryPinecone(vector: number[], topK: number = 5, filter?: Record<string, any>): Promise<RAGSource[]> {
    try {
      const index = this.client.index(this.indexName);

      const results = await index.query({
        vector: vector,
        topK: topK,
        filter: filter,
        includeMetadata: true,
      });

      return results.matches?.map(match => {
        const metadata = match.metadata as VectorMetadata | undefined;
        return {
          content: metadata?.content || '',
          source: metadata?.source || 'unknown',
          category: metadata?.category || 'general',
          score: match.score || 0,
        };
      }) || [];
    } catch (error) {
      console.error('Pinecone search error:', error);
      return []; // Return empty on error to prevent crashing
    }
  }
}

export const pineconeService = new PineconeService();
