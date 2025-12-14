/**
 * Environment Configuration
 * Centralized config for all environment variables
 */

import dotenv from 'dotenv';

import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../../.env') });

interface Config {
  // Server
  nodeEnv: string;
  port: number;
  frontendUrl: string;

  // Database
  databaseUrl: string;
  databasePoolMin: number;
  databasePoolMax: number;

  // OpenAI (OSS Model)
  openaiApiBaseUrl: string;
  openaiApiKey: string;
  openaiModelName: string;

  // Embeddings (separate provider)
  embeddingApiKey: string;
  embeddingApiBaseUrl: string;
  embeddingModel: string;

  // Pinecone
  pineconeApiKey: string;
  pineconeIndexName: string;
  pineconeRegion: string;

  // AI Configuration
  maxTokens: number;
  temperature: number;
  topP: number;
  streamEnabled: boolean;

  // RAG Configuration
  ragTopK: number;
  chunkSize: number;
  chunkOverlap: number;

  // Memory Configuration
  memoryWindowSize: number;
  enableLongTermMemory: boolean;
  summaryThreshold: number;

  // Security
  sessionSecret: string;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
}

const config: Config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.BACKEND_PORT || '8000'),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Database
  databaseUrl: process.env.DATABASE_URL || '',
  databasePoolMin: parseInt(process.env.DATABASE_POOL_MIN || '2'),
  databasePoolMax: parseInt(process.env.DATABASE_POOL_MAX || '10'),

  // OpenAI
  openaiApiBaseUrl: process.env.OPENAI_API_BASE_URL || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModelName: process.env.OPENAI_MODEL_NAME || 'mistral-7b-instruct',

  // Embeddings (separate provider)
  embeddingApiKey: process.env.EMBEDDING_API_KEY || process.env.OPENAI_API_KEY || '',
  embeddingApiBaseUrl: process.env.EMBEDDING_API_BASE_URL || 'https://api.openai.com/v1',
  embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',

  // Pinecone
  pineconeApiKey: process.env.PINECONE_API_KEY || '',
  pineconeIndexName: process.env.PINECONE_INDEX_NAME || 'neo-knowledge',
  pineconeRegion: process.env.PINECONE_REGION || process.env.PINECONE_ENVIRONMENT || 'us-west-2',

  // AI
  maxTokens: parseInt(process.env.MAX_TOKENS || '2000'),
  temperature: parseFloat(process.env.TEMPERATURE || '0.7'),
  topP: parseFloat(process.env.TOP_P || '0.9'),
  streamEnabled: process.env.STREAM_ENABLED === 'true',

  // RAG
  ragTopK: parseInt(process.env.RAG_TOP_K || '5'),
  chunkSize: parseInt(process.env.CHUNK_SIZE || '500'),
  chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || '50'),

  // Memory
  memoryWindowSize: parseInt(process.env.MEMORY_WINDOW_SIZE || '10'),
  enableLongTermMemory: process.env.ENABLE_LONG_TERM_MEMORY !== 'false',
  summaryThreshold: parseInt(process.env.SUMMARY_THRESHOLD || '20'),

  // Security
  sessionSecret: process.env.SESSION_SECRET || 'change-this-in-production',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
};

// Validation
const requiredEnvVars = [
  'OPENAI_API_BASE_URL',
  'OPENAI_API_KEY',
  'DATABASE_URL'
];

export function validateConfig(): void {
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    console.error('Please check your .env file');
    process.exit(1);
  }

  console.log('✅ Environment configuration validated');
}

export default config;
