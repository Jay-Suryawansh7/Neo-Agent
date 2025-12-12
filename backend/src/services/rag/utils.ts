/**
 * RAG Utilities
 * Helper functions for text processing and token management
 */

/**
 * Clean text by removing markdown noise and excessive whitespace
 */
export function cleanText(text: string): string {
    return text
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove markdown links, keep text
        .replace(/[#*`]/g, '') // Remove simple markdown symbols
        .replace(/\s+/g, ' ') // Collapse whitespace
        .trim();
}

/**
 * Count tokens in text (Approximation)
 * Assumes ~4 chars per token for English text
 */
export function countTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
}

/**
 * Load chunk text
 * In this implementation, we assume the text is already present in the result object
 * or can be fetched if we implement a separate DB store.
 * For now, this is a distinct step as requested, but it might just return the text.
 */
export function loadChunkText(chunkId: string, chunkObj?: any): string {
    // If the chunk object is provided and has content, return it
    if (chunkObj && chunkObj.content) {
        return chunkObj.content;
    }
    // Placeholder: If we had a database lookup, we would use chunkId to fetch it.
    // Since we are relying on Pinecone metadata for now:
    console.warn(`Text not found for chunk ${chunkId}, returning empty.`);
    return '';
}

/**
 * Trim chunks to fit within a token budget
 */
export function trimToTokenBudget(chunks: any[], budget: number): any[] {
    let currentTokens = 0;
    const validChunks: any[] = [];

    for (const chunk of chunks) {
        const content = chunk.content || '';
        const tokens = countTokens(content);

        if (currentTokens + tokens <= budget) {
            validChunks.push(chunk);
            currentTokens += tokens;
        } else {
            // Option: We could truncate the last chunk to fit exactly, 
            // but for RAG it's often safer to just stop expanding context.
            break;
        }
    }

    return validChunks;
}

/**
 * Format context for LLM
 */
export function formatContext(chunks: any[]): string {
    if (!chunks || chunks.length === 0) return '';

    return chunks.map((chunk, index) => {
        const source = chunk.metadata?.source || chunk.source || 'unknown';
        const content = chunk.content || '';
        return `[Source ${index + 1}]: ${source}\n${content}`;
    }).join('\n\n');
}
