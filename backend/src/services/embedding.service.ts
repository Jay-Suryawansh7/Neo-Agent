/**
 * Embedding Service
 * Generates embeddings using local BGE-M3 model via Xenova
 */

import { pipeline, env } from '@xenova/transformers';

// Fix for ERR_WORKER_PATH in some Node environments
env.backends.onnx.wasm.numThreads = 1;

class EmbeddingService {
    private static instance: EmbeddingService;
    private extractor: any = null;
    private modelPath: string = 'Xenova/bge-m3';

    private constructor() { }

    public static getInstance(): EmbeddingService {
        if (!EmbeddingService.instance) {
            EmbeddingService.instance = new EmbeddingService();
        }
        return EmbeddingService.instance;
    }

    /**
     * Initialize the model pipeline
     */
    private async init() {
        if (!this.extractor) {
            console.log('🔄 Loading local embedding model...');
            try {
                // Use feature-extraction pipeline
                this.extractor = await pipeline('feature-extraction', this.modelPath);
                console.log('✅ Embedding model loaded');
            } catch (error) {
                console.error('❌ Failed to load embedding model:', error);
                throw error;
            }
        }
    }

    /**
     * Generate embedding for a single text string
     */
    public async generateEmbedding(text: string): Promise<number[]> {
        await this.init();

        try {
            // Generate embedding
            const output = await this.extractor(text, { pooling: 'mean', normalize: true });
            // Convert Tensor to standard array
            return Array.from(output.data);
        } catch (error) {
            console.error('Embedding generation error:', error);
            throw error;
        }
    }

    /**
     * Generate embeddings for multiple texts
     */
    public async generateEmbeddings(texts: string[]): Promise<number[][]> {
        await this.init();

        try {
            const embeddings: number[][] = [];
            for (const text of texts) {
                const embedding = await this.generateEmbedding(text);
                embeddings.push(embedding);
            }
            return embeddings;
        } catch (error) {
            console.error('Batch embedding generation error:', error);
            throw error;
        }
    }
}

export const embeddingService = EmbeddingService.getInstance();
