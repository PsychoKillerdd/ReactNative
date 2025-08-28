import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Environment variables for database connection
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/health_tracker';

// Create the postgres client
const client = postgres(DATABASE_URL, {
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10, // Maximum number of connections
});

// Create the drizzle database instance
export const db = drizzle(client, { schema });

export * from './schema';
export { schema };
