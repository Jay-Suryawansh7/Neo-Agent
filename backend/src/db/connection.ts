/**
 * Database Connection Pool
 * PostgreSQL connection with retry logic
 */


import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  min: 0, // Allow pool to scale down to 0
  max: 5, // Limit max connections for Neon serverless
  idleTimeoutMillis: 10000, // Close idle clients faster
  connectionTimeoutMillis: 10000,
  allowExitOnIdle: true,
};

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private pool: Pool;

  private constructor() {
    this.pool = new Pool(poolConfig);

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected database error:', err);
    });

    // Handle successful connection
    this.pool.on('connect', () => {
      console.log('✅ Database connection established');
    });
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public getPool(): Pool {
    return this.pool;
  }

  public async query(text: string, params?: any[]) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Query executed', { text, duration, rows: result.rowCount });
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  public async testConnection(): Promise<boolean> {
    try {
      const result = await this.pool.query('SELECT NOW()');
      console.log('✅ Database connection test successful:', result.rows[0]);
      return true;
    } catch (error) {
      console.error('❌ Database connection test failed:', error);
      return false;
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
    console.log('Database connection pool closed');
  }
}

export const db = DatabaseConnection.getInstance();
export const pool = db.getPool();
