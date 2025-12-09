/**
 * Knowledge Ingestion Script
 * Load and embed knowledge base into Pinecone
 */

import { knowledgeService } from '../backend/src/services/knowledge.service';
import { pineconeService } from '../backend/src/services/pinecone.service';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('🚀 Starting knowledge base ingestion\n');

  try {
    // Initialize Pinecone index
    console.log('1. Initializing Pinecone index...');
    await pineconeService.initializeIndex();

    // Ingest knowledge
    console.log('\n2. Loading and ingesting knowledge documents...');
    await knowledgeService.ingestKnowledge();

    // Get stats
    console.log('\n3. Retrieving index statistics...');
    const stats = await pineconeService.getStats();
    console.log('Index stats:', JSON.stringify(stats, null, 2));

    console.log('\n✅ Knowledge ingestion complete!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Ingestion failed:', error);
    process.exit(1);
  }
}

main();
