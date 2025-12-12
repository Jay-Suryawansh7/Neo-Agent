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
        'question': ['faq', 'docs', 'general'],
        'chat': ['general', 'history'],
        'debug': ['code', 'stackoverflow', 'issues']
    };

    // Default to including all relevant categories if intent is recognized, otherwise broad search
    if (intent && intentCategoryMap[intent]) {
        filters['category'] = { '$in': intentCategoryMap[intent] };
    }

    // 2. Filter by topic
    // Using $in as a proxy for 'contains' if topic is a single string but we want to match if it's in the list of topics in metadata
    // Or strict equality if metadata topic is a string
    if (topic) {
        // Assuming metadata 'topic' is a string. If it's a list, we might need different logic.
        // For now, let's use a simple equality match or checking if the topic field matches.
        filters['topic'] = topic;
    }

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
