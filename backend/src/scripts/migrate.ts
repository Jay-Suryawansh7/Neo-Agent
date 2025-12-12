/**
 * Database Migration Script
 * Run this once to initialize the database schema
 */

import fs from 'fs';
import path from 'path';
import { pool } from '../db/connection';

interface TableResult {
    table_name: string;
}

async function migrate() {
    try {
        console.log('🔄 Starting database migration...\n');

        // Read schema file
        const schemaPath = path.join(__dirname, '../db/schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf-8');

        console.log('📝 Executing schema.sql...');
        await pool.query(schema);

        console.log('✅ Database schema created successfully!\n');

        // Test the tables
        const result = await pool.query<TableResult>(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

        console.log('📊 Created tables:');
        result.rows.forEach((row: TableResult) => {
            console.log(`   - ${row.table_name}`);
        });

        console.log('\n✅ Migration complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
