
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

    await dbClient.query(`

      CREATE TABLE IF NOT EXISTS domains (
        id TEXT PRIMARY KEY ,
        "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, 
        "domainName" TEXT NOT NULL UNIQUE,
        type    TEXT NOT NULL CHECK (type IN ('local','custom')),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      );` 
    );
    await dbClient.query('CREATE UNIQUE INDEX IF NOT EXISTS "userId_domainName_idx" ON domains("userId", "domainName");');

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
      '  "domainId" TEXT REFERENCES domains(id) ON DELETE SET NULL, ' +
      '  "groupId" TEXT REFERENCES link_groups(id) ON DELETE SET NULL, ' +
      '  "deepLinkConfig" JSONB, ' +
      '  "abTestConfig" JSONB, ' +
      '  targets JSONB NOT NULL, ' +
      '  last_used_target_index INTEGER DEFAULT NULL, ' + // Added this line
      '  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, ' +
      '  "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, ' +
      '  "rotation_start" TIMESTAMPTZ DEFAULT NULL, ' +
      '  "rotation_end" TIMESTAMPTZ DEFAULT NULL, ' +
      '  "click_limit" INTEGER DEFAULT NULL, ' +
      '  CONSTRAINT "unique_slug_on_domain" UNIQUE (slug, "domainId") ' +
      ');' 
    );
    await dbClient.query('CREATE INDEX IF NOT EXISTS "link_userId_idx" ON links("userId");');
    await dbClient.query('CREATE INDEX IF NOT EXISTS "link_groupId_idx" ON links("groupId");');
    await dbClient.query('CREATE INDEX IF NOT EXISTS "link_domainId_idx" ON links("domainId");');
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

    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS folders (
        id SERIAL PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      );`
    );

    await dbClient.query(`
      ALTER TABLE links
        ADD COLUMN IF NOT EXISTS "folderId" INTEGER REFERENCES folders(id) ON DELETE SET NULL;`
    );

    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price NUMERIC NOT NULL,
        period TEXT NOT NULL,
        "limit" BIGINT NOT NULL
      );`
    );
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS features (
        id SERIAL PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        label TEXT NOT NULL,
        section TEXT NOT NULL  -- 'Core' | 'Advanced' | 'Essentials'
      );`
    );
    await dbClient.query(`    
      CREATE TABLE IF NOT EXISTS plan_features (
        plan_id TEXT REFERENCES plans(id) ON DELETE CASCADE,
        feature_id INT REFERENCES features(id) ON DELETE CASCADE,
        PRIMARY KEY (plan_id, feature_id)
      );`
    );
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        "userId"          TEXT        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        "planId"          TEXT        NOT NULL REFERENCES plans(id),
        "nextBillingDate" TIMESTAMP   NULL,
        usage             BIGINT      NOT NULL DEFAULT 0,
        "limit"           BIGINT      NOT NULL
      );`
    );

    const { rowCount } = await pool.query(`SELECT 1 FROM plans LIMIT 1`);
    if (!rowCount) {
      // Insert plans
      await dbClient.query(
        `INSERT INTO plans (id,name,price,period,"limit") VALUES
          ('free','Free',0,'Monthly',50000),
          ('hobby','Hobby',5,'Monthly',0),
          ('personal','Personal',18,'Monthly',0),
          ('team','Team',48,'Monthly',0),
          ('enterprise','Enterprise',148,'Monthly',0)
        `
      );
      // Insert features, grouped by section
      const allFeatures = [
        // Core
        { key: 'users', label: 'Users', section: 'Core' },
        { key: 'domains', label: 'Custom domains', section: 'Core' },
        { key: 'branded', label: 'Branded links total', section: 'Core' },
        { key: 'automation', label: 'Link automation (year 1)', section: 'Core' },
        { key: 'redirects', label: 'Redirects', section: 'Core' },
        { key: 'clicks', label: 'Tracked clicks', section: 'Core' },
        // Advanced
        { key: 'country', label: 'Country targeting', section: 'Advanced' },
        { key: 'region', label: 'Region targeting', section: 'Advanced' },
        { key: 'expireDate', label: 'Link expiration by Date', section: 'Advanced' },
        { key: 'encryption', label: 'End-to-end link encryption', section: 'Advanced' },
        { key: 'expireClick', label: 'Link expiration by Click Limit', section: 'Advanced' },
        { key: 'cloaking', label: 'Link cloaking', section: 'Advanced' },
        { key: 'referrer', label: 'Referrer hiding', section: 'Advanced' },
        { key: 'password', label: 'Password protection', section: 'Advanced' },
        { key: 'deeplinks', label: 'Deep links', section: 'Advanced' },
        { key: 'multiteams', label: 'Multiple teams', section: 'Advanced' },
        { key: 'sso', label: 'Single sign-on (SSO)', section: 'Advanced' },
        { key: 'uptime', label: 'SLA of 99,9% uptime', section: 'Advanced' },
        { key: 'exportS3', label: 'Export raw click data to S3', section: 'Advanced' },
        { key: 'agreements', label: 'Custom agreements', section: 'Advanced' },
        { key: 'ai', label: 'AI Assistant', section: 'Advanced' },
        // Essentials
        { key: 'destUrl', label: 'Destination URL updating', section: 'Essentials' },
        { key: 'api', label: 'API', section: 'Essentials' },
        { key: 'slugEdit', label: 'URL shortcode (slug) editing', section: 'Essentials' },
        { key: 'ssl', label: "SSL (by Let's Encrypt)", section: 'Essentials' },
        { key: 'mobile', label: 'Mobile targeting', section: 'Essentials' },
        { key: 'chat', label: 'Chat support', section: 'Essentials' },
        { key: 'tags', label: 'Tags for links', section: 'Essentials' },
        { key: 'qr', label: 'QR code', section: 'Essentials' },
        { key: 'mainPage', label: 'Main page redirect', section: 'Essentials' },
        { key: '404', label: '404 redirect', section: 'Essentials' },
        { key: '301', label: '301 redirect code', section: 'Essentials' },
        { key: 'integrations', label: 'App integrations', section: 'Essentials' },
        { key: 'tools', label: 'Tools & Extensions', section: 'Essentials' },
        { key: 'utm', label: 'UTM builder', section: 'Essentials' },
        { key: 'gdpr', label: 'GDPR privacy', section: 'Essentials' },
        { key: 'import', label: 'Link import', section: 'Essentials' },
        { key: 'export', label: 'Link export', section: 'Essentials' },
        { key: 'ab', label: 'A/B Testing', section: 'Essentials' },
      ];
      for (const feat of allFeatures) {
        await dbClient.query(
          `INSERT INTO features (key, label, section) VALUES ($1,$2,$3)`,
          [feat.key, feat.label, feat.section]
        );
      }
      // Map features → plans (insert only the features each plan has)
      const planFeatureMap: Record<string, string[]> = {
        free: ['users','domains','branded','redirects','clicks'],
        hobby: ['users','domains','branded','redirects','clicks','referrer'],
        personal: ['users','domains','branded','automation','redirects','clicks','cloaking','expireDate','password'],
        team: ['users','domains','branded','automation','redirects','clicks','cloaking','expireDate','password','deeplinks','region','sso'],
        enterprise: Object.keys(allFeatures)  // all features
      };
      for (const [planId, feats] of Object.entries(planFeatureMap)) {
        for (const key of feats) {
          await dbClient.query(`
            INSERT INTO plan_features (plan_id, feature_id)
            SELECT $1, f.id FROM features f WHERE f.key = $2
          `, [planId, key]);
        }
      }
    }

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
