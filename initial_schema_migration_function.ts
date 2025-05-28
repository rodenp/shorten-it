async (client: PoolClient) => {
  console.log("[Migration '1.0.0'] Attempting to apply initial schema...");
  try {
    await client.query('BEGIN;');
    console.log("[Migration '1.0.0'] Transaction started.");

    // Pgcrypto for gen_random_uuid() - often used for IDs in other migrations
    // Though not strictly part of base schema, it's a common utility.
    // If it fails (e.g. permissions), the rest of the migration might still proceed if not reliant on gen_random_uuid() for defaults.
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
      console.log("[Migration '1.0.0'] Ensured pgcrypto extension exists.");
    } catch (extError: any) {
      console.warn(`[Migration '1.0.0'] Warning regarding pgcrypto extension: ${extError.message}. This may be fine if it already exists or is not strictly needed by base table defaults.`);
    }

    // users table
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
    console.log("[Migration '1.0.0'] Users table created.");

    // accounts table
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
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS "provider_providerAccountId_idx" ON accounts(provider, "providerAccountId");');
    console.log("[Migration '1.0.0'] Accounts table and index created.");

    // sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        "sessionToken" TEXT UNIQUE NOT NULL,
        "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires TIMESTAMPTZ NOT NULL
      );
    `);
    console.log("[Migration '1.0.0'] Sessions table created.");

    // verification_tokens table
    await client.query(`
      CREATE TABLE IF NOT EXISTS verification_tokens (
        identifier TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires TIMESTAMPTZ NOT NULL
      );
    `);
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS "token_identifier_idx" ON verification_tokens(token, identifier);');
    console.log("[Migration '1.0.0'] Verification_tokens table and index created.");

    // domains table
    await client.query(`
      CREATE TABLE IF NOT EXISTS domains (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "domainName" TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL CHECK (type IN ('local','custom')),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS "userId_domainName_idx" ON domains("userId", "domainName");');
    console.log("[Migration '1.0.0'] Domains table and index created.");

    // campaign_templates table
    await client.query(`
      CREATE TABLE IF NOT EXISTS campaign_templates (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        source TEXT,
        medium TEXT,
        campaign TEXT,
        term TEXT,
        content TEXT,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log("[Migration '1.0.0'] Campaign_templates table created.");

    // api_keys table
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        "hashedKey" TEXT NOT NULL UNIQUE,
        prefix TEXT NOT NULL,
        permissions TEXT[],
        "lastUsedAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query('CREATE INDEX IF NOT EXISTS "apiKey_userId_idx" ON api_keys("userId");');
    await client.query('CREATE INDEX IF NOT EXISTS "apiKey_updatedAt_idx" ON api_keys("updatedAt");');
    console.log("[Migration '1.0.0'] Api_keys table and indexes created.");

    // user_preferences table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        "userId" TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
        "isCompactMode" BOOLEAN DEFAULT FALSE,
        "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("[Migration '1.0.0'] User_preferences table created.");

    // link_groups table
    await client.query(`
      CREATE TABLE IF NOT EXISTS link_groups (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS "userId_link_group_name_idx" ON link_groups("userId", name);');
    console.log("[Migration '1.0.0'] Link_groups table and index created.");

    // retargeting_pixels table
    await client.query(`
      CREATE TABLE IF NOT EXISTS retargeting_pixels (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        "pixelIdValue" TEXT NOT NULL,
        "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS "userId_retargeting_pixel_name_idx" ON retargeting_pixels("userId", name);');
    await client.query('CREATE INDEX IF NOT EXISTS "retargetingPixel_userId_idx" ON retargeting_pixels("userId");');
    console.log("[Migration '1.0.0'] Retargeting_pixels table and indexes created.");

    // team_memberships table
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
    console.log("[Migration '1.0.0'] Team_memberships table and indexes created.");

    // links table
    await client.query(`
      CREATE TABLE IF NOT EXISTS links (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "originalUrl" TEXT NOT NULL,
        "shortUrl" TEXT NOT NULL UNIQUE,
        slug TEXT NOT NULL,
        "clickCount" INTEGER DEFAULT 0,
        title TEXT,
        tags TEXT[],
        "isCloaked" BOOLEAN DEFAULT FALSE,
        "domainId" TEXT REFERENCES domains(id) ON DELETE SET NULL,
        "groupId" TEXT REFERENCES link_groups(id) ON DELETE SET NULL,
        "deepLinkConfig" JSONB,
        "abTestConfig" JSONB,
        targets JSONB NOT NULL,
        last_used_target_index INTEGER DEFAULT NULL,
        "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        "rotation_start" TIMESTAMPTZ DEFAULT NULL,
        "rotation_end" TIMESTAMPTZ DEFAULT NULL,
        "click_limit" INTEGER DEFAULT NULL,
        CONSTRAINT "unique_slug_on_domain" UNIQUE (slug, "domainId")
      );
    `);
    await client.query('CREATE INDEX IF NOT EXISTS "link_userId_idx" ON links("userId");');
    await client.query('CREATE INDEX IF NOT EXISTS "link_groupId_idx" ON links("groupId");');
    await client.query('CREATE INDEX IF NOT EXISTS "link_domainId_idx" ON links("domainId");');
    await client.query('CREATE INDEX IF NOT EXISTS "link_slug_idx" ON links(slug);');
    console.log("[Migration '1.0.0'] Links table and indexes created.");

    // link_retargeting_pixels table
    await client.query(`
      CREATE TABLE IF NOT EXISTS link_retargeting_pixels (
        "linkId" TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE,
        "pixelId" TEXT NOT NULL REFERENCES retargeting_pixels(id) ON DELETE CASCADE,
        PRIMARY KEY ("linkId", "pixelId")
      );
    `);
    console.log("[Migration '1.0.0'] Link_retargeting_pixels table created.");

    // analytic_events table
    await client.query(`
      CREATE TABLE IF NOT EXISTS analytic_events (
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
      );
    `);
    await client.query('CREATE INDEX IF NOT EXISTS "analytic_event_linkId_idx" ON analytic_events("linkId");');
    await client.query('CREATE INDEX IF NOT EXISTS "analytic_event_timestamp_idx" ON analytic_events(timestamp);');
    await client.query('CREATE INDEX IF NOT EXISTS "analytic_event_country_idx" ON analytic_events(country);');
    await client.query('CREATE INDEX IF NOT EXISTS "analytic_event_deviceType_idx" ON analytic_events("deviceType");');
    console.log("[Migration '1.0.0'] Analytic_events table and indexes created.");

    // folders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS folders (
        id SERIAL PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    console.log("[Migration '1.0.0'] Folders table created.");

    // ALTER links table for folderId
    await client.query(`
      ALTER TABLE links
        ADD COLUMN IF NOT EXISTS "folderId" INTEGER REFERENCES folders(id) ON DELETE SET NULL;
    `);
    console.log("[Migration '1.0.0'] Links table altered for folderId.");

    // plans table
    await client.query(`
      CREATE TABLE IF NOT EXISTS plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price NUMERIC NOT NULL,
        period TEXT NOT NULL,
        "limit" BIGINT NOT NULL
      );
    `);
    console.log("[Migration '1.0.0'] Plans table created.");

    // features table
    await client.query(`
      CREATE TABLE IF NOT EXISTS features (
        id SERIAL PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        label TEXT NOT NULL,
        section TEXT NOT NULL
      );
    `);
    console.log("[Migration '1.0.0'] Features table created.");

    // plan_features table
    await client.query(`
      CREATE TABLE IF NOT EXISTS plan_features (
        plan_id TEXT REFERENCES plans(id) ON DELETE CASCADE,
        feature_id INT REFERENCES features(id) ON DELETE CASCADE,
        PRIMARY KEY (plan_id, feature_id)
      );
    `);
    console.log("[Migration '1.0.0'] Plan_features table created.");

    // subscriptions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        "userId" TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        "planId" TEXT NOT NULL REFERENCES plans(id),
        "nextBillingDate" TIMESTAMP NULL,
        usage BIGINT NOT NULL DEFAULT 0,
        "limit" BIGINT NOT NULL
      );
    `);
    console.log("[Migration '1.0.0'] Subscriptions table created.");

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
        await client.query(`INSERT INTO features (key, label, section) VALUES ($1,$2,$3)`, [feat.key, feat.label, feat.section]);
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
          await client.query(`INSERT INTO plan_features (plan_id, feature_id) SELECT $1, f.id FROM features f WHERE f.key = $2`, [planId, key]);
        }
      }
      console.log("[Migration '1.0.0'] Seeded plan_features data.");
    } else {
      console.log("[Migration '1.0.0'] Plans and features data already exists, skipping seed.");
    }

    await client.query('COMMIT;');
    console.log("[Migration '1.0.0'] Initial schema applied successfully (committed).");
  } catch (err: any) {
    await client.query('ROLLBACK;');
    console.error(`[Migration '1.0.0'] ERROR: ${err.message}`, err.stack);
    throw err;
  }
}
