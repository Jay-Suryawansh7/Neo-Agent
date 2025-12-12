import OpenAI from 'openai';
import config from '../config';
import { NEO_SYSTEM_PROMPT, SAFETY_PROMPT } from '../prompts/system';
import { getModePrompt } from '../prompts/modes';
import { NeoMode } from '../../../shared/types';

class AIService {
  private chatClient: OpenAI;

  constructor() {
    // Groq for chat completions
    this.chatClient = new OpenAI({
      apiKey: config.openaiApiKey,
      baseURL: config.openaiApiBaseUrl,
    });
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
