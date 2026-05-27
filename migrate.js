import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

// Load from .env.local (Vercel) or .env (local)
const envFile = fs.existsSync('.env.local') ? '.env.local' : '.env';
dotenv.config({ path: envFile });

console.log(`📁 Loading DATABASE_URL from ${envFile}`);

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected!');

    console.log('📝 Running schema.sql...');
    const schema = fs.readFileSync('./schema.sql', 'utf8');
    await client.query(schema);
    console.log('✅ Migration completed successfully!');
    console.log('\n📊 Tables created:');
    console.log('  - users');
    console.log('  - circle_pair_invoices, circle_pair_items, circle_pair_signatures');
    console.log('  - circle_phone_invoices, circle_phone_items, circle_phone_trade_ins');
    console.log('  - service_history, company_profiles');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
