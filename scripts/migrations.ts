import { Pool as PgPool, PoolClient } from 'pg';
import { APP_VERSION } from '../src/lib/config'; // Corrected import path
// Assuming debugLog might be useful here, or use console.log
// import { debugLog } from '../src/lib/logging'; 

// This global pool is not directly used by runMigrations if a poolParam is passed or if it creates its own.
// It could be removed if not used by other functions in this file, or if runMigrations always self-initializes.
let pool: PgPool | null = null; 

export async function runMigrations(poolParam?: PgPool) {
  let activePool: PgPool | null = poolParam || null;
  let didCreateLocalPool = false;

  console.log('[Migrations] Starting migration process...');

  if (!activePool) {
    if (!process.env.POSTGRES_URI) {
      console.error('[Migrations] ERROR: POSTGRES_URI environment variable is not set and no pool was provided.');
      throw new Error('POSTGRES_URI environment variable is not set and no pool was provided for migrations.');
    }
    console.log('[Migrations] No pool parameter provided, creating a new local pool...');
    try {
      activePool = new PgPool({ connectionString: process.env.POSTGRES_URI });
      didCreateLocalPool = true;
      console.log('[Migrations] Local pool created successfully.');
    } catch (e: any) {
      console.error(`[Migrations] ERROR: Failed to create local pool: ${e.message}`, e.stack);
      throw e;
    }
  }

  if (!activePool) {
    // This should ideally not be reached if the above logic is correct.
    console.error('[Migrations] ERROR: PostgreSQL pool could not be initialized or provided.');
    throw new Error('PostgreSQL pool could not be initialized for migrations.');
  }

  const dbClient = await activePool.connect();
  console.log('[Migrations] Database client connected.');

  try {
    // Make sure version table exists
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS schema_versions (
        id SERIAL PRIMARY KEY,
        version TEXT NOT NULL UNIQUE, -- Added UNIQUE constraint
        applied_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('[Migrations] schema_versions table ensured.');

    const res = await dbClient.query('SELECT version FROM schema_versions ORDER BY version DESC LIMIT 1');
    const currentVersion = res.rows[0]?.version || '0.0.0';
    console.log(`[Migrations] Current schema version: ${currentVersion}`);
    console.log(`[Migrations] Target APP_VERSION: ${APP_VERSION}`);

    if (currentVersion === APP_VERSION && APP_VERSION !== '0.0.0') { // Allow migrations if APP_VERSION is 0.0.0 for initial setup
      console.log(`[Migrations] ✅ Schema is up to date at version ${APP_VERSION}`);
      return; // Return directly after releasing client in finally
    }

    // Define migrations within this function scope or ensure they can access dbClient if defined outside
    const migrations: Record<string, (client: PoolClient) => Promise<void>> = {
      // Example: '1.0.0': async (client: PoolClient) => { /* ... */ },
      // Example: 'gdpr': async (client: PoolClient) => { /* ... */ },

      '1.0.0': async (client: PoolClient) => {
        console.log("[Migration '1.0.0'] Attempting to apply initial schema...");
        try {
          await client.query('BEGIN;');
          console.log("[Migration '1.0.0'] Transaction started.");

          try {
            await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
            console.log("[Migration '1.0.0'] Ensured pgcrypto extension exists (for potential UUID generation).");
          } catch (extError: any) {
            console.warn(`[Migration '1.0.0'] Warning regarding pgcrypto extension: ${extError.message}. This may be fine if it already exists or not strictly needed by base tables.`);
          }

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
          console.log("[Migration '1.0.0'] Created users table.");

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
          console.log("[Migration '1.0.0'] Created accounts table and index.");

          await client.query( 
            `CREATE TABLE IF NOT EXISTS sessions (
              id TEXT PRIMARY KEY,
              "sessionToken" TEXT UNIQUE NOT NULL,
              "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              expires TIMESTAMPTZ NOT NULL
            );` 
          );
          console.log("[Migration '1.0.0'] Created sessions table.");

          await client.query( 
            `CREATE TABLE IF NOT EXISTS verification_tokens (
              identifier TEXT NOT NULL,
              token TEXT UNIQUE NOT NULL,
              expires TIMESTAMPTZ NOT NULL
            );` 
          );
          await client.query('CREATE UNIQUE INDEX IF NOT EXISTS "token_identifier_idx" ON verification_tokens(token, identifier);');
          console.log("[Migration '1.0.0'] Created verification_tokens table and index.");
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
          console.log("[Migration '1.0.0'] Created custom_domains table and index.");
          
          await dbClient.query( 
            'CREATE TABLE IF NOT EXISTS sub_domains ( ' +
            '  id TEXT PRIMARY KEY, ' +
            '  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, ' +
            '  "subdomainName" TEXT NOT NULL, ' +
            '  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, ' +
            '  "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP ' +
            ');' 
          );
          await dbClient.query('CREATE UNIQUE INDEX IF NOT EXISTS "userId_subdomainName_idx" ON sub_domains("userId", "subdomainName");');
          console.log("[Migration '1.0.0'] Created sub_domains table and index.");

          await client.query(
            `CREATE TABLE IF NOT EXISTS campaign_templates (
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
          console.log("[Migration '1.0.0'] Created campaign_templates table.");

          await client.query( 
            `CREATE TABLE IF NOT EXISTS api_keys (
              id TEXT PRIMARY KEY,
              "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              name TEXT NOT NULL,
              "hashedKey" TEXT NOT NULL UNIQUE,
              prefix TEXT NOT NULL,
              permissions TEXT[],
              "lastUsedAt" TIMESTAMPTZ,
              "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );` 
          );
          await client.query('CREATE INDEX IF NOT EXISTS "apiKey_userId_idx" ON api_keys("userId");');
          await client.query('CREATE INDEX IF NOT EXISTS "apiKey_updatedAt_idx" ON api_keys("updatedAt");');
          console.log("[Migration '1.0.0'] Created api_keys table and indexes.");

          await client.query(
            `CREATE TABLE IF NOT EXISTS user_preferences (
              "userId" TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
              theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
              "isCompactMode" BOOLEAN DEFAULT FALSE,
              "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
          `);
          console.log("[Migration '1.0.0'] Created user_preferences table.");

          await client.query( 
            `CREATE TABLE IF NOT EXISTS link_groups (
              id TEXT PRIMARY KEY,
              "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              name TEXT NOT NULL,
              description TEXT,
              "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );` 
          );
          await client.query('CREATE UNIQUE INDEX IF NOT EXISTS "userId_link_group_name_idx" ON link_groups("userId", name);');
          console.log("[Migration '1.0.0'] Created link_groups table and index.");

          await client.query( 
            `CREATE TABLE IF NOT EXISTS retargeting_pixels (
              id TEXT PRIMARY KEY,
              "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              name TEXT NOT NULL,
              type TEXT NOT NULL,
              "pixelIdValue" TEXT NOT NULL,
              "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );` 
          );
          await client.query('CREATE UNIQUE INDEX IF NOT EXISTS "userId_retargeting_pixel_name_idx" ON retargeting_pixels("userId", name);');
          await client.query('CREATE INDEX IF NOT EXISTS "retargetingPixel_userId_idx" ON retargeting_pixels("userId");');
          console.log("[Migration '1.0.0'] Created retargeting_pixels table and indexes.");

          await client.query(
            `CREATE TABLE IF NOT EXISTS team_memberships (
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
          console.log("[Migration '1.0.0'] Created team_memberships table and indexes.");

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
          await dbClient.query('CREATE INDEX IF NOT EXISTS "link_domainId_idx" ON links("customDomainId");');
          await dbClient.query('CREATE INDEX IF NOT EXISTS "link_slug_idx" ON links(slug);');
          console.log("[Migration '1.0.0'] Created links table and indexes.");

          await client.query( 
            `CREATE TABLE IF NOT EXISTS link_retargeting_pixels (
              "linkId" TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE,
              "pixelId" TEXT NOT NULL REFERENCES retargeting_pixels(id) ON DELETE CASCADE,
              PRIMARY KEY ("linkId", "pixelId")
            );` 
          );
          console.log("[Migration '1.0.0'] Created link_retargeting_pixels table.");

          await client.query( 
            `CREATE TABLE IF NOT EXISTS analytic_events (
              id TEXT PRIMARY KEY,
              "linkId" TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE,
              timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
              "ipAddress" TEXT,
              "userAgent" TEXT,
              country TEXT,
              city TEXT,
              "deviceType" TEXT,
              browser TEXT,
              os TEXT,
              referrer TEXT
            );` 
          );
          await client.query('CREATE INDEX IF NOT EXISTS "analytic_event_linkId_idx" ON analytic_events("linkId");');
          await client.query('CREATE INDEX IF NOT EXISTS "analytic_event_timestamp_idx" ON analytic_events(timestamp);');
          await client.query('CREATE INDEX IF NOT EXISTS "analytic_event_country_idx" ON analytic_events(country);');
          await client.query('CREATE INDEX IF NOT EXISTS "analytic_event_deviceType_idx" ON analytic_events("deviceType");');
          console.log("[Migration '1.0.0'] Created analytic_events table and indexes.");

          await client.query('COMMIT;');
          console.log("[Migration '1.0.0'] Initial schema applied successfully (committed).");
        } catch (err: any) {
          await client.query('ROLLBACK;');
          console.error(`[Migration '1.0.0'] ERROR: ${err.message}`, err.stack);
          throw err;
        }
      },

      '1.0.1': async (client: PoolClient) => {
        console.log("[Migration '1.0.1'] Attempting to apply...");
        try {
          await client.query('BEGIN;');
          console.log("[Migration '1.0.1'] Transaction started.");

          await client.query(`
            ALTER TABLE links ADD COLUMN "rotation_start" TIMESTAMPTZ;` 
          );
          await client.query(`
            ALTER TABLE links ADD COLUMN "rotation_end" TIMESTAMPTZ;` 
          );
          await client.query(`
            ALTER TABLE links ADD COLUMN "click_limit" INTEGER;` 
          );

          console.log("[Migration '1.0.1'] Links table rotation columns added.");

          // Check if custom_domains table exists before trying to select from it
          const customDomainsTableExistsRes = await client.query("SELECT to_regclass('custom_domains') AS name;");
          const subDomainsTableExistsRes = await client.query("SELECT to_regclass('sub_domains') AS name;");

          await client.query(`
              DO $$
              BEGIN
                IF NOT EXISTS (
                  SELECT 1
                  FROM information_schema.columns
                  WHERE table_name = 'links' AND column_name = 'domainId'
                ) THEN
                  ALTER TABLE links ADD COLUMN "domainId" TEXT;
                  RAISE NOTICE '[Migration ''1.0.1''] Column "domainId" added to links table.';
                ELSE
                  RAISE NOTICE '[Migration ''1.0.1''] Column "domainId" already exists in links table.';
                END IF;
              END
              $$;
          `);

          await client.query(`
              CREATE TABLE IF NOT EXISTS domains (
                  id TEXT PRIMARY KEY,
                  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, 
                  "domainName" TEXT NOT NULL UNIQUE,
                  type TEXT NOT NULL CHECK (type IN ('local','custom')),
                  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
                  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
              );` 
          );
          await client.query('CREATE UNIQUE INDEX IF NOT EXISTS "userId_domainName_idx" ON domains("userId", "domainName");');
          console.log("[Migration '1.0.1'] Domains table and index ensured.");

          if (customDomainsTableExistsRes.rows[0]?.name) {
            console.log("[Migration '1.0.1'] custom_domains table exists. Migrating data...");
            await client.query(`
                INSERT INTO domains (id, "userId", "domainName", "createdAt", "updatedAt", "type")
                    SELECT 
                    id,
                    "userId",
                    "domainName",
                    "createdAt",
                    "updatedAt",
                    'custom'
                    FROM custom_domains
                ON CONFLICT (id) DO NOTHING; -- Avoid errors if data somehow already migrated
            `);
            console.log("[Migration '1.0.1'] Data from custom_domains migrated.");
          } else {
            console.log("[Migration '1.0.1'] custom_domains table does not exist. Skipping data migration.");
          }

          if (subDomainsTableExistsRes.rows[0]?.name) {
            console.log("[Migration '1.0.1'] sub_domains table exists. Migrating data...");
            await client.query(`
                INSERT INTO domains (id, "userId", "domainName", "createdAt", "updatedAt", "type")
                    SELECT 
                    id,
                    "userId",
                    "subdomainName" AS "domainName", -- Corrected from previous feedback
                    "createdAt",
                    "updatedAt",
                    'local'
                    FROM sub_domains
                ON CONFLICT (id) DO NOTHING; -- Avoid errors
            `);
            console.log("[Migration '1.0.1'] Data from sub_domains migrated.");
          } else {
            console.log("[Migration '1.0.1'] sub_domains table does not exist. Skipping data migration.");
          }
          
          await client.query('CREATE INDEX IF NOT EXISTS "link_domainId_idx" ON links("domainId");');
          console.log("[Migration '1.0.1'] Index on links(domainId) ensured.");

          await client.query(
            `CREATE TABLE IF NOT EXISTS folders (
              id SERIAL PRIMARY KEY,
              "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              name TEXT NOT NULL,
              "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
            );`
          );
          console.log("[Migration '1.0.0'] Created folders table.");

          await client.query(
            `ALTER TABLE links
              ADD COLUMN IF NOT EXISTS "folderId" INTEGER REFERENCES folders(id) ON DELETE SET NULL;`
          );
          console.log("[Migration '1.0.0'] Altered links table for folderId.");

          await client.query(
            `CREATE TABLE IF NOT EXISTS plans (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              price NUMERIC NOT NULL,
              period TEXT NOT NULL,
              "limit" BIGINT NOT NULL
            );`
          );
          console.log("[Migration '1.0.0'] Created plans table.");

          await client.query(
            `CREATE TABLE IF NOT EXISTS features (
              id SERIAL PRIMARY KEY,
              key TEXT UNIQUE NOT NULL,
              label TEXT NOT NULL,
              section TEXT NOT NULL
            );`
          );
          console.log("[Migration '1.0.0'] Created features table.");
          
          await client.query(
            `CREATE TABLE IF NOT EXISTS plan_features (
              plan_id TEXT REFERENCES plans(id) ON DELETE CASCADE,
              feature_id INT REFERENCES features(id) ON DELETE CASCADE,
              PRIMARY KEY (plan_id, feature_id)
            );`
          );
          console.log("[Migration '1.0.0'] Created plan_features table.");

          await client.query(
            `CREATE TABLE IF NOT EXISTS subscriptions (
              "userId"          TEXT        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
              "planId"          TEXT        NOT NULL REFERENCES plans(id),
              "nextBillingDate" TIMESTAMP   NULL,
              usage             BIGINT      NOT NULL DEFAULT 0,
              "limit"           BIGINT      NOT NULL
            );`
          );
          console.log("[Migration '1.0.0'] Created subscriptions table.");

          // Seed initial data for plans and features
          const { rowCount: planRowCount } = await client.query('SELECT 1 FROM plans LIMIT 1');
          if (!planRowCount) {
            await client.query(
              `INSERT INTO plans (id,name,price,period,"limit") VALUES
                ('free','Free',0,'Monthly',50000),
                ('hobby','Hobby',5,'Monthly',0),
                ('personal','Personal',18,'Monthly',0),
                ('team','Team',48,'Monthly',0),
                ('enterprise','Enterprise',148,'Monthly',0)
              ;`
            );
            console.log("[Migration '1.0.0'] Seeded plans data.");

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
              await client.query('INSERT INTO features (key, label, section) VALUES ($1,$2,$3);', [feat.key, feat.label, feat.section]);
            }
            console.log("[Migration '1.0.0'] Seeded features data.");

            const planFeatureMap: Record<string, string[]> = {
              free: ['users','domains','branded','redirects','clicks'],
              hobby: ['users','domains','branded','redirects','clicks','referrer'],
              personal: ['users','domains','branded','automation','redirects','clicks','cloaking','expireDate','password'],
              team: ['users','domains','branded','automation','redirects','clicks','cloaking','expireDate','password','deeplinks','region','sso'],
              enterprise: allFeatures.map(f => f.key)
            };
            for (const [planId, feats] of Object.entries(planFeatureMap)) {
              for (const key of feats) {
                await client.query('INSERT INTO plan_features (plan_id, feature_id) SELECT $1, f.id FROM features f WHERE f.key = $2;', [planId, key]);
              }
            }
            console.log("[Migration '1.0.0'] Seeded plan_features data.");
          } else {
            console.log("[Migration '1.0.0'] Plans data already exists, skipping seed.");
          }

          await client.query('COMMIT;');
          console.log("[Migration '1.0.1'] Applied successfully (committed).");
        } catch (err: any) {
          await client.query('ROLLBACK;');
          console.error(`[Migration '1.0.1'] ERROR: ${err.message}`, err.stack);
          throw err; // Re-throw to stop further processing in runMigrations if a single migration fails
        }
      },

      '1.0.2_gdpr_compliance': async (client: PoolClient) => {
        console.log("[Migration '1.0.2_gdpr_compliance'] Attempting to apply GDPR schema changes...");
        try {
          await client.query('BEGIN;');
          console.log("[Migration '1.0.2_gdpr_compliance'] Transaction started.");

          try {
            // pgcrypto is needed for gen_random_uuid() used in user_consents table
            await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
            console.log("[Migration '1.0.2_gdpr_compliance'] Ensured pgcrypto extension exists.");
          } catch (extError: any) {
            console.warn(`[Migration '1.0.2_gdpr_compliance'] Warning regarding pgcrypto extension: ${extError.message}. This may be fine if it already exists or if an alternative UUID function is used.`);
          }

          await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMPTZ;');
          console.log("[Migration '1.0.2_gdpr_compliance'] Altered users table: added termsAcceptedAt.");

          await client.query('ALTER TABLE domains ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE NOT NULL;');
          console.log("[Migration '1.0.2_gdpr_compliance'] Altered domains table: added verified.");
          
          // Ensure api_keys.updatedAt column exists and backfill if necessary
          // The '1.0.0' migration already adds this with a DEFAULT. This is for robustness.
          await client.query('ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ;');
          console.log("[Migration '1.0.2_gdpr_compliance'] Ensured api_keys.updatedAt column exists.");
          await client.query('UPDATE api_keys SET "updatedAt" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP) WHERE "updatedAt" IS NULL;');
          console.log("[Migration '1.0.2_gdpr_compliance'] Backfilled api_keys.updatedAt where it was NULL.");

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
          console.log("[Migration '1.0.2_gdpr_compliance'] Created user_consents table.");

          await client.query('CREATE INDEX IF NOT EXISTS "userConsents_userId_idx" ON user_consents("userId");');
          console.log("[Migration '1.0.2_gdpr_compliance'] Created index on user_consents(userId).");
          
          await client.query('COMMIT;');
          console.log("[Migration '1.0.2_gdpr_compliance'] GDPR schema changes applied successfully (committed).");
        } catch (err: any) {
          await client.query('ROLLBACK;');
          console.error(`[Migration '1.0.2_gdpr_compliance'] ERROR: ${err.message}`, err.stack);
          throw err;
        }
      }
      // New migrations will be added here
    };

    const migrationVersions = Object.keys(migrations).sort();
    let migrationAppliedInThisRun = false;

    for (const version of migrationVersions) {
      if (version > currentVersion && version <= APP_VERSION) {
        console.log(`[Migrations] ⚙️  Running migration for version ${version}...`);
        await migrations[version](dbClient); 
        migrationAppliedInThisRun = true; 
      } else {
        console.log(`[Migrations] Skipping migration for version ${version} (current: ${currentVersion}, APP_VERSION: ${APP_VERSION})`);
      }
    }
    
    if (currentVersion < APP_VERSION && (migrationAppliedInThisRun || Object.keys(migrations).filter(v => v > currentVersion && v <= APP_VERSION).length > 0) ) {
        const appVersionEntry = await dbClient.query('SELECT version FROM schema_versions WHERE version = $1', [APP_VERSION]);
        if(appVersionEntry.rowCount === 0) {
            await dbClient.query('INSERT INTO schema_versions (version) VALUES ($1)', [APP_VERSION]);
            console.log(`[Migrations] ✅ Schema version updated to ${APP_VERSION} in schema_versions table.`);
        } else {
            console.log(`[Migrations] ✅ Schema version ${APP_VERSION} already recorded.`);
        }
    } else if (migrationAppliedInThisRun) {
        console.log('[Migrations] Migrations ran, but current APP_VERSION was not targeted or already met.');
    } else if (currentVersion === APP_VERSION && APP_VERSION !== '0.0.0'){
        // Already logged as up to date
    } else {
        console.log('[Migrations] No new migrations to apply for the current APP_VERSION.');
    }

  } catch (error: any) {
    console.error(`[Migrations] CRITICAL ERROR during migration process: ${error.message}`, error.stack);
    throw error; 
  } finally {
    if (dbClient) {
      dbClient.release();
      console.log('[Migrations] Database client released.');
    }
    if (didCreateLocalPool && activePool) {
      await activePool.end();
      console.log('[Migrations] Locally created pool closed.');
    }
  }
}