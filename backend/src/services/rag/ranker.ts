/**
 * RAG Ranker
 * Rerank Pinecone results using multi-factor scoring
 */

export interface RankedResult {
    [key: string]: any;
    final_score: number;
    explanation?: string;
}

/**
 * Rank results
 * Weights:
 * - 50% semantic score (Pinecone)
 * - 20% recency score (from metadata)
 * - 15% source credibility
 * - 10% section relevance
 * - 5% quality score
 */
export function rankResults(results: any[]): RankedResult[] {
    return results.map(result => {
        // 1. Semantic Score (50%)
        const semanticScore = result.score || 0;

        // 2. Recency Score (20%)
        // Assuming metadata has a 'createdAt' or 'updatedAt' timestamp (ISO string or unix)
        // If missing, default to neutral 0.5
        let recencyScore = 0.5;
        if (result.metadata?.createdAt) {
            try {
                const date = new Date(result.metadata.createdAt);
                const now = new Date();
                const daysDiff = (now.getTime() - date.getTime()) / (1000 * 3600 * 24);
                // Decay function: 1.0 for now, approaches 0 over a year
                recencyScore = Math.max(0, 1 - (daysDiff / 365));
            } catch (e) {
                // ignore date parse error
            }
        }

        // 3. Source Credibility (15%)
        // Define credibility map
        const sourceCredibility: Record<string, number> = {
            'official_docs': 1.0,
            'internal_wiki': 0.9,
            'github_repo': 0.8,
            'stackoverflow': 0.6,
            'general_web': 0.5
        };
        const source = result.metadata?.source || 'unknown';
        const credibilityScore = sourceCredibility[source] || 0.5;

        // 4. Section Relevance (10%)
        // Boost introduction/overview sections
        let sectionScore = 0.5;
        const section = (result.metadata?.section || '').toLowerCase();
        if (section.includes('overview') || section.includes('intro') || section.includes('api')) {
            sectionScore = 1.0;
        } else if (section.includes('deprecated') || section.includes('legacy')) {
            sectionScore = 0.2;
        }

        // 5. Quality Score (5%)
        // Simple heuristic: content length. Too short might be bad, too long might be noise.
        // Normalize length 100-1000 chars as good.
        const length = (result.content || '').length;
        let qualityScore = 0.5;
        if (length > 100 && length < 2000) {
            qualityScore = 0.9;
        } else if (length < 50) {
            qualityScore = 0.2; // Fragment
        }

        // Calculate Final Score
        const final_score = (
            (semanticScore * 0.50) +
            (recencyScore * 0.20) +
            (credibilityScore * 0.15) +
            (sectionScore * 0.10) +
            (qualityScore * 0.05)
        );

        return {
            ...result,
            final_score,
            debug_scores: {
                semantic: semanticScore,
                recency: recencyScore,
                credibility: credibilityScore,
                section: sectionScore,
                quality: qualityScore
            }
        };
    }).sort((a, b) => b.final_score - a.final_score);
}
