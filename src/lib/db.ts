
import { MongoClient, ServerApiVersion } from 'mongodb';
import { Pool } from 'pg';
import { debugLog } from '@/lib/logging';

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
    await dbClient.query( 
      'CREATE TABLE IF NOT EXISTS users ( ' +
      '  id TEXT PRIMARY KEY, ' +
      '  name TEXT, ' +
      '  email TEXT UNIQUE, ' +
      '  "emailVerified" TIMESTAMPTZ, ' +
      '  image TEXT, ' +
      '  password TEXT, ' +
      '  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, ' +
      '  "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP ' +
      ');' 
    );
    await dbClient.query( 
      'CREATE TABLE IF NOT EXISTS accounts ( ' +
      '  id TEXT PRIMARY KEY, ' +
      '  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, ' +
      '  type TEXT NOT NULL, ' +
      '  provider TEXT NOT NULL, ' +
      '  "providerAccountId" TEXT NOT NULL, ' +
      '  refresh_token TEXT, ' +
      '  access_token TEXT, ' +
      '  expires_at BIGINT, ' +
      '  token_type TEXT, ' +
      '  scope TEXT, ' +
      '  id_token TEXT, ' +
      '  session_state TEXT ' +
      ');' 
    );
    await dbClient.query('CREATE UNIQUE INDEX IF NOT EXISTS "provider_providerAccountId_idx" ON accounts(provider, "providerAccountId");');

    await dbClient.query( 
      'CREATE TABLE IF NOT EXISTS sessions ( ' +
      '  id TEXT PRIMARY KEY, ' +
      '  "sessionToken" TEXT UNIQUE NOT NULL, ' +
      '  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, ' +
      '  expires TIMESTAMPTZ NOT NULL ' +
      ');' 
    );

    await dbClient.query( 
      'CREATE TABLE IF NOT EXISTS verification_tokens ( ' +
      '  identifier TEXT NOT NULL, ' +
      '  token TEXT UNIQUE NOT NULL, ' +
      '  expires TIMESTAMPTZ NOT NULL ' +
      ');' 
    );
    await dbClient.query('CREATE UNIQUE INDEX IF NOT EXISTS "token_identifier_idx" ON verification_tokens(token, identifier);');

    await dbClient.query( 
      'CREATE TABLE IF NOT EXISTS custom_domains ( ' +
      '  id TEXT PRIMARY KEY, ' +
      '  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, ' +
      '  "domainName" TEXT NOT NULL, ' +
      '  verified BOOLEAN DEFAULT FALSE, ' +
      '  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, ' +
      '  "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP ' +
      ');' 
    );
    await dbClient.query('CREATE UNIQUE INDEX IF NOT EXISTS "userId_domainName_idx" ON custom_domains("userId", "domainName");');

    await dbClient.query(` 
      CREATE TABLE IF NOT EXISTS campaign_templates (
        id TEXT PRIMARY KEY ,
        "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        source TEXT,
        medium TEXT,
        campaign TEXT,
        term TEXT,
        content TEXT,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`
    );

    await dbClient.query( 
      'CREATE TABLE IF NOT EXISTS api_keys ( ' +
      '  id TEXT PRIMARY KEY, ' +
      '  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, ' +
      '  name TEXT NOT NULL, ' +
      '  "hashedKey" TEXT NOT NULL UNIQUE, ' +
      '  prefix TEXT NOT NULL, ' +
      '  permissions TEXT[], ' +
      '  "lastUsedAt" TIMESTAMPTZ, ' +
      '  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, ' +
      '  "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP ' +
      ');' 
    );
    await dbClient.query('CREATE INDEX IF NOT EXISTS "apiKey_userId_idx" ON api_keys("userId");');
    await dbClient.query('CREATE INDEX IF NOT EXISTS "apiKey_updatedAt_idx" ON api_keys("updatedAt");');

    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        "userId" TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
        "isCompactMode" BOOLEAN DEFAULT FALSE,
        "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await dbClient.query( 
      'CREATE TABLE IF NOT EXISTS link_groups ( ' +
      '  id TEXT PRIMARY KEY, ' +
      '  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, ' +
      '  name TEXT NOT NULL, ' +
      '  description TEXT, ' +
      '  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, ' +
      '  "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP ' +
      ');' 
    );
    await dbClient.query('CREATE UNIQUE INDEX IF NOT EXISTS "userId_link_group_name_idx" ON link_groups("userId", name);');

    await dbClient.query( 
      'CREATE TABLE IF NOT EXISTS retargeting_pixels ( ' +
      '  id TEXT PRIMARY KEY, ' +
      '  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, ' +
      '  name TEXT NOT NULL, ' +
      '  type TEXT NOT NULL, ' +
      '  "pixelIdValue" TEXT NOT NULL, ' +
      '  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, ' +
      '  "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP ' +
      ');' 
    );
    await dbClient.query('CREATE UNIQUE INDEX IF NOT EXISTS "userId_retargeting_pixel_name_idx" ON retargeting_pixels("userId", name);');
    await dbClient.query('CREATE INDEX IF NOT EXISTS "retargetingPixel_userId_idx" ON retargeting_pixels("userId");');

    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS team_memberships (
        id TEXT PRIMARY KEY, 
        "teamOwnerId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, 
        "memberUserId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, 
        role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')), 
        "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "unique_team_member" UNIQUE ("teamOwnerId", "memberUserId") 
      );
    `);
    await dbClient.query('CREATE INDEX IF NOT EXISTS "teamMembership_teamOwnerId_idx" ON team_memberships("teamOwnerId");');
    await dbClient.query('CREATE INDEX IF NOT EXISTS "teamMembership_memberUserId_idx" ON team_memberships("memberUserId");');

    await dbClient.query( 
      'CREATE TABLE IF NOT EXISTS links ( ' +
      '  id TEXT PRIMARY KEY, ' +
      '  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, ' +
      '  "originalUrl" TEXT NOT NULL, ' +
      '  "shortUrl" TEXT NOT NULL UNIQUE, ' +
      '  slug TEXT NOT NULL, ' +
      '  "clickCount" INTEGER DEFAULT 0, ' +
      '  title TEXT, ' +
      '  tags TEXT[], ' +
      '  "isCloaked" BOOLEAN DEFAULT FALSE, ' +
      '  "customDomainId" TEXT REFERENCES custom_domains(id) ON DELETE SET NULL, ' +
      '  "groupId" TEXT REFERENCES link_groups(id) ON DELETE SET NULL, ' +
      '  "deepLinkConfig" JSONB, ' +
      '  "abTestConfig" JSONB, ' +
      '  targets JSONB NOT NULL, ' +
      '  last_used_target_index INTEGER DEFAULT NULL, ' + // Added this line
      '  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, ' +
      '  "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, ' +
      '  CONSTRAINT "unique_slug_on_domain" UNIQUE (slug, "customDomainId") ' +
      ');' 
    );
    await dbClient.query('CREATE INDEX IF NOT EXISTS "link_userId_idx" ON links("userId");');
    await dbClient.query('CREATE INDEX IF NOT EXISTS "link_groupId_idx" ON links("groupId");');
    await dbClient.query('CREATE INDEX IF NOT EXISTS "link_customDomainId_idx" ON links("customDomainId");');
    await dbClient.query('CREATE INDEX IF NOT EXISTS "link_slug_idx" ON links(slug);');

    await dbClient.query( 
      'CREATE TABLE IF NOT EXISTS link_retargeting_pixels ( ' +
      '  "linkId" TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE, ' +
      '  "pixelId" TEXT NOT NULL REFERENCES retargeting_pixels(id) ON DELETE CASCADE, ' +
      '  PRIMARY KEY ("linkId", "pixelId") ' +
      ');' 
    );

    await dbClient.query( 
      'CREATE TABLE IF NOT EXISTS analytic_events ( ' +
      '  id TEXT PRIMARY KEY, ' +
      '  "linkId" TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE, ' +
      '  timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, ' +
      '  "ipAddress" TEXT, ' +
      '  "userAgent" TEXT, ' +
      '  country TEXT, ' +
      '  city TEXT, ' +
      '  "deviceType" TEXT, ' +
      '  browser TEXT, ' +
      '  os TEXT, ' +
      '  referrer TEXT ' +
      ');' 
    );
    await dbClient.query('CREATE INDEX IF NOT EXISTS "analytic_event_linkId_idx" ON analytic_events("linkId");');
    await dbClient.query('CREATE INDEX IF NOT EXISTS "analytic_event_timestamp_idx" ON analytic_events(timestamp);' );
    await dbClient.query('CREATE INDEX IF NOT EXISTS "analytic_event_country_idx" ON analytic_events(country);' );
    await dbClient.query('CREATE INDEX IF NOT EXISTS "analytic_event_deviceType_idx" ON analytic_events("deviceType");' );

    debugLog('PostgreSQL tables checked/created successfully.');
  } catch (err) {
    console.error('Error creating/checking PostgreSQL tables:', err);
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
      await createPostgresTables();
    } catch (e) {
      console.error("Failed to initialize/check all PostgreSQL tables/indexes:", e);
    }
  })();

} else {
  throw new Error('Invalid DB_TYPE specified in .env file. Must be "mongodb" or "postgres".');
}

export { clientPromise, pool, DB_TYPE, createPostgresTables };
