/**
 * Initial sync script to populate Meilisearch with all products
 * Run this script once after setting up Meilisearch: node scripts/syncToMeilisearch.js
 */

require('dotenv').config();
const { initializeIndex } = require('../config/meilisearch');
const { syncAllProducts } = require('../services/syncService');
const sequelize = require('../config/db');

async function runSync() {
  try {
    console.log('🚀 Starting Meilisearch initial sync...\n');

    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Initialize Meilisearch index with settings
    console.log('⚙️  Initializing Meilisearch index...');
    await initializeIndex();
    console.log('');

    // Sync all products
    console.log('📦 Syncing all products to Meilisearch...');
    await syncAllProducts();
    console.log('');

    console.log('🎉 Initial sync completed successfully!');
    console.log('You can now use the search API endpoints.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

runSync();
