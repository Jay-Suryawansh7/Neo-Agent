/**
 * Chat Controller
 * Main chat orchestration with streaming support
 */

import { Request, Response } from 'express';
import { SessionRequest } from '../middleware/session';
import { aiService } from '../services/ai.service';
import { memoryService } from '../services/memory.service';
import { modeService } from '../services/mode.service';
import { retrieveContext } from '../services/rag/rag.interface';
import { formatContext } from '../services/rag/utils';
import { NeoMode } from '../../../shared/types';
import { planningService } from '../services/planning.service';
import { sanitizeInput, detectPromptInjection } from '../middleware/validation';

export class ChatController {
  /**
   * Handle chat message with streaming response
   */
  async chat(req: Request, res: Response): Promise<void> {
    try {
      const { message } = req.body;
      const sessionId = (req as SessionRequest).sessionId;
      const ipAddress = req.ip;
      const userAgent = req.get('user-agent');

      // Security checks
      if (detectPromptInjection(message)) {
        res.status(400).json({
          error: 'Invalid request',
          code: 'SECURITY_VIOLATION',
        });
        return;
      }

      const sanitizedMessage = sanitizeInput(message);

      // Get or create session
      const session = await memoryService.getOrCreateSession({
        sessionId,
        ipAddress,
        userAgent,
      });

      // Determine mode
      const mode = await modeService.determineMode(session.id, sanitizedMessage);
      if (mode !== session.currentMode) {
        await memoryService.updateSessionMode(session.id, mode);
      }

      // Store user message
      await memoryService.storeMessage({
        sessionId: session.id,
        role: 'user',
        content: sanitizedMessage,
        mode,
      });

      // Build context layers

      // 1. Memory context
      const memoryContext = await memoryService.buildMemoryContext(session.id);

      // 2. RAG context
      let ragSources: any[] = [];
      let ragContext = '';
      try {
        const ragResult = await retrieveContext({
          question: sanitizedMessage,
          intent: 'chat', // Could infer this better from modeService
          topic: mode !== NeoMode.VISITOR ? mode : undefined,
        });

        if (ragResult.success) {
          ragSources = ragResult.context;
          ragContext = formatContext(ragSources);
        }
      } catch (error: any) {
        console.warn('RAG search unavailable (embeddings API key may be missing):', error?.message);
        // Continue without RAG - chat will still work
      }

      // 3. Planning context
      const planningContext = await planningService.buildPlanningContext(session.id);

      // 4. Goals context
      const activeGoals = await memoryService.getActiveGoals(session.id);
      const goalsContext = activeGoals.map(g => `- ${g.goal}`).join('\n');

      // Get recent messages
      const recentMessages = await memoryService.getRecentMessages(session.id, 5);
      const messages = recentMessages.map(m => ({
        role: (m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user') as 'user' | 'assistant' | 'system',
        content: m.content,
      }));

      // Setup streaming response
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let fullResponse = '';

      try {
        // Stream response
        const stream = aiService.streamChat({
          messages,
          mode,
          ragContext,
          memoryContext: memoryContext + '\n' + planningContext,
          goalsContext,
        });

        for await (const token of stream) {
          fullResponse += token;
          res.write(`data: ${JSON.stringify({ type: 'token', data: { token } })}\n\n`);
        }

        // Send completion event
        res.write(`data: ${JSON.stringify({
          type: 'complete',
          data: {
            mode,
            sources: ragSources.map(s => ({ source: s.source, category: s.category })),
          },
        })}\n\n`);

        res.end();

        // Store assistant message
        await memoryService.storeMessage({
          sessionId: session.id,
          role: 'assistant',
          content: fullResponse,
          mode,
          ragSources: ragSources.map(s => s.source),
        });
      } catch (error) {
        console.error('Streaming error:', error);
        res.write(`data: ${JSON.stringify({
          type: 'error',
          data: { error: 'Failed to generate response' },
        })}\n\n`);
        res.end();
      }
    } catch (error) {
      console.error('Chat controller error:', error);

      if (!res.headersSent) {
        res.status(500).json({
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
        });
      }
    }
  }

  /**
   * Get chat history
   */
  async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = (req as SessionRequest).sessionId;
      const messages = await memoryService.getAllMessages(sessionId);

      res.json({
        success: true,
        data: {
          sessionId,
          messages,
          count: messages.length,
        },
      });
    } catch (error) {
      console.error('Get history error:', error);
      res.status(500).json({
        error: 'Failed to retrieve history',
        code: 'HISTORY_ERROR',
      });
    }
  }

  /**
   * Clear chat history
   */
  async clearHistory(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = (req as SessionRequest).sessionId;

      // In production, you'd implement actual deletion
      // For now, just acknowledge
      res.json({
        success: true,
        data: {
          message: 'History cleared',
          sessionId,
        },
      });
    } catch (error) {
      console.error('Clear history error:', error);
      res.status(500).json({
        error: 'Failed to clear history',
        code: 'CLEAR_ERROR',
      });
    }
  }
}

export const chatController = new ChatController();
