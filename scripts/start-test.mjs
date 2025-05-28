#!/usr/bin/env node

// Adjust the path based on the compiled output structure.
// If db.ts from startup/ compiles to startup/db.js, this should work.
// If using ts-node or a similar runtime, it might resolve .ts directly.
// This script is in /app/scripts/ and the db module is also in /app/scripts/
// So, the relative path is './db'
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function runTests() {
  console.log('[Startup Script] Initializing application...');

  try {
    console.log(`[Startup Script] Attempting to initialize database`);
    const POSTGRES_URI = process.env.POSTGRES_URI;
    const pool = new Pool({ connectionString: POSTGRES_URI });
    
    console.log('[Migrations] Starting migration process...');
    
    const dbClient = await pool.connect();
    console.log('[Migrations] Database client connected.');
    
    const res = await dbClient.query('SELECT * from links');
    const shortUrl = res.rows[0]?.shortUrl;
    console.log('first shortUrl=',shortUrl);
    // initializeDatabase now returns an object { pool, clientPromise }
    // We just need to ensure it resolves without error.
    console.log('[Startup Script] Database initialized successfully.');
    console.log(`[Startup Script] Starting Next.js server... [Dummy]`);
    process.exit(0);

  } catch (error) {
    console.error('[Startup Script] Failed to initialize database. Application will not start.');
    console.error(error);
    process.exit(1);
  }
}

runTests();
