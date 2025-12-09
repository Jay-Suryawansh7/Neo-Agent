/**
 * AI Service
 * OpenAI-compatible API client with streaming support
 */

import OpenAI from 'openai';
import config from '../config';
import { NEO_SYSTEM_PROMPT, SAFETY_PROMPT } from '../prompts/system';
import { getModePrompt } from '../prompts/modes';
import { NeoMode } from '../../../shared/types';
import { JinaClient } from './jina-client';

class AIService {
  private chatClient: OpenAI;
  private embeddingClient: OpenAI | null;
  private jinaClient: JinaClient | null;

  constructor() {
    // Groq for chat completions
    this.chatClient = new OpenAI({
      apiKey: config.openaiApiKey,
      baseURL: config.openaiApiBaseUrl,
    });

    // Check if using Jina AI for embeddings
    const isJina = config.embeddingApiBaseUrl.includes('jina.ai');
    
    if (isJina) {
      // Use custom Jina client
      this.jinaClient = new JinaClient(config.embeddingApiKey, config.embeddingApiBaseUrl);
      this.embeddingClient = null;
    } else {
      // Use OpenAI SDK for OpenAI/compatible APIs
      this.embeddingClient = new OpenAI({
        apiKey: config.embeddingApiKey,
        baseURL: config.embeddingApiBaseUrl,
      });
      this.jinaClient = null;
    }
  }

  /**
   * Generate streaming chat completion
   */
  async *streamChat(params: {
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
    mode: NeoMode;
    ragContext?: string;
    memoryContext?: string;
    goalsContext?: string;
  }): AsyncGenerator<string, void, unknown> {
    const systemMessage = this.buildSystemMessage(params);

    try {
      const stream = await this.chatClient.chat.completions.create({
        model: config.openaiModelName,
        messages: [
          { role: 'system', content: systemMessage },
          ...params.messages,
        ],
        temperature: config.temperature,
        top_p: config.topP,
        max_tokens: config.maxTokens,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      console.error('AI streaming error:', error);
      throw new Error('Failed to generate response');
    }
  }

  /**
   * Generate non-streaming completion
   */
  async generateCompletion(params: {
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
    mode: NeoMode;
    ragContext?: string;
    memoryContext?: string;
    goalsContext?: string;
  }): Promise<string> {
    const systemMessage = this.buildSystemMessage(params);

    try {
      const completion = await this.chatClient.chat.completions.create({
        model: config.openaiModelName,
        messages: [
          { role: 'system', content: systemMessage },
          ...params.messages,
        ],
        temperature: config.temperature,
        top_p: config.topP,
        max_tokens: config.maxTokens,
        stream: false,
      });

      return completion.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('AI completion error:', error);
      throw new Error('Failed to generate response');
    }
  }

  /**
   * Generate embeddings for text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      if (this.jinaClient) {
        // Use Jina AI client
        const response = await this.jinaClient.createEmbeddings(text);
        return response.data[0].embedding;
      } else if (this.embeddingClient) {
        // Use OpenAI-compatible client
        const response = await this.embeddingClient.embeddings.create({
          model: config.embeddingModel,
          input: text,
        });
        return response.data[0].embedding;
      } else {
        throw new Error('No embedding client configured');
      }
    } catch (error) {
      console.error('Embedding generation error:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  /**
   * Generate embeddings for multiple texts
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      if (this.jinaClient) {
        // Use Jina AI client
        const response = await this.jinaClient.createEmbeddings(texts);
        return response.data.map(item => item.embedding);
      } else if (this.embeddingClient) {
        // Use OpenAI-compatible client
        const response = await this.embeddingClient.embeddings.create({
          model: config.embeddingModel,
          input: texts,
        });
        return response.data.map(item => item.embedding);
      } else {
        throw new Error('No embedding client configured');
      }
    } catch (error) {
      console.error('Batch embedding error:', error);
      throw new Error('Failed to generate embeddings');
    }
  }

  /**
   * Build complete system message with all context
   */
  private buildSystemMessage(params: {
    mode: NeoMode;
    ragContext?: string;
    memoryContext?: string;
    goalsContext?: string;
  }): string {
    const parts: string[] = [
      NEO_SYSTEM_PROMPT,
      '',
      getModePrompt(params.mode),
      '',
      SAFETY_PROMPT,
    ];

    // Add RAG context if available
    if (params.ragContext) {
      parts.push('', '# RELEVANT KNOWLEDGE FROM DATABASE', '', params.ragContext);
    }

    // Add memory context if available
    if (params.memoryContext) {
      parts.push('', '# CONVERSATION HISTORY', '', params.memoryContext);
    }

    // Add goals context if available
    if (params.goalsContext) {
      parts.push('', '# USER GOALS', '', params.goalsContext);
    }

    parts.push('', '---', '', 'Now respond to the user\'s message using ONLY the above context.');

    return parts.join('\n');
  }

  /**
   * Validate response for safety (basic filter)
   */
  validateResponse(response: string): boolean {
    const forbiddenPatterns = [
      /system prompt/i,
      /api key/i,
      /database/i,
      /pinecone/i,
      /postgresql/i,
    ];

    return !forbiddenPatterns.some(pattern => pattern.test(response));
  }
}

export const aiService = new AIService();
