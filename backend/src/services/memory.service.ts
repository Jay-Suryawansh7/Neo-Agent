/**
 * Memory Service
 * PostgreSQL-backed conversation memory with summarization
 */

import { pool } from '../db/connection';
import { Message, Session, MemorySummary, UserGoal, NeoMode } from '../../../shared/types';
import { v4 as uuidv4 } from 'uuid';
import config from '../config';

class MemoryService {
  /**
   * Create or retrieve session
   */
  async getOrCreateSession(params: {
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<Session> {
    if (params.sessionId) {
      const existing = await this.getSession(params.sessionId);
      if (existing) {
        // Update last active
        await pool.query(
          'UPDATE sessions SET last_active_at = CURRENT_TIMESTAMP WHERE id = $1',
          [params.sessionId]
        );
        return existing;
      }
    }

    // Create new session
    const id = uuidv4();
    const result = await pool.query(
      `INSERT INTO sessions (id, ip_address, user_agent, current_mode) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [id, params.ipAddress, params.userAgent, NeoMode.VISITOR]
    );

    return this.mapSession(result.rows[0]);
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<Session | null> {
    const result = await pool.query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
    return result.rows[0] ? this.mapSession(result.rows[0]) : null;
  }

  /**
   * Store message
   */
  async storeMessage(message: {
    sessionId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    mode?: NeoMode;
    ragSources?: any[];
    planId?: string;
    tokenCount?: number;
  }): Promise<Message> {
    const id = uuidv4();
    const result = await pool.query(
      `INSERT INTO messages (id, session_id, role, content, mode, rag_sources, plan_id, token_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        id,
        message.sessionId,
        message.role,
        message.content,
        message.mode,
        JSON.stringify(message.ragSources || []),
        message.planId,
        message.tokenCount,
      ]
    );

    // Check if we need to create a summary
    const session = await this.getSession(message.sessionId);
    if (session && session.messageCount >= config.summaryThreshold) {
      await this.createSummary(message.sessionId);
    }

    return this.mapMessage(result.rows[0]);
  }

  /**
   * Get recent messages for session
   */
  async getRecentMessages(sessionId: string, limit?: number): Promise<Message[]> {
    const messageLimit = limit || config.memoryWindowSize;
    const result = await pool.query(
      `SELECT * FROM messages 
       WHERE session_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [sessionId, messageLimit]
    );

    return result.rows.reverse().map(this.mapMessage);
  }

  /**
   * Get all messages for session
   */
  async getAllMessages(sessionId: string): Promise<Message[]> {
    const result = await pool.query(
      'SELECT * FROM messages WHERE session_id = $1 ORDER BY created_at ASC',
      [sessionId]
    );

    return result.rows.map(this.mapMessage);
  }

  /**
   * Create memory summary
   */
  async createSummary(sessionId: string): Promise<void> {
    const messages = await this.getAllMessages(sessionId);
    
    // Get existing summaries
    const existingResult = await pool.query(
      'SELECT MAX(message_range_end) as last_end FROM memory_summaries WHERE session_id = $1',
      [sessionId]
    );
    const lastEnd = existingResult.rows[0]?.last_end || 0;

    // Only summarize new messages
    const messagesToSummarize = messages.slice(lastEnd);
    if (messagesToSummarize.length < 10) return; // Not enough to summarize

    // Create summary text (simplified - in production use AI)
    const summary = `Conversation summary: ${messagesToSummarize.length} messages exchanged. Topics: ${this.extractTopics(messagesToSummarize)}`;

    await pool.query(
      `INSERT INTO memory_summaries (id, session_id, summary, message_range_start, message_range_end)
       VALUES ($1, $2, $3, $4, $5)`,
      [uuidv4(), sessionId, summary, lastEnd, messages.length]
    );

    console.log(`✅ Created summary for session ${sessionId}`);
  }

  /**
   * Get summaries for session
   */
  async getSummaries(sessionId: string): Promise<MemorySummary[]> {
    const result = await pool.query(
      'SELECT * FROM memory_summaries WHERE session_id = $1 ORDER BY created_at DESC',
      [sessionId]
    );

    return result.rows.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      summary: row.summary,
      messageRange: {
        start: row.message_range_start,
        end: row.message_range_end,
      },
      createdAt: row.created_at,
    }));
  }

  /**
   * Build memory context for AI
   */
  async buildMemoryContext(sessionId: string): Promise<string> {
    const recent = await this.getRecentMessages(sessionId);
    const summaries = await this.getSummaries(sessionId);

    const contextParts: string[] = [];

    // Add summaries
    if (summaries.length > 0) {
      contextParts.push('## Previous Conversation Summary:');
      summaries.forEach(s => {
        contextParts.push(`- ${s.summary}`);
      });
      contextParts.push('');
    }

    // Add recent messages
    if (recent.length > 0) {
      contextParts.push('## Recent Messages:');
      recent.forEach(msg => {
        contextParts.push(`${msg.role}: ${msg.content.substring(0, 200)}${msg.content.length > 200 ? '...' : ''}`);
      });
    }

    return contextParts.join('\n');
  }

  /**
   * Update session mode
   */
  async updateSessionMode(sessionId: string, mode: NeoMode): Promise<void> {
    await pool.query(
      'UPDATE sessions SET current_mode = $1 WHERE id = $2',
      [mode, sessionId]
    );
  }

  /**
   * Store user goal
   */
  async storeGoal(sessionId: string, goal: string): Promise<UserGoal> {
    const id = uuidv4();
    const result = await pool.query(
      'INSERT INTO user_goals (id, session_id, goal, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, sessionId, goal, 'active']
    );

    return {
      id: result.rows[0].id,
      sessionId: result.rows[0].session_id,
      goal: result.rows[0].goal,
      status: result.rows[0].status,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
    };
  }

  /**
   * Get active goals
   */
  async getActiveGoals(sessionId: string): Promise<UserGoal[]> {
    const result = await pool.query(
      'SELECT * FROM user_goals WHERE session_id = $1 AND status = $2 ORDER BY created_at DESC',
      [sessionId, 'active']
    );

    return result.rows.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      goal: row.goal,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  // Helper methods
  private mapSession(row: any): Session {
    return {
      id: row.id,
      userId: row.user_id,
      createdAt: row.created_at,
      lastActiveAt: row.last_active_at,
      currentMode: row.current_mode as NeoMode,
      messageCount: row.message_count,
      summary: row.summary,
      metadata: row.metadata,
    };
  }

  private mapMessage(row: any): Message {
    return {
      id: row.id,
      sessionId: row.session_id,
      role: row.role,
      content: row.content,
      mode: row.mode as NeoMode,
      timestamp: row.created_at,
      metadata: {
        ragSources: row.rag_sources,
        planId: row.plan_id,
        tokenCount: row.token_count,
      },
    };
  }

  private extractTopics(messages: Message[]): string {
    // Simplified topic extraction
    const words = messages
      .map(m => m.content.toLowerCase())
      .join(' ')
      .split(' ')
      .filter(w => w.length > 5);
    
    const unique = [...new Set(words)].slice(0, 5);
    return unique.join(', ');
  }
}

export const memoryService = new MemoryService();
