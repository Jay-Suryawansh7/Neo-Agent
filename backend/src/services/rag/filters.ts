/**
 * RAG Filters
 * component to build Pinecone metadata filters based on query intent
 */

interface PineconeFilter {
    [key: string]: any;
}

/**
 * Build Pinecone metadata filters
 */
export function buildFilters(intent: string, topic?: string, extra?: object): PineconeFilter {
    const filters: PineconeFilter = {};

    // 1. Filter by category based on intent
    // Map intents to categories
    const intentCategoryMap: Record<string, string[]> = {
        'coding': ['code', 'technical_docs'],
        'question': ['faq', 'docs', 'general', 'projects'],
        'chat': ['general', 'history', 'projects'],
        'debug': ['code', 'stackoverflow', 'issues']
    };

    // Default to including all relevant categories if intent is recognized, otherwise broad search
    if (intent && intentCategoryMap[intent]) {
        filters['category'] = { '$in': intentCategoryMap[intent] };
    }

    // 2. Filter by topic
    // SKIPPING topic filter for now as metadata doesn't have 'topic' field yet
    // if (topic) {
    //     filters['topic'] = topic;
    // }

    // 3. Source filtering (internal vs public)
    // Example: If extra contains 'source', use it
    if (extra && (extra as any).source) {
        filters['source'] = (extra as any).source;
    }

    // 4. Recency (Optional)
    // If extra contains simple recency flag like 'recent_only', we could filter by date gt X
    // Not implemented in metadata yet, so skipping.

    return filters;
}
