/**
 * Shared TypeScript types for Neo AI Chatbot
 * Used by both frontend and backend
 */

// ============================================
// MODE SYSTEM
// ============================================

export enum NeoMode {
  VISITOR = 'visitor',
  EXPLORER = 'explorer',
  APPLICANT = 'applicant',
  BUILDER = 'builder',
  OPERATOR = 'operator', // Locked for future use
}

export interface ModeConfig {
  mode: NeoMode;
  accessLevel: number;
  canAccessDepartments: boolean;
  canAccessProjects: boolean;
  canAccessJoinProcess: boolean;
  canAccessContribution: boolean;
  maxResponseDepth: 'basic' | 'detailed' | 'comprehensive';
}

// ============================================
// MESSAGE SYSTEM
// ============================================

export interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  mode?: NeoMode;
  timestamp: Date;
  metadata?: {
    ragSources?: string[];
    planId?: string;
    tokenCount?: number;
  };
}

export interface ChatRequest {
  message: string;
  sessionId: string;
  mode?: NeoMode;
}

export interface ChatResponse {
  message: string;
  mode: NeoMode;
  sources?: RAGSource[];
  planUpdate?: PlanUpdate;
}

// ============================================
// SESSION SYSTEM
// ============================================

export interface Session {
  id: string;
  userId?: string; // Optional, for future auth
  createdAt: Date;
  lastActiveAt: Date;
  currentMode: NeoMode;
  messageCount: number;
  summary?: string;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
  };
}

// ============================================
// MEMORY SYSTEM
// ============================================

export interface MemoryEntry {
  id: string;
  sessionId: string;
  messageId: string;
  content: string;
  importance: number; // 0-1 scale
  timestamp: Date;
  type: 'conversation' | 'plan' | 'goal' | 'summary';
}

export interface MemorySummary {
  id: string;
  sessionId: string;
  summary: string;
  messageRange: {
    start: number;
    end: number;
  };
  createdAt: Date;
}

export interface UserGoal {
  id: string;
  sessionId: string;
  goal: string;
  status: 'active' | 'completed' | 'abandoned';
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// PLANNING SYSTEM
// ============================================

export interface Plan {
  id: string;
  sessionId: string;
  goal: string;
  steps: PlanStep[];
  status: 'active' | 'completed' | 'failed' | 'revised';
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanStep {
  id: string;
  planId: string;
  stepNumber: number;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanUpdate {
  planId: string;
  currentStep: number;
  totalSteps: number;
  status: string;
  nextAction?: string;
}

// ============================================
// RAG SYSTEM
// ============================================

export interface RAGDocument {
  id: string;
  content: string;
  metadata: {
    source: string;
    category: string;
    title?: string;
    lastUpdated?: Date;
  };
  embedding?: number[];
}

export interface RAGSource {
  content: string;
  source: string;
  score: number;
  category: string;
}

export interface RAGSearchRequest {
  query: string;
  topK?: number;
  filter?: {
    category?: string;
    source?: string;
  };
}

export interface RAGSearchResponse {
  results: RAGSource[];
  query: string;
  totalResults: number;
}

// ============================================
// KNOWLEDGE SYSTEM
// ============================================

export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  category: 'origin' | 'mission' | 'departments' | 'academy' | 'projects' | 'ethics' | 'network';
  metadata?: Record<string, any>;
  lastUpdated: Date;
}

// ============================================
// ANALYTICS SYSTEM
// ============================================

export interface AnalyticsEvent {
  id: string;
  sessionId: string;
  eventType: 'message_sent' | 'mode_changed' | 'plan_created' | 'error_occurred';
  data?: Record<string, any>;
  timestamp: Date;
}

// ============================================
// API RESPONSES
// ============================================

export interface APIError {
  error: string;
  code: string;
  details?: any;
}

export interface APISuccess<T = any> {
  success: true;
  data: T;
}

export type APIResponse<T = any> = APISuccess<T> | APIError;

// ============================================
// STREAM EVENTS
// ============================================

export interface StreamEvent {
  type: 'token' | 'complete' | 'error' | 'mode_update' | 'plan_update';
  data: any;
}

export interface StreamToken {
  type: 'token';
  data: {
    token: string;
    index: number;
  };
}

export interface StreamComplete {
  type: 'complete';
  data: {
    messageId: string;
    mode: NeoMode;
    sources?: RAGSource[];
  };
}

export interface StreamError {
  type: 'error';
  data: {
    error: string;
    code: string;
  };
}
