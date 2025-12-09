/**
 * Knowledge Service
 * Manages knowledge base loading, chunking, and RAG operations
 */

import fs from 'fs/promises';
import path from 'path';
import { aiService } from './ai.service';
import { pineconeService } from './pinecone.service';
import { RAGSource } from '../../../shared/types';
import config from '../config';
import { v4 as uuidv4 } from 'uuid';

interface KnowledgeDoc {
  id: string;
  title: string;
  content: string;
  category: string;
  source: string;
}

class KnowledgeService {
  private knowledgeBasePath: string;

  constructor() {
    this.knowledgeBasePath = path.join(__dirname, '../../../knowledge');
  }

  /**
   * Load all knowledge documents
   */
  async loadKnowledgeBase(): Promise<KnowledgeDoc[]> {
    const docs: KnowledgeDoc[] = [];

    try {
      const files = await fs.readdir(this.knowledgeBasePath);

      for (const file of files) {
        const filePath = path.join(this.knowledgeBasePath, file);
        const stats = await fs.stat(filePath);

        if (stats.isFile()) {
          const doc = await this.loadDocument(filePath);
          if (doc) docs.push(doc);
        }
      }

      console.log(`✅ Loaded ${docs.length} knowledge documents`);
      return docs;
    } catch (error) {
      console.error('Error loading knowledge base:', error);
      return [];
    }
  }

  /**
   * Load single document
   */
  private async loadDocument(filePath: string): Promise<KnowledgeDoc | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const fileName = path.basename(filePath);
      const ext = path.extname(fileName);
      const category = fileName.replace(ext, '');

      if (ext === '.json') {
        const json = JSON.parse(content);
        return {
          id: uuidv4(),
          title: json.title || category,
          content: JSON.stringify(json, null, 2),
          category,
          source: fileName,
        };
      } else if (ext === '.md') {
        return {
          id: uuidv4(),
          title: category,
          content,
          category,
          source: fileName,
        };
      }

      return null;
    } catch (error) {
      console.error(`Error loading document ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Chunk text into smaller pieces
   */
  chunkText(text: string, chunkSize?: number, overlap?: number): string[] {
    const size = chunkSize || config.chunkSize;
    const overlapSize = overlap || config.chunkOverlap;

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + size, text.length);
      const chunk = text.slice(start, end);
      chunks.push(chunk);
      start += size - overlapSize;
    }

    return chunks;
  }

  /**
   * Ingest knowledge base into Pinecone
   */
  async ingestKnowledge(): Promise<void> {
    console.log('🔄 Starting knowledge ingestion...');

    const docs = await this.loadKnowledgeBase();
    const vectors: Array<{
      id: string;
      values: number[];
      metadata: any;
    }> = [];

    for (const doc of docs) {
      const chunks = this.chunkText(doc.content);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = await aiService.generateEmbedding(chunk);

        vectors.push({
          id: `${doc.id}-chunk-${i}`,
          values: embedding,
          metadata: {
            content: chunk,
            source: doc.source,
            category: doc.category,
            title: doc.title,
            chunkIndex: i,
            totalChunks: chunks.length,
          },
        });

        console.log(`Processed ${doc.source} chunk ${i + 1}/${chunks.length}`);
      }
    }

    console.log(`📤 Uploading ${vectors.length} vectors to Pinecone...`);
    await pineconeService.upsertVectors(vectors);

    console.log('✅ Knowledge ingestion complete');
  }

  /**
   * Search knowledge base
   */
  async search(query: string, topK?: number, filter?: Record<string, any>): Promise<RAGSource[]> {
    // Generate query embedding
    const queryEmbedding = await aiService.generateEmbedding(query);

    // Search Pinecone
    const results = await pineconeService.search({
      queryVector: queryEmbedding,
      topK: topK || config.ragTopK,
      filter,
    });

    return results;
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
