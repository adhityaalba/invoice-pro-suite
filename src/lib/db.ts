// Database connection for Vercel Postgres (Neon)

import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './db-schema';

// Configure neon for edge/development
neonConfig.fetchConnectionCache = true;

// Get database URL from environment
const databaseUrl = import.meta.env.VITE_DATABASE_URL ||
                   process.env.DATABASE_URL ||
                   process.env.POSTGRES_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create neon connection
const sql = neon(databaseUrl);

// Create drizzle instance
export const db = drizzle(sql, { schema });

// Export schema
export * from './db-schema';

// Helper function to run raw SQL (for migrations/debugging)
export async function query(sql: string, params?: any[]) {
  try {
    const result = await sql(sql, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}
