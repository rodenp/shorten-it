
import { MongoClient, ServerApiVersion } from 'mongodb';
import { Pool } from 'pg';

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
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE,
        "emailVerified" TIMESTAMPTZ,
        image TEXT,
        password TEXT,
        "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        provider TEXT NOT NULL,
        "providerAccountId" TEXT NOT NULL,
        refresh_token TEXT,
        access_token TEXT,
        expires_at BIGINT,
        token_type TEXT,
        scope TEXT,
        id_token TEXT,
        session_state TEXT
      );
    `);
     await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "provider_providerAccountId_idx" ON accounts(provider, "providerAccountId");`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        "sessionToken" TEXT UNIQUE NOT NULL,
        "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires TIMESTAMPTZ NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS verification_tokens (
        identifier TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires TIMESTAMPTZ NOT NULL
      );
    `);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "token_identifier_idx" ON verification_tokens(token, identifier);`);

    console.log('PostgreSQL tables checked/created successfully.');
  } catch (err) {
    console.error('Error creating PostgreSQL tables:', err);
    throw err;
  } finally {
    client.release();
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
      await createPostgresTables();
    } catch (e) {
      console.error("Failed to initialize PostgreSQL tables:", e);
    }
  })();

} else {
  throw new Error('Invalid DB_TYPE specified in .env file. Must be "mongodb" or "postgres".');
}

export { clientPromise, pool, DB_TYPE, createPostgresTables };
