/**
 * Neo API Client
 * Handles all backend communication
 */

import Cookies from 'js-cookie';
import { Message, NeoMode, RAGSource } from '@shared/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ChatStreamEvent {
  type: 'token' | 'complete' | 'error';
  data: any;
}

export class NeoAPI {
  /**
   * Send chat message with streaming response
   */
  static async *streamChat(message: string): AsyncGenerator<string, { mode: NeoMode; sources: RAGSource[] }, unknown> {
    const sessionId = Cookies.get('neo_session');

    const response = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ message, sessionId }),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let mode: NeoMode = NeoMode.VISITOR;
    let sources: RAGSource[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'token') {
              yield data.data.token;
            } else if (data.type === 'complete') {
              mode = data.data.mode;
              sources = data.data.sources || [];
            } else if (data.type === 'error') {
              throw new Error(data.data.error);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return { mode, sources };
  }

  /**
   * Get chat history
   */
  static async getHistory(): Promise<Message[]> {
    const response = await fetch(`${API_URL}/api/chat/history`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch history');
    }

    const data = await response.json();
    return data.data.messages;
  }

  /**
   * Clear chat history
   */
  static async clearHistory(): Promise<void> {
    const response = await fetch(`${API_URL}/api/chat/history`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to clear history');
    }
  }
}
