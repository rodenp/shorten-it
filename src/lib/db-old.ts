
// src/lib/db.ts
import { Pool, neon, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import ws from 'ws';

export const DB_TYPE = process.env.DB_TYPE || 'sqlite'; // 'postgres' or 'sqlite'

let prisma: PrismaClient;
let pool: Pool | null = null; 
let clientPromise: Promise<any> | null = null; 

if (process.env.DATABASE_URL && DB_TYPE === 'postgres') {
  if (process.env.KDS_WEBSOCKET_URL) {
    console.log("Neon WebSocket URL detected, configuring for serverless WebSocket.");
    neonConfig.webSocketConstructor = ws; 
    neonConfig.connectionCacheAffinityMode = 2; 
    neonConfig.pipelineConnect = false; 
  } else {
    console.log("No Neon WebSocket URL detected, using standard HTTP connection pooling for Neon.");
  }

  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaNeon(pool);
  prisma = new PrismaClient({ adapter, log: ['query', 'info', 'warn', 'error'] });
  console.log("PostgreSQL (Neon) PrismaClient initialized.");

} else if (DB_TYPE === 'sqlite') {
  const sqlite = require('better-sqlite3');
  const db = sqlite('local.db'); 
  const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
  const adapter = new PrismaBetterSqlite3(db);
  prisma = new PrismaClient({ adapter, log: ['query', 'info', 'warn', 'error'] });
  console.log("SQLite PrismaClient initialized.");

  db.exec( 
    'CREATE TABLE IF NOT EXISTS users ( ' +
    '  id TEXT PRIMARY KEY, ' +
    '  name TEXT, ' +
    '  email TEXT UNIQUE, ' +
    '  "emailVerified" DATETIME, ' +
    '  image TEXT, ' +
    '  "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP, ' +
    '  "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP ' +
    ');' +
    'CREATE TABLE IF NOT EXISTS accounts ( ' +
    '  id TEXT PRIMARY KEY, ' +
    '  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, ' +
    '  type TEXT NOT NULL, ' +
    '  provider TEXT NOT NULL, ' +
    '  "providerAccountId" TEXT NOT NULL, ' +
    '  refresh_token TEXT, ' +
    '  access_token TEXT, ' +
    '  expires_at INTEGER, ' +
    '  token_type TEXT, ' +
    '  scope TEXT, ' +
    '  id_token TEXT, ' +
    '  session_state TEXT, ' +
    '  "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP, ' +
    '  "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP, ' +
    '  UNIQUE (provider, "providerAccountId") ' +
    ');' +
    'CREATE TABLE IF NOT EXISTS sessions ( ' +
    '  id TEXT PRIMARY KEY, ' +
    '  "sessionToken" TEXT NOT NULL UNIQUE, ' +
    '  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, ' +
    '  expires DATETIME NOT NULL, ' +
    '  "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP, ' +
    '  "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP ' +
    ');' +
    'CREATE TABLE IF NOT EXISTS verification_tokens ( ' +
    '  identifier TEXT NOT NULL, ' +
    '  token TEXT NOT NULL UNIQUE, ' +
    '  expires DATETIME NOT NULL, ' +
    '  "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP, ' +
    '  "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP, ' +
    '  UNIQUE (identifier, token) ' +
    ');' +
    'CREATE TABLE IF NOT EXISTS api_keys ( ' +
    '    id TEXT PRIMARY KEY, ' +
    '    "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, ' +
    '    name TEXT NOT NULL, ' +
    '    prefix TEXT NOT NULL UNIQUE, ' +
    '    key TEXT NOT NULL UNIQUE, ' +
    '    "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP, ' +
    '    "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP, ' +
    '    "lastUsedAt" DATETIME, ' +
    '    permissions TEXT ' +
    ');' +
    'CREATE INDEX IF NOT EXISTS "apiKey_userId_idx" ON api_keys("userId");' +
    'CREATE TABLE IF NOT EXISTS custom_domains ( ' +
    '    id TEXT PRIMARY KEY, ' +
    '    "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, ' +
    '    "domainName" TEXT NOT NULL UNIQUE, ' +
    '    verified BOOLEAN DEFAULT FALSE, ' +
    '    "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP, ' +
    '    "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP ' +
    ');' +
    'CREATE INDEX IF NOT EXISTS "customDomain_userId_idx" ON custom_domains("userId");' +
    'CREATE TABLE IF NOT EXISTS link_groups ( ' +
    '    id TEXT PRIMARY KEY, ' +
    '    "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, ' +
    '    name TEXT NOT NULL, ' +
    '    description TEXT, ' +
    '    "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP, ' +
    '    "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP ' +
    ');' +
    'CREATE INDEX IF NOT EXISTS "linkGroup_userId_idx" ON link_groups("userId");' +
    'CREATE TABLE IF NOT EXISTS links ( ' +
    '    id TEXT PRIMARY KEY, ' +
    '    "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, ' +
    '    "originalUrl" TEXT NOT NULL, ' +
    '    "shortUrl" TEXT NOT NULL UNIQUE, ' +
    '    slug TEXT NOT NULL, ' +
    '    "clickCount" INTEGER DEFAULT 0, ' +
    '    title TEXT, ' +
    '    tags TEXT, ' +
    '    "isCloaked" BOOLEAN DEFAULT FALSE, ' +
    '    "customDomainId" TEXT REFERENCES custom_domains(id) ON DELETE SET NULL, ' +
    '    "groupId" TEXT REFERENCES link_groups(id) ON DELETE SET NULL, ' +
    '    "deepLinkConfig" TEXT, ' +
    '    "abTestConfig" TEXT, ' +
    '    targets TEXT NOT NULL, ' +
    '    "last_used_target_index" INTEGER DEFAULT NULL, ' +
    '    "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP, ' +
    '    "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP, ' +
    '    CONSTRAINT "unique_slug_on_domain" UNIQUE (slug, "customDomainId") ' +
    ');' +
    'CREATE INDEX IF NOT EXISTS "link_userId_idx" ON links("userId");' +
    'CREATE INDEX IF NOT EXISTS "link_slug_idx" ON links(slug);' +
    'CREATE INDEX IF NOT EXISTS "link_customDomainId_idx" ON links("customDomainId");' +
    'CREATE TABLE IF NOT EXISTS analytic_events ( ' +
    '    id TEXT PRIMARY KEY, ' +
    '    "linkId" TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE, ' +
    '    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, ' +
    '    "ipAddress" TEXT, ' +
    '    "userAgent" TEXT, ' +
    '    country TEXT, ' +
    '    city TEXT, ' +
    '    "deviceType" TEXT, ' +
    '    browser TEXT, ' +
    '    os TEXT, ' +
    '    referrer TEXT ' +
    ');' +
    'CREATE INDEX IF NOT EXISTS "analytic_linkId_idx" ON analytic_events("linkId");' +
    'CREATE INDEX IF NOT EXISTS "analytic_timestamp_idx" ON analytic_events(timestamp);' +
    'CREATE TABLE IF NOT EXISTS retargeting_pixels ( ' +
    '    id TEXT PRIMARY KEY, ' +
    '    "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, ' +
    '    name TEXT NOT NULL, ' +
    '    type TEXT NOT NULL, ' +
    '    "pixelIdValue" TEXT NOT NULL, ' +
    '    "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP, ' +
    '    "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP ' +
    ');' +
    'CREATE INDEX IF NOT EXISTS "retargetingPixel_userId_idx" ON retargeting_pixels("userId");' +
    'CREATE TABLE IF NOT EXISTS link_retargeting_pixels ( ' +
    '    "linkId" TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE, ' +
    '    "pixelId" TEXT NOT NULL REFERENCES retargeting_pixels(id) ON DELETE CASCADE, ' +
    '    PRIMARY KEY ("linkId", "pixelId") ' +
    ');' 
  );
  console.log("SQLite schema initialized/verified.");

} else {
  console.warn(
    'DATABASE_URL is not set or DB_TYPE is not "postgres" or "sqlite". ' +
    'PrismaClient is not initialized. Some functionalities may not work.'
  );
  // @ts-ignore 
  prisma = new PrismaClient({ log: ['warn', 'error'] }); 
}

export async function ensurePostgresSchema(dbClient: Pool) {
    if (DB_TYPE !== 'postgres' || !dbClient) {
        console.log("Not a PostgreSQL environment or no pool, skipping PostgreSQL schema creation.");
        return;
    }
    console.log("Ensuring PostgreSQL schema exists...");
    try {
        await dbClient.query( 
          'CREATE TABLE IF NOT EXISTS users ( ' +
          '  id TEXT PRIMARY KEY, ' +
          '  name TEXT, ' +
          '  email TEXT UNIQUE, ' +
          '  "emailVerified" TIMESTAMPTZ, ' +
          '  image TEXT, ' +
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
          '  session_state TEXT, ' +
          '  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, ' +
          '  "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, ' +
          '  UNIQUE (provider, "providerAccountId") ' +
          ');' 
        );

        await dbClient.query( 
          'CREATE TABLE IF NOT EXISTS sessions ( ' +
          '  id TEXT PRIMARY KEY, ' +
          '  "sessionToken" TEXT NOT NULL UNIQUE, ' +
          '  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, ' +
          '  expires TIMESTAMPTZ NOT NULL, ' +
          '  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, ' +
          '  "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP ' +
          ');' 
        );

        await dbClient.query( 
          'CREATE TABLE IF NOT EXISTS verification_tokens ( ' +
          '  identifier TEXT NOT NULL, ' +
          '  token TEXT NOT NULL UNIQUE, ' +
          '  expires TIMESTAMPTZ NOT NULL, ' +
          '  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, ' +
          '  "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, ' +
          '  UNIQUE (identifier, token) ' +
          ');' 
        );

        await dbClient.query( 
          'CREATE TABLE IF NOT EXISTS api_keys ( ' +
          '  id TEXT PRIMARY KEY, ' +
          '  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, ' +
          '  name TEXT NOT NULL, ' +
          '  prefix TEXT NOT NULL UNIQUE, ' +
          '  key TEXT NOT NULL UNIQUE, ' +
          '  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, ' +
          '  "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, ' +
          '  "lastUsedAt" TIMESTAMPTZ, ' +
          '  permissions JSONB ' +
          ');' +
          'CREATE INDEX IF NOT EXISTS "apiKey_userId_idx" ON api_keys("userId");' 
        );

        await dbClient.query( 
          'CREATE TABLE IF NOT EXISTS custom_domains ( ' +
          '  id TEXT PRIMARY KEY, ' +
          '  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, ' +
          '  "domainName" TEXT NOT NULL UNIQUE, ' +
          '  verified BOOLEAN DEFAULT FALSE, ' +
          '  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, ' +
          '  "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP ' +
          ');' +
          'CREATE INDEX IF NOT EXISTS "customDomain_userId_idx" ON custom_domains("userId");' 
        );

        await dbClient.query( 
          'CREATE TABLE IF NOT EXISTS link_groups ( ' +
          '  id TEXT PRIMARY KEY, ' +
          '  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, ' +
          '  name TEXT NOT NULL, ' +
          '  description TEXT, ' +
          '  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, ' +
          '  "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP ' +
          ');' +
          'CREATE INDEX IF NOT EXISTS "linkGroup_userId_idx" ON link_groups("userId");' 
        );

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
          '  last_used_target_index INTEGER DEFAULT NULL, ' +
          '  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, ' +
          '  "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, ' +
          '  CONSTRAINT "unique_slug_on_domain" UNIQUE (slug, "customDomainId") ' +
          ');' 
        );
        await dbClient.query('CREATE INDEX IF NOT EXISTS "link_userId_idx" ON links("userId");');
        await dbClient.query('CREATE INDEX IF NOT EXISTS "link_slug_idx" ON links(slug);');
        await dbClient.query('CREATE INDEX IF NOT EXISTS "link_customDomainId_idx" ON links("customDomainId");');

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
          ');' +
          'CREATE INDEX IF NOT EXISTS "analytic_linkId_idx" ON analytic_events("linkId");' +
          'CREATE INDEX IF NOT EXISTS "analytic_timestamp_idx" ON analytic_events(timestamp);' 
        );
        
        await dbClient.query( 
          'CREATE TABLE IF NOT EXISTS retargeting_pixels ( ' +
          '  id TEXT PRIMARY KEY, ' +
          '  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, ' +
          '  name TEXT NOT NULL, ' +
          '  type TEXT NOT NULL, ' +
          '  "pixelIdValue" TEXT NOT NULL, ' +
          '  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, ' +
          '  "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP ' +
          ');' +
          'CREATE INDEX IF NOT EXISTS "retargetingPixel_userId_idx" ON retargeting_pixels("userId");' 
        );

        await dbClient.query( 
          'CREATE TABLE IF NOT EXISTS link_retargeting_pixels ( ' +
          '  "linkId" TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE, ' +
          '  "pixelId" TEXT NOT NULL REFERENCES retargeting_pixels(id) ON DELETE CASCADE, ' +
          '  PRIMARY KEY ("linkId", "pixelId") ' +
          ');' 
        );
        console.log("PostgreSQL schema initialized/verified.");
    } catch (error) {
        console.error("Error ensuring PostgreSQL schema:", error);
        throw error; 
    }
}

if (pool && DB_TYPE === 'postgres') {
    ensurePostgresSchema(pool).catch(err => {
        console.error("Failed to auto-initialize PostgreSQL schema on startup:", err);
    });
}

export { prisma, pool, DB_TYPE, clientPromise, ensurePostgresSchema };
