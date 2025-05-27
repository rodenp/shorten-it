import { Pool } from 'pg';
import { APP_VERSION } from '../src/lib/config';

let pool: Pool | null = null;

export async function runMigrations() {

  if (!pool) {
    throw new Error('PostgreSQL pool not initialized.');
  }
  const dbClient = await pool.connect(); 
  // Make sure version table exists
  await dbClient.query(`
    CREATE TABLE IF NOT EXISTS schema_versions (
      id SERIAL PRIMARY KEY,
      version TEXT NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  const res = await dbClient.query('SELECT version FROM schema_versions ORDER BY applied_at DESC LIMIT 1');
  const currentVersion = res.rows[0]?.version || '0.0.0';

  if (currentVersion === APP_VERSION) {
    console.log(`✅ Schema is up to date at version ${APP_VERSION}`);
    return;
  }

  // Perform version-based migrations
  const migrations: Record<string, () => Promise<void>> = {
    '1.0.1': async () => {

        await dbClient.query(`
            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'links'
                  AND column_name = 'domainId'
              ) THEN
                ALTER TABLE links ADD COLUMN "domainId" TEXT;
              END IF;
            END
            $$;
        `);

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
        await dbClient.query(`CREATE UNIQUE INDEX IF NOT EXISTS "userId_domainName_idx" ON domains("userId", "domainName");`);

        await dbClient.query(`
            INSERT INTO domains (id, "userId", "domainName", "createdAt", "updatedAt", "type")
                SELECT 
                id,
                "userId",
                "domainName",
                "createdAt",
                "updatedAt",
                'custom'
                FROM custom_domains;
        `);

        await dbClient.query(`
            INSERT INTO domains (id, "userId", "domainName", "createdAt", "updatedAt", "type")
                SELECT 
                id,
                "userId",
                "domainName",
                "createdAt",
                "updatedAt",
                'local'
                FROM sub_domains;
        `);
        await dbClient.query('CREATE INDEX IF NOT EXISTS "link_domainId_idx" ON links("domainId");');
    },
  };

  const migrationVersions = Object.keys(migrations).sort(); // ensure chronological order
  for (const version of migrationVersions) {
    if (version > currentVersion && version <= APP_VERSION) {
      console.log(`⚙️  Running migration for version ${version}...`);
      await migrations[version]();
    }
  }

  await dbClient.query('INSERT INTO schema_versions (version) VALUES ($1)', [APP_VERSION]);
  console.log(`✅ Migrations complete. Updated to version ${APP_VERSION}`);
}