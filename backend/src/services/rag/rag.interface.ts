/**
 * RAG Interface
 * Main entry point for RAG operations
 */

import { embeddingService } from '../embedding.service';
import { pineconeService } from '../pinecone.service';
import { buildFilters } from './filters';
import { rankResults } from './ranker';
import { diversify } from './diversity';
import { trimToTokenBudget } from './utils';

export interface RAGQuery {
    question: string;
    intent: string;
    topic?: string;
    tokenBudget?: number;
}

/**
 * Retrieve Context
 * Orchestrates the full RAG pipeline
 */
export async function retrieveContext(query: RAGQuery) {
    const { question, intent, topic, tokenBudget = 2000 } = query;

    console.log(`🔍 RAG Search: "${question}" (Intent: ${intent}, Topic: ${topic})`);

    try {
        // a) Determine filters
        const filters = buildFilters(intent, topic);
        console.log('👉 Filters:', JSON.stringify(filters));

        // b) Generate local embedding
        const queryEmbedding = await embeddingService.generateEmbedding(question);

        // c) Query Pinecone index with filters + embedding
        // Fetch more than needed to allow for reranking and diversity filtering
        const initialTopK = 20;
        const rawResults = await pineconeService.queryPinecone(queryEmbedding, initialTopK, filters);
        console.log(`📥 Retrieved ${rawResults.length} raw results from Pinecone`);

        // d) Load full text for each match
        // Note: pineconeService already returns { content, ... } from metadata.
        // So 'loading' is implicitly done. We just ensure it's there.

        // e) Rerank
        const rankedResults = rankResults(rawResults);

        // f) Diversify
        // Limit to 5 final chunks before trimming? Or diversify first then trim?
        // User flow: Diversify -> Trim
        const diverseResults = diversify(rankedResults, 2); // Limit 2 per source
        console.log(`🔀 Diversified to ${diverseResults.length} results`);

        // g) Trim to token budget
        const finalChunks = trimToTokenBudget(diverseResults, tokenBudget);
        const totalTokens = finalChunks.reduce((acc, chunk) => acc + (chunk.content?.length / 4), 0);
        console.log(`✂️ Trimmed to ${finalChunks.length} chunks (~${Math.floor(totalTokens)} tokens)`);

        // h) Return final chunks
        return {
            success: true,
            context: finalChunks,
            totalTokens: Math.ceil(totalTokens)
        };

    } catch (error) {
        console.error('❌ RAG Pipeline failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            context: [],
            totalTokens: 0
        };
    }
}
