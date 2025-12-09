/**
 * Jina AI Embeddings Client
 * Custom client for Jina AI since OpenAI SDK doesn't support it
 */

import config from '../config';

interface JinaEmbeddingResponse {
  model: string;
  object: string;
  usage: {
    total_tokens: number;
    prompt_tokens: number;
  };
  data: Array<{
    object: string;
    index: number;
    embedding: number[];
  }>;
}

export class JinaClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async createEmbeddings(input: string | string[]): Promise<JinaEmbeddingResponse> {
    const url = `${this.baseUrl}/embeddings`;
    const inputArray = Array.isArray(input) ? input : [input];

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: config.embeddingModel,
        task: 'text-matching',
        input: inputArray,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jina AI API error (${response.status}): ${errorText}`);
    }

    return response.json() as Promise<JinaEmbeddingResponse>;
  }
}
