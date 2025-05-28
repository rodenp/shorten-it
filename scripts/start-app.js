#!/usr/bin/env node

const { spawn } = require('child_process');

// Adjust the path based on the compiled output structure.
// If db.ts from startup/ compiles to startup/db.js, this should work.
// If using ts-node or a similar runtime, it might resolve .ts directly.
// This script is in /app/scripts/ and the db module is also in /app/scripts/
// So, the relative path is './db'
const { initializeDatabase, DB_TYPE } = require('./db');

async function main() {
  console.log('[Startup Script] Initializing application...');

  try {
    console.log(`[Startup Script] Attempting to initialize database (DB_TYPE: ${DB_TYPE})...`);
    // initializeDatabase now returns an object { pool, clientPromise }
    // We just need to ensure it resolves without error.
    await initializeDatabase(); 
    console.log('[Startup Script] Database initialized successfully.');

    // Determine the Next.js server command based on NODE_ENV
    let command;
    let args;

    if (process.env.NODE_ENV === 'production') {
      command = 'npm';
      args = ['run', 'start'];
      console.log('[Startup Script] Production environment detected.');
    } else {
      command = 'npm';
      args = ['run', 'dev'];
      console.log('[Startup Script] Development/other environment detected.');
    }
    
    console.log(`[Startup Script] Starting Next.js server with command: ${command} ${args.join(' ')}...`);

    const nextServer = spawn(command, args, { 
      stdio: 'inherit', // Shows server output (logs, errors) in the current terminal
      shell: true     // Recommended for 'npm' commands, especially on Windows
    });

    nextServer.on('error', (err) => {
      console.error('[Startup Script] Failed to start Next.js server process.', err);
      process.exit(1);
    });

    nextServer.on('close', (code) => {
      console.log(`[Startup Script] Next.js server process exited with code ${code}`);
      // Optionally, handle specific exit codes if needed
      process.exit(code === null ? 0 : code);
    });

  } catch (error) {
    console.error('[Startup Script] Failed to initialize database. Application will not start.');
    console.error(error);
    process.exit(1);
  }
}

main();
