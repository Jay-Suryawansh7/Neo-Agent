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
  lastUpdated?: string;
  chunkIndex?: number;
  totalChunks?: number;
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
   * Get or create index
   */
  async getIndex() {
    return this.client.index(this.indexName);
  }

  /**
   * Initialize index (run once during setup)
   */
  async initializeIndex(): Promise<void> {
    try {
      const indexList = await this.client.listIndexes();
      const indexExists = indexList.indexes?.some(idx => idx.name === this.indexName);

      if (!indexExists) {
        console.log(`Creating Pinecone index: ${this.indexName}`);
        await this.client.createIndex({
          name: this.indexName,
          dimension: 384, // For all-MiniLM-L6-v2 model
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-west-2'
            }
          }
        });
        console.log('✅ Pinecone index created');
      } else {
        console.log('✅ Pinecone index already exists');
      }
    } catch (error) {
      console.error('Pinecone initialization error:', error);
      throw error;
    }
  }

  /**
   * Upsert vectors with metadata
   */
  async upsertVectors(vectors: Array<{
    id: string;
    values: number[];
    metadata: VectorMetadata;
  }>): Promise<void> {
    try {
      const index = await this.getIndex();
      
      // Batch upsert in chunks of 100
      const batchSize = 100;
      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        await index.upsert(batch);
        console.log(`Upserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vectors.length / batchSize)}`);
      }

      console.log(`✅ Upserted ${vectors.length} vectors to Pinecone`);
    } catch (error) {
      console.error('Pinecone upsert error:', error);
      throw error;
    }
  }

  /**
   * Search for similar vectors
   */
  async search(params: {
    queryVector: number[];
    topK?: number;
    filter?: Record<string, any>;
  }): Promise<RAGSource[]> {
    try {
      const index = await this.getIndex();
      const topK = params.topK || config.ragTopK;

      const results = await index.query({
        vector: params.queryVector,
        topK,
        includeMetadata: true,
        filter: params.filter,
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
      throw error;
    }
  }

  /**
   * Delete all vectors (for re-ingestion)
   */
  async deleteAll(): Promise<void> {
    try {
      const index = await this.getIndex();
      await index.deleteAll();
      console.log('✅ Deleted all vectors from Pinecone');
    } catch (error) {
      console.error('Pinecone delete error:', error);
      throw error;
    }
  }

  /**
   * Get index stats
   */
  async getStats() {
    try {
      const index = await this.getIndex();
      const stats = await index.describeIndexStats();
      return stats;
    } catch (error) {
      console.error('Pinecone stats error:', error);
      throw error;
    }
  }
}

export const pineconeService = new PineconeService();
