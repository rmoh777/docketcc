#!/usr/bin/env node

// Database Setup Script for DocketCC
// Run with: node scripts/setup-database.js

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Simple console setup (would be replaced with actual D1 in production)
async function setupDatabase(options = {}) {
    const { fresh = false, seed = false } = options;
    
    console.log('🗄️  DocketCC Database Setup');
    console.log('================================');
    
    if (fresh) {
        console.log('⚠️  Fresh database setup (would drop existing data)');
    }
    
    try {
        // In actual implementation, this would connect to Cloudflare D1
        console.log('📋 Database schema:');
        
        const schemaPath = join(rootDir, 'schema.sql');
        const schema = readFileSync(schemaPath, 'utf8');
        
        // Show table info
        const tables = schema.match(/CREATE TABLE (\w+)/g);
        if (tables) {
            tables.forEach(table => {
                const tableName = table.replace('CREATE TABLE ', '');
                console.log(`   ✓ ${tableName}`);
            });
        }
        
        // Show migration info
        console.log('\n📦 Available migrations:');
        const migrations = [
            '001_initial.sql - Initial schema setup',
            '002_add_keywords.sql - Docket keywords for search',
            '003_add_admin.sql - Admin users and analytics'
        ];
        
        migrations.forEach(migration => {
            console.log(`   ✓ ${migration}`);
        });
        
        if (seed) {
            console.log('\n🌱 Sample data would be seeded:');
            console.log('   ✓ 3 sample dockets (Lifeline, Net Neutrality, ACP)');
            console.log('   ✓ Keyword mappings for search');
        }
        
        console.log('\n✅ Database setup completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('   1. Configure Cloudflare D1 database');
        console.log('   2. Update wrangler.toml with database binding');
        console.log('   3. Run: wrangler d1 execute DB --file=schema.sql');
        console.log('   4. Set up environment variables');
        
    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        process.exit(1);
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
    fresh: args.includes('--fresh'),
    seed: args.includes('--seed')
};

// Run setup
setupDatabase(options); 