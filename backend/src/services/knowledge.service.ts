/**
 * Knowledge Service
 * Manages RAG retrieval operations
 */

import { embeddingService } from './embedding.service';
import { pineconeService } from './pinecone.service';
import { RAGSource } from '../../../shared/types';
import config from '../config';

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

class KnowledgeService {

  /**
   * Ingest knowledge from local files
   */
  async ingestKnowledge(): Promise<void> {
    const knowledgeDir = path.join(__dirname, '../../../knowledge'); // Adjust path to root knowledge dir
    
    if (!fs.existsSync(knowledgeDir)) {
      console.warn(`⚠️ Knowledge directory not found at: ${knowledgeDir}`);
      return;
    }

    const files = fs.readdirSync(knowledgeDir);
    const vectors: any[] = [];

    console.log(`Found ${files.length} files in ${knowledgeDir}`);

    for (const file of files) {
      const filePath = path.join(knowledgeDir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory() || file.startsWith('.')) continue;

      console.log(`Processing ${file}...`);
      
      try {
        if (file.endsWith('.json')) {
          const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          const items = this.extractItemsFromJSON(content);
          
          for (const item of items) {
             const text = this.formatJSONItem(item);
             const embedding = await embeddingService.generateEmbedding(text);
             
             vectors.push({
               id: uuidv4(),
               values: embedding,
               metadata: {
                 content: text,
                 source: file,
                 category: item.category || content.category || 'general',
                 title: item.name || item.title || content.title || file
               }
             });
          }

        } else if (file.endsWith('.md') || file.endsWith('.txt')) {
          const text = fs.readFileSync(filePath, 'utf-8');
          // Simple chunking or full file for small docs
          // For now, treat whole file as one chunk since they are small (< 2KB)
          const embedding = await embeddingService.generateEmbedding(text);
          
          vectors.push({
            id: uuidv4(),
            values: embedding,
            metadata: {
              content: text,
              source: file,
              category: 'docs',
              title: file
            }
          });
        }
      } catch (err) {
        console.error(`Error processing ${file}:`, err);
      }
    }

    if (vectors.length > 0) {
      console.log(`Upserting ${vectors.length} vectors...`);
      await pineconeService.upsertVectors(vectors);
    } else {
      console.log('No new vectors to upsert.');
    }
  }

  private extractItemsFromJSON(json: any): any[] {
    if (Array.isArray(json)) return json;
    
    // Check specific known keys
    if (json.projects && Array.isArray(json.projects)) return json.projects;
    if (json.departments && Array.isArray(json.departments)) return json.departments;
    
    // Fallback: if it has a data or items field
    if (json.data && Array.isArray(json.data)) return json.data;
    if (json.items && Array.isArray(json.items)) return json.items;

    // Treat whole object as one item
    return [json];
  }

  private formatJSONItem(item: any): string {
    // intelligent formatting
    let parts: string[] = [];
    if (item.name) parts.push(`Name: ${item.name}`);
    if (item.title) parts.push(`Title: ${item.title}`);
    if (item.description) parts.push(`Description: ${item.description}`);
    if (item.goal) parts.push(`Goal: ${item.goal}`);
    if (item.tech_stack) parts.push(`Tech Stack: ${Array.isArray(item.tech_stack) ? item.tech_stack.join(', ') : item.tech_stack}`);
    if (item.responsibilities) parts.push(`Responsibilities: ${Array.isArray(item.responsibilities) ? item.responsibilities.join(', ') : item.responsibilities}`);
    
    // If we extracted very little, fall back to stringify
    if (parts.length < 2) {
      return JSON.stringify(item, null, 2);
    }
    
    return parts.join('\n');
  }

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
