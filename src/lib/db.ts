
import { MongoClient, ServerApiVersion } from 'mongodb';
import { Pool } from 'pg';
import { debugLog } from '@/lib/logging';
// import { applyMigrations } from './migrations'; // Removed old import
import { runMigrations } from '../../scripts/migrations'; // Added new import

const MONGODB_URI = process.env.MONGODB_URI;
const POSTGRES_URI = process.env.POSTGRES_URI;
const DB_TYPE = process.env.DB_TYPE || 'mongodb'; // Default to mongodb

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;
let pool: Pool | null = null;

async function createPostgresTables() {
  if (!pool) {
    throw new Error('PostgreSQL pool not initialized.');
  }
  const dbClient = await pool.connect();
  try {
    // All DDL and seeding logic has been moved to the '000_initial_schema' migration.
    // This function now only ensures a connection can be made and then releases it.
    // The actual schema setup is handled by applyMigrations.
    debugLog('[DB] createPostgresTables: Connection successful. Schema setup and data seeding are now handled by the migration system.');
    // Optionally, you could perform a very basic query to ensure the DB is responsive,
    // e.g., await dbClient.query('SELECT 1;');
    // However, applyMigrations will do more comprehensive checks (like creating schema_migrations table).
  } catch (err) {
    console.error('[DB] Error during initial PostgreSQL connection or basic check in createPostgresTables:', err);
    // Re-throw the error so it's caught by the caller in the main DB initialization block
    throw err;
  } finally {
    dbClient.release();
  }
}


if (DB_TYPE === 'mongodb') {
  if (!MONGODB_URI) {
    throw new Error('DB_TYPE is "mongodb", but MONGODB_URI is not defined in .env file. Please define the MONGODB_URI environment variable.');
  }
  if (process.env.NODE_ENV === 'development') {
    const globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };
    if (!globalWithMongo._mongoClientPromise) {
      client = new MongoClient(MONGODB_URI, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        }
      });
      globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
  } else {
    client = new MongoClient(MONGODB_URI, {
       serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        }
    });
    clientPromise = client.connect();
  }
} else if (DB_TYPE === 'postgres') {
  if (!POSTGRES_URI) {
    throw new Error('DB_TYPE is "postgres", but POSTGRES_URI is not defined in .env file. Please define the POSTGRES_URI environment variable.');
  }
  if (!POSTGRES_URI.startsWith('postgres://') && !POSTGRES_URI.startsWith('postgresql://')) {
    throw new Error('Invalid POSTGRES_URI scheme in .env file. It must start with "postgres://" or "postgresql://".');
  }
  pool = new Pool({ connectionString: POSTGRES_URI });

  (async () => {
    try {
      await createPostgresTables(); // Connection check
      if (pool) { // Ensure pool is initialized before using
        await runMigrations(pool); // Use runMigrations from /scripts/migrations.ts
        debugLog('[DB Init] runMigrations executed successfully.');
      } else {
        console.error('[DB Init] PostgreSQL pool not initialized before attempting migrations.');
      }
    } catch (e: any) { // Catch errors from both createPostgresTables and runMigrations
      console.error("[DB Init] Failed to initialize PostgreSQL tables or run migrations:", e.message, e.stack);
      // Consider if process should exit on critical DB setup/migration failure
      // process.exit(1); 
    }
  })();

} else {
  throw new Error('Invalid DB_TYPE specified in .env file. Must be "mongodb" or "postgres".');
}

export { clientPromise, pool, DB_TYPE, createPostgresTables };
