/**
 * RAG Diversity
 * Remove duplicates and enforce variety
 */

import { cleanText } from './utils';

/**
 * Calculate Jaccard similarity between two strings
 * (Intersection of words / Union of words)
 */
function jaccardSimilarity(str1: string, str2: string): number {
    const set1 = new Set(str1.toLowerCase().split(/\s+/));
    const set2 = new Set(str2.toLowerCase().split(/\s+/));

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    if (union.size === 0) return 0;
    return intersection.size / union.size;
}

/**
 * Diversify results
 * - Limit chunks per source
 * - Remove near-duplicate text
 */
export function diversify(results: any[], limitPerSource = 2): any[] {
    const selected: any[] = [];
    const sourceCounts: Record<string, number> = {};

    for (const result of results) {
        const source = result.metadata?.source || 'unknown';
        const content = result.content || '';

        // 1. Check Source Limit
        if ((sourceCounts[source] || 0) >= limitPerSource) {
            continue;
        }

        // 2. Check Duplicates (Dedup)
        let isDuplicate = false;
        for (const existing of selected) {
            const existingContent = existing.content || '';
            const similarity = jaccardSimilarity(cleanText(content), cleanText(existingContent));

            // Threshold for duplicate: 0.85
            if (similarity > 0.85) {
                isDuplicate = true;
                break;
            }
        }

        if (!isDuplicate) {
            selected.push(result);
            sourceCounts[source] = (sourceCounts[source] || 0) + 1;
        }
    }

    return selected;
}
