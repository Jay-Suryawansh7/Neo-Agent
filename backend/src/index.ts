/**
 * Neo Backend Server
 * Express.js with TypeScript
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import config, { validateConfig } from './config';
import { db } from './db/connection';
import { sessionMiddleware } from './middleware/session';

// Routes
import chatRoutes from './routes/chat.routes';
import ragRoutes from './routes/rag.routes';

// Load environment variables
dotenv.config();

// Validate configuration
validateConfig();

// Initialize Express app
const app = express();

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
}));
app.use(compression());
app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session middleware
app.use(sessionMiddleware);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// API Routes
app.use('/api/chat', chatRoutes);
app.use('/api/rag', ragRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    code: 'NOT_FOUND',
    path: req.path,
  });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);

  res.status(500).json({
    error: config.nodeEnv === 'development' ? err.message : 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
});

// Startup
async function startServer() {
  try {
    // Test database connection
    const dbConnected = await db.testConnection();
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }

    // Start server
    app.listen(config.port, () => {
      console.log('\n🚀 Neo Backend Server Started');
      console.log('=====================================');
      console.log(`Environment: ${config.nodeEnv}`);
      console.log(`Port: ${config.port}`);
      console.log(`Frontend URL: ${config.frontendUrl}`);
      console.log(`Model: ${config.openaiModelName}`);
      console.log(`Pinecone Index: ${config.pineconeIndexName}`);
      console.log('=====================================\n');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received, closing server...');
  await db.close();
  process.exit(0);
});

// Start
startServer();
