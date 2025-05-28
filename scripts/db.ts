const { MongoClient, ServerApiVersion } = require('mongodb');
const { Pool } = require('pg');
const { debugLog } = require ('../src/lib/logging');
const { runMigrations } = require('./migrations');
const dotenv = require('dotenv');
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const POSTGRES_URI = process.env.POSTGRES_URI;
const DB_TYPE = process.env.DB_TYPE || 'mongodb'; // Default to mongodb

let client = null;
let clientPromise = null;
let pool = null;

// createPostgresTables remains as a helper, potentially for connection checks or basic setup if ever needed outside migrations.
// For now, it's just a connection check as migrations handle DDL.
async function createPostgresTables() {
  if (!pool) {
    // This function should only be called if pool is already initialized by initializeDatabase
    console.error('[DB] createPostgresTables called before pool was initialized. This should not happen.');
    throw new Error('PostgreSQL pool not initialized. Call initializeDatabase first.');
  }
  const dbClient = await pool.connect();
  try {
    debugLog('[DB] createPostgresTables: Connection successful. Schema setup and data seeding are handled by the migration system.');
  } catch (err) {
    console.error('[DB] Error during PostgreSQL connection check in createPostgresTables:', err);
    throw err;
  } finally {
    dbClient.release();
  }
}

async function initializeDatabase() {
  if (DB_TYPE === 'mongodb') {
    if (!MONGODB_URI) {
      throw new Error('DB_TYPE is "mongodb", but MONGODB_URI is not defined. Set MONGODB_URI environment variable.');
    }
    if (!clientPromise) { // Initialize only if not already done
      console.log('[DB Init] Initializing MongoDB connection...');
      if (process.env.NODE_ENV === 'development') {
        if (!global._mongoClientPromise) {
          client = new MongoClient(MONGODB_URI, {
            serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
          });
          global._mongoClientPromise = client.connect();
          console.log('[DB Init] MongoDB development client promise created.');
        }
        clientPromise = global._mongoClientPromise;
      } else {
        client = new MongoClient(MONGODB_URI, {
          serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
        });
        clientPromise = client.connect();
        console.log('[DB Init] MongoDB production client promise created.');
      }
      try {
        await clientPromise; // Await connection to ensure it's successful during initialization
        console.log('[DB Init] MongoDB connected successfully.');
      } catch (e) {
        console.error("[DB Init] Failed to connect to MongoDB:", e.message, e.stack);
        clientPromise = null; // Reset on failure
        client = null;
        throw e; // Re-throw error to be handled by caller
      }
    }
    return { pool: null, clientPromise };

  } else if (DB_TYPE === 'postgres') {
    if (!POSTGRES_URI) {
      throw new Error('DB_TYPE is "postgres", but POSTGRES_URI is not defined. Set POSTGRES_URI environment variable.');
    }
    if (!POSTGRES_URI.startsWith('postgres://') && !POSTGRES_URI.startsWith('postgresql://')) {
      throw new Error('Invalid POSTGRES_URI scheme. It must start with "postgres://" or "postgresql://".');
    }
    
    if (!pool) { // Initialize only if not already done
      console.log('[DB Init] Initializing PostgreSQL connection pool...');
      pool = new Pool({ connectionString: POSTGRES_URI });
      
      try {
        // The createPostgresTables function now primarily serves as a connection check.
        // All actual schema setup is handled by runMigrations.
        await createPostgresTables(); 
        console.log('[DB Init] PostgreSQL connection check successful.');

        await runMigrations(pool); 
        console.log('[DB Init] runMigrations executed successfully for PostgreSQL.');
      } catch (e) {
        console.error("[DB Init] Failed to initialize PostgreSQL tables or run migrations:", e.message, e.stack);
        pool = null; // Reset on failure
        throw e; // Re-throw error to be handled by caller
      }
    }
    return { pool, clientPromise: null };

  } else {
    throw new Error('Invalid DB_TYPE specified in .env file. Must be "mongodb" or "postgres".');
  }
}

// Export the pool and clientPromise. Their values will be set after initializeDatabase is called.
// Other parts of the application will import these and can use them once initialization is complete.
module.exports = { 
  initializeDatabase, 
  DB_TYPE, 
  clientPromise, 
  pool,
  createPostgresTables
};