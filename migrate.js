import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

// Load .env first, then let .env.local override values when present.
dotenv.config({ path: '.env' });
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local', override: true });
  console.log('📁 Loading DATABASE_URL from .env + .env.local');
} else {
  console.log('📁 Loading DATABASE_URL from .env');
}

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL belum diset.');
  console.error('   Buat file .env atau .env.local berisi contoh ini:');
  console.error('   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/circlephone_db');
  process.exit(1);
}

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
    console.log('  - service_history, company_profiles, guests');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
