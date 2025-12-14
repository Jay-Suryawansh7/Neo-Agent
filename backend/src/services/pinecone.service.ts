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
   * Get or create the Pinecone index
   */
  private async getIndex() {
    try {
      const indexList = await this.client.listIndexes();
      const indexExists = indexList.indexes?.some(idx => idx.name === this.indexName);

      if (!indexExists) {
        console.log(`Creating Pinecone index: ${this.indexName}`);
        await this.client.createIndex({
          name: this.indexName,
          dimension: 1024, // BGE-M3 dimension
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: config.pineconeRegion // Uses local config
            }
          }
        });
        console.log('✅ Pinecone index created');
        
        // Wait a brief moment for propagation if needed, though usually not blocking for long
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
      return this.client.index(this.indexName);
    } catch (error) {
      console.error('Error getting Pinecone index:', error);
      throw error;
    }
  }

  /**
   * Initialize the index (public wrapper)
   */
  async initializeIndex(): Promise<void> {
    await this.getIndex();
  }

  /**
   * Get index statistics
   */
  async getStats(): Promise<any> {
    try {
      const index = await this.getIndex();
      // describeIndexStats is the standard method, but check sdk version if needed.
      // Assuming standard pinecone client usage.
      return await index.describeIndexStats();
    } catch (error) {
      console.error('Error getting index stats:', error);
      return {};
    }
  }

  /**
   * Query Pinecone for similar vectors
   */
  async queryPinecone(vector: number[], topK: number = 5, filter?: Record<string, any>): Promise<RAGSource[]> {
    try {
      const index = await this.getIndex();

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
      return []; 
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
   * Search for similar vectors (Structured Input)
   */
  async search(params: {
    queryVector: number[];
    topK?: number;
    filter?: Record<string, any>;
  }): Promise<RAGSource[]> {
    return this.queryPinecone(params.queryVector, params.topK || config.ragTopK, params.filter);
  }
}

export const pineconeService = new PineconeService();
