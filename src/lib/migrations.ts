import { Pool, PoolClient } from 'pg';
import { debugLog } from '@/lib/logging'; // Assuming debugLog is available

// 1.a. Define an interface for a migration object
export interface Migration {
  version: string;
  description: string;
  up: (client: PoolClient) => Promise<void>; // Migration operates on an active client, within a transaction
}

// 1.b. Create an array to hold all migration objects
const migrations: Migration[] = [];

// --- Initial Schema Setup Migration ---
const initialSchemaMigration: Migration = {
  version: '000_initial_schema',
  description: 'Create all base tables and seed initial data for the application.',
  up: async (client: PoolClient) => {
    debugLog('[Migration 000_initial_schema] Starting initial schema setup.');

    await client.query( 
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
    debugLog('[Migration 000_initial_schema] Created users table.');

    await client.query( 
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
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS "provider_providerAccountId_idx" ON accounts(provider, "providerAccountId");');
    debugLog('[Migration 000_initial_schema] Created accounts table and index.');

    await client.query( 
      'CREATE TABLE IF NOT EXISTS sessions ( ' +
      '  id TEXT PRIMARY KEY, ' +
      '  "sessionToken" TEXT UNIQUE NOT NULL, ' +
      '  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, ' +
      '  expires TIMESTAMPTZ NOT NULL ' +
      ');' 
    );
    debugLog('[Migration 000_initial_schema] Created sessions table.');

    await client.query( 
      'CREATE TABLE IF NOT EXISTS verification_tokens ( ' +
      '  identifier TEXT NOT NULL, ' +
      '  token TEXT UNIQUE NOT NULL, ' +
      '  expires TIMESTAMPTZ NOT NULL ' +
      ');' 
    );
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS "token_identifier_idx" ON verification_tokens(token, identifier);');
    debugLog('[Migration 000_initial_schema] Created verification_tokens table and index.');

    await client.query(`
      CREATE TABLE IF NOT EXISTS domains (
        id TEXT PRIMARY KEY ,
        "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, 
        "domainName" TEXT NOT NULL UNIQUE,
        type    TEXT NOT NULL CHECK (type IN ('local','custom')),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      );` 
    );
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS "userId_domainName_idx" ON domains("userId", "domainName");');
    debugLog('[Migration 000_initial_schema] Created domains table and index.');

    await client.query(` 
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
    debugLog('[Migration 000_initial_schema] Created campaign_templates table.');

    await client.query( 
      'CREATE TABLE IF NOT EXISTS api_keys ( ' +
      '  id TEXT PRIMARY KEY, ' +
      '  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, ' +
      '  name TEXT NOT NULL, ' +
      '  "hashedKey" TEXT NOT NULL UNIQUE, ' +
      '  prefix TEXT NOT NULL, ' +
      '  permissions TEXT[], ' +
      '  "lastUsedAt" TIMESTAMPTZ, ' +
      '  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, ' +
      // "updatedAt" will be added by gdpr_001 migration
      ');' 
    );
    await client.query('CREATE INDEX IF NOT EXISTS "apiKey_userId_idx" ON api_keys("userId");');
    // Index for "updatedAt" will be added with gdpr_001 if it creates the column, or should be added there.
    // For base schema, if updatedAt is not there, its index shouldn't be either.
    // The gdpr_001 migration ensures updatedAt exists and is backfilled, so it can also ensure the index.
    // Let's assume the base definition in createPostgresTables *did* have updatedAt for api_keys.
    // The previous task (Subtask 12, Turn 1) confirmed `api_keys.updatedAt` was part of the original schema.
    await client.query('ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;');
    await client.query('CREATE INDEX IF NOT EXISTS "apiKey_updatedAt_idx" ON api_keys("updatedAt");');
    debugLog('[Migration 000_initial_schema] Created api_keys table and indexes.');


    await client.query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        "userId" TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
        "isCompactMode" BOOLEAN DEFAULT FALSE,
        "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    debugLog('[Migration 000_initial_schema] Created user_preferences table.');

    await client.query( 
      'CREATE TABLE IF NOT EXISTS link_groups ( ' +
      '  id TEXT PRIMARY KEY, ' +
      '  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, ' +
      '  name TEXT NOT NULL, ' +
      '  description TEXT, ' +
      '  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, ' +
      '  "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP ' +
      ');' 
    );
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS "userId_link_group_name_idx" ON link_groups("userId", name);');
    debugLog('[Migration 000_initial_schema] Created link_groups table and index.');

    await client.query( 
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
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS "userId_retargeting_pixel_name_idx" ON retargeting_pixels("userId", name);');
    await client.query('CREATE INDEX IF NOT EXISTS "retargetingPixel_userId_idx" ON retargeting_pixels("userId");');
    debugLog('[Migration 000_initial_schema] Created retargeting_pixels table and indexes.');

    await client.query(`
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
    await client.query('CREATE INDEX IF NOT EXISTS "teamMembership_teamOwnerId_idx" ON team_memberships("teamOwnerId");');
    await client.query('CREATE INDEX IF NOT EXISTS "teamMembership_memberUserId_idx" ON team_memberships("memberUserId");');
    debugLog('[Migration 000_initial_schema] Created team_memberships table and indexes.');

    await client.query( 
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
      '  last_used_target_index INTEGER DEFAULT NULL, ' +
      '  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, ' +
      '  "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, ' +
      '  "rotation_start" TIMESTAMPTZ DEFAULT NULL, ' +
      '  "rotation_end" TIMESTAMPTZ DEFAULT NULL, ' +
      '  "click_limit" INTEGER DEFAULT NULL, ' +
      '  CONSTRAINT "unique_slug_on_domain" UNIQUE (slug, "domainId") ' +
      ');' 
    );
    await client.query('CREATE INDEX IF NOT EXISTS "link_userId_idx" ON links("userId");');
    await client.query('CREATE INDEX IF NOT EXISTS "link_groupId_idx" ON links("groupId");');
    await client.query('CREATE INDEX IF NOT EXISTS "link_domainId_idx" ON links("domainId");');
    await client.query('CREATE INDEX IF NOT EXISTS "link_slug_idx" ON links(slug);');
    debugLog('[Migration 000_initial_schema] Created links table and indexes.');

    await client.query( 
      'CREATE TABLE IF NOT EXISTS link_retargeting_pixels ( ' +
      '  "linkId" TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE, ' +
      '  "pixelId" TEXT NOT NULL REFERENCES retargeting_pixels(id) ON DELETE CASCADE, ' +
      '  PRIMARY KEY ("linkId", "pixelId") ' +
      ');' 
    );
    debugLog('[Migration 000_initial_schema] Created link_retargeting_pixels table.');

    await client.query( 
      'CREATE TABLE IF NOT EXISTS analytic_events ( ' +
      '  id TEXT PRIMARY KEY, ' +
      '  "linkId" TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE, ' +
      '  timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, ' +
      '  "ipAddress" TEXT, ' + // Anonymized IP
      '  "userAgent" TEXT, ' + // Raw User Agent (will be NULL as per later GDPR changes)
      '  country TEXT, ' +
      '  city TEXT, ' +
      '  "deviceType" TEXT, ' +
      '  browser TEXT, ' +
      '  os TEXT, ' +
      '  referrer TEXT ' + // Referrer hostname
      ');' 
    );
    await client.query('CREATE INDEX IF NOT EXISTS "analytic_event_linkId_idx" ON analytic_events("linkId");');
    await client.query('CREATE INDEX IF NOT EXISTS "analytic_event_timestamp_idx" ON analytic_events(timestamp);' );
    await client.query('CREATE INDEX IF NOT EXISTS "analytic_event_country_idx" ON analytic_events(country);' );
    await client.query('CREATE INDEX IF NOT EXISTS "analytic_event_deviceType_idx" ON analytic_events("deviceType");' );
    debugLog('[Migration 000_initial_schema] Created analytic_events table and indexes.');

    await client.query(`
      CREATE TABLE IF NOT EXISTS folders (
        id SERIAL PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      );`
    );
    debugLog('[Migration 000_initial_schema] Created folders table.');

    await client.query(`
      ALTER TABLE links
        ADD COLUMN IF NOT EXISTS "folderId" INTEGER REFERENCES folders(id) ON DELETE SET NULL;`
    );
    debugLog('[Migration 000_initial_schema] Altered links table for folderId.');

    await client.query(`
      CREATE TABLE IF NOT EXISTS plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price NUMERIC NOT NULL,
        period TEXT NOT NULL,
        "limit" BIGINT NOT NULL
      );`
    );
    debugLog('[Migration 000_initial_schema] Created plans table.');

    await client.query(`
      CREATE TABLE IF NOT EXISTS features (
        id SERIAL PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        label TEXT NOT NULL,
        section TEXT NOT NULL
      );`
    );
    debugLog('[Migration 000_initial_schema] Created features table.');
    
    await client.query(`    
      CREATE TABLE IF NOT EXISTS plan_features (
        plan_id TEXT REFERENCES plans(id) ON DELETE CASCADE,
        feature_id INT REFERENCES features(id) ON DELETE CASCADE,
        PRIMARY KEY (plan_id, feature_id)
      );`
    );
    debugLog('[Migration 000_initial_schema] Created plan_features table.');

    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        "userId"          TEXT        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        "planId"          TEXT        NOT NULL REFERENCES plans(id),
        "nextBillingDate" TIMESTAMP   NULL,
        usage             BIGINT      NOT NULL DEFAULT 0,
        "limit"           BIGINT      NOT NULL
      );`
    );
    debugLog('[Migration 000_initial_schema] Created subscriptions table.');

    // Seed initial data for plans and features
    const { rowCount: planRowCount } = await client.query(`SELECT 1 FROM plans LIMIT 1`);
    if (!planRowCount) {
      await client.query(
        `INSERT INTO plans (id,name,price,period,"limit") VALUES
          ('free','Free',0,'Monthly',50000),
          ('hobby','Hobby',5,'Monthly',0),
          ('personal','Personal',18,'Monthly',0),
          ('team','Team',48,'Monthly',0),
          ('enterprise','Enterprise',148,'Monthly',0)
        `
      );
      debugLog('[Migration 000_initial_schema] Seeded plans data.');

      const allFeatures = [
        { key: 'users', label: 'Users', section: 'Core' }, { key: 'domains', label: 'Custom domains', section: 'Core' },
        { key: 'branded', label: 'Branded links total', section: 'Core' }, { key: 'automation', label: 'Link automation (year 1)', section: 'Core' },
        { key: 'redirects', label: 'Redirects', section: 'Core' }, { key: 'clicks', label: 'Tracked clicks', section: 'Core' },
        { key: 'country', label: 'Country targeting', section: 'Advanced' }, { key: 'region', label: 'Region targeting', section: 'Advanced' },
        { key: 'expireDate', label: 'Link expiration by Date', section: 'Advanced' }, { key: 'encryption', label: 'End-to-end link encryption', section: 'Advanced' },
        { key: 'expireClick', label: 'Link expiration by Click Limit', section: 'Advanced' }, { key: 'cloaking', label: 'Link cloaking', section: 'Advanced' },
        { key: 'referrer', label: 'Referrer hiding', section: 'Advanced' }, { key: 'password', label: 'Password protection', section: 'Advanced' },
        { key: 'deeplinks', label: 'Deep links', section: 'Advanced' }, { key: 'multiteams', label: 'Multiple teams', section: 'Advanced' },
        { key: 'sso', label: 'Single sign-on (SSO)', section: 'Advanced' }, { key: 'uptime', label: 'SLA of 99,9% uptime', section: 'Advanced' },
        { key: 'exportS3', label: 'Export raw click data to S3', section: 'Advanced' }, { key: 'agreements', label: 'Custom agreements', section: 'Advanced' },
        { key: 'ai', label: 'AI Assistant', section: 'Advanced' }, { key: 'destUrl', label: 'Destination URL updating', section: 'Essentials' },
        { key: 'api', label: 'API', section: 'Essentials' }, { key: 'slugEdit', label: 'URL shortcode (slug) editing', section: 'Essentials' },
        { key: 'ssl', label: "SSL (by Let's Encrypt)", section: 'Essentials' }, { key: 'mobile', label: 'Mobile targeting', section: 'Essentials' },
        { key: 'chat', label: 'Chat support', section: 'Essentials' }, { key: 'tags', label: 'Tags for links', section: 'Essentials' },
        { key: 'qr', label: 'QR code', section: 'Essentials' }, { key: 'mainPage', label: 'Main page redirect', section: 'Essentials' },
        { key: '404', label: '404 redirect', section: 'Essentials' }, { key: '301', label: '301 redirect code', section: 'Essentials' },
        { key: 'integrations', label: 'App integrations', section: 'Essentials' }, { key: 'tools', label: 'Tools & Extensions', section: 'Essentials' },
        { key: 'utm', label: 'UTM builder', section: 'Essentials' }, { key: 'gdpr', label: 'GDPR privacy', section: 'Essentials' },
        { key: 'import', label: 'Link import', section: 'Essentials' }, { key: 'export', label: 'Link export', section: 'Essentials' },
        { key: 'ab', label: 'A/B Testing', section: 'Essentials' },
      ];
      for (const feat of allFeatures) {
        await client.query(`INSERT INTO features (key, label, section) VALUES ($1,$2,$3)`, [feat.key, feat.label, feat.section]);
      }
      debugLog('[Migration 000_initial_schema] Seeded features data.');

      const planFeatureMap: Record<string, string[]> = {
        free: ['users','domains','branded','redirects','clicks'],
        hobby: ['users','domains','branded','redirects','clicks','referrer'],
        personal: ['users','domains','branded','automation','redirects','clicks','cloaking','expireDate','password'],
        team: ['users','domains','branded','automation','redirects','clicks','cloaking','expireDate','password','deeplinks','region','sso'],
        enterprise: allFeatures.map(f => f.key)
      };
      for (const [planId, feats] of Object.entries(planFeatureMap)) {
        for (const key of feats) {
          await client.query(`INSERT INTO plan_features (plan_id, feature_id) SELECT $1, f.id FROM features f WHERE f.key = $2`, [planId, key]);
        }
      }
      debugLog('[Migration 000_initial_schema] Seeded plan_features data.');
    } else {
      debugLog('[Migration 000_initial_schema] Plans data already exists, skipping seed.');
    }
    debugLog('[Migration 000_initial_schema] Initial schema setup finished.');
  }
};

// --- GDPR Migration (already defined in previous step) ---
const gdprMigration: Migration = {
  version: 'gdpr_001',
  description: 'Add GDPR compliance columns (termsAcceptedAt, domains.verified) and user_consents table.',
  up: async (client: PoolClient) => {
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
      debugLog('[Migration gdpr_001] Ensured pgcrypto extension exists.');
    } catch (extError: any) {
      console.warn(`[Migration gdpr_001] Warning regarding pgcrypto extension: ${extError.message}. This may be fine if it already exists.`);
    }

    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMPTZ;');
    debugLog('[Migration gdpr_001] Altered users table for termsAcceptedAt.');

    await client.query('ALTER TABLE domains ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE NOT NULL;');
    debugLog('[Migration gdpr_001] Altered domains table for verified.');
    
    await client.query('ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ;');
    debugLog('[Migration gdpr_001] Ensured api_keys.updatedAt column exists.');
    await client.query('UPDATE api_keys SET "updatedAt" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP) WHERE "updatedAt" IS NULL;');
    debugLog('[Migration gdpr_001] Backfilled api_keys.updatedAt where NULL.');

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_consents (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "consentType" TEXT NOT NULL,
        "isGiven" BOOLEAN NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "unique_user_consent" UNIQUE ("userId", "consentType")
      );
    `);
    debugLog('[Migration gdpr_001] Created user_consents table.');

    await client.query('CREATE INDEX IF NOT EXISTS "userConsents_userId_idx" ON user_consents("userId");');
    debugLog('[Migration gdpr_001] Created index on user_consents(userId).');
  }
};

// Add migrations to the array in the desired logical order (sorting by version will handle actual execution order)
migrations.push(initialSchemaMigration); // Runs first due to version '000_...'
migrations.push(gdprMigration);          // Runs after '000_...'

// --- Migration Application Logic ---
export async function applyMigrations(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        description TEXT,
        applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    debugLog('[Migrations] Ensured schema_migrations table exists.');

    const appliedMigrationsResult = await client.query('SELECT version FROM schema_migrations ORDER BY version ASC;');
    const appliedVersions = appliedMigrationsResult.rows.map(row => row.version);
    debugLog('[Migrations] Previously applied migration versions:', appliedVersions);

    const sortedMigrations = [...migrations].sort((a, b) => a.version.localeCompare(b.version));

    for (const migration of sortedMigrations) {
      if (!appliedVersions.includes(migration.version)) {
        debugLog(`[Migrations] Attempting to apply migration ${migration.version}: ${migration.description}`);
        try {
          await client.query('BEGIN;');
          await migration.up(client);
          await client.query(
            'INSERT INTO schema_migrations (version, description, applied_at) VALUES ($1, $2, CURRENT_TIMESTAMP);',
            [migration.version, migration.description]
          );
          await client.query('COMMIT;');
          console.log(`[Migrations] Migration ${migration.version} applied successfully.`);
        } catch (err: any) {
          await client.query('ROLLBACK;');
          console.error(`[Migrations] Error applying migration ${migration.version}: ${err.message}`, err.stack);
          throw new Error(`Failed to apply migration ${migration.version}. Error: ${err.message}`);
        }
      } else {
        debugLog(`[Migrations] Migration ${migration.version} already applied. Skipping.`);
      }
    }
    console.log('[Migrations] All applicable migrations checked/applied.');
  } catch (error: any) {
    console.error(`[Migrations] Migration process failed: ${error.message}`, error.stack);
    throw error; 
  } finally {
    client.release();
  }
}

/*
// Example of how to add more migrations:
const anotherMigration: Migration = {
  version: 'feature_002', // Ensure versions are unique and sortable
  description: 'Adds a new feature table.',
  up: async (client: PoolClient) => {
    await client.query('CREATE TABLE IF NOT EXISTS new_feature_table (id SERIAL PRIMARY KEY, name TEXT);');
    debugLog('[Migration feature_002] Created new_feature_table.');
  }
};
migrations.push(anotherMigration);
*/
