async (client: PoolClient) => {
  console.log("[Migration '1.0.2_gdpr_compliance'] Attempting to apply GDPR schema changes...");
  try {
    await client.query('BEGIN;');
    console.log("[Migration '1.0.2_gdpr_compliance'] Transaction started.");

    // 1.a. CREATE EXTENSION IF NOT EXISTS pgcrypto;
    // Note: CREATE EXTENSION cannot always run inside a transaction block if it's the first command
    // unless it's `CREATE EXTENSION IF NOT EXISTS`.
    // If it fails (e.g. permissions), this part might need manual intervention or to be run by a superuser separately.
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
      console.log("[Migration '1.0.2_gdpr_compliance'] Ensured pgcrypto extension exists (for gen_random_uuid).");
    } catch (extError: any) {
      console.warn(`[Migration '1.0.2_gdpr_compliance'] Warning regarding pgcrypto extension: ${extError.message}. This may be fine if it already exists or is not strictly needed by user_consents table default UUID generation.`);
    }

    // 1.b. ALTER TABLE users ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMPTZ;
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMPTZ;');
    console.log("[Migration '1.0.2_gdpr_compliance'] Users table altered for 'termsAcceptedAt'.");

    // 1.c. ALTER TABLE domains ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE NOT NULL;
    await client.query('ALTER TABLE domains ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE NOT NULL;');
    console.log("[Migration '1.0.2_gdpr_compliance'] Domains table altered for 'verified'.");

    // 1.d. ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ;
    await client.query('ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ;');
    console.log("[Migration '1.0.2_gdpr_compliance'] Api_keys table ensured 'updatedAt' column exists.");

    // 1.e. UPDATE api_keys SET "updatedAt" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP) WHERE "updatedAt" IS NULL;
    await client.query('UPDATE api_keys SET "updatedAt" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP) WHERE "updatedAt" IS NULL;');
    console.log("[Migration '1.0.2_gdpr_compliance'] Backfilled 'updatedAt' in api_keys where NULL.");

    // 1.f. CREATE TABLE IF NOT EXISTS user_consents
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
    console.log("[Migration '1.0.2_gdpr_compliance'] User_consents table created.");

    // 1.g. CREATE INDEX IF NOT EXISTS "userConsents_userId_idx" ON user_consents("userId");
    await client.query('CREATE INDEX IF NOT EXISTS "userConsents_userId_idx" ON user_consents("userId");');
    console.log("[Migration '1.0.2_gdpr_compliance'] Index on user_consents(\"userId\") created.");

    await client.query('COMMIT;');
    console.log("[Migration '1.0.2_gdpr_compliance'] GDPR schema changes applied successfully (committed).");
  } catch (err: any) {
    await client.query('ROLLBACK;');
    console.error(`[Migration '1.0.2_gdpr_compliance'] ERROR: ${err.message}`, err.stack);
    throw err;
  }
}
