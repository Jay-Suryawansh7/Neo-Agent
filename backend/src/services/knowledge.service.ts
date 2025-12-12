/**
 * Knowledge Service
 * Manages RAG retrieval operations
 */

import { embeddingService } from './embedding.service';
import { pineconeService } from './pinecone.service';
import { RAGSource } from '../../../shared/types';
import config from '../config';

class KnowledgeService {

  /**
   * Search knowledge base using local embeddings and Pinecone
   */
  async search(query: string, topK?: number): Promise<RAGSource[]> {
    try {
      // 1. Generate embedding locally
      const queryEmbedding = await embeddingService.generateEmbedding(query);

      // 2. Search Pinecone
      const results = await pineconeService.queryPinecone(
        queryEmbedding,
        topK || config.ragTopK
      );

      return results;
    } catch (error) {
      console.error('RAG Search failed:', error);
      return [];
    }
  }

  /**
   * Build RAG context from sources
   */
  buildRAGContext(sources: RAGSource[]): string {
    if (sources.length === 0) {
      return '';
    }

    const contextParts: string[] = ['## Retrieved Knowledge:'];

    sources.forEach((source, index) => {
      contextParts.push(`\n### Source ${index + 1}: ${source.source} (Score: ${source.score.toFixed(2)})`);
      contextParts.push(source.content);
    });

    return contextParts.join('\n');
  }
}

export const knowledgeService = new KnowledgeService();
