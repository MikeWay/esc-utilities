import { execSync, spawn } from 'child_process';
import { Pool } from 'pg';
import * as fs from 'fs';
import { createTestPool, seedTestDb, TEST_DB } from './db';

export const PID_FILE = '/tmp/mealstock-test-api-server.pid';

export default async function globalSetup(): Promise<void> {
  const adminPool = new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '5432'),
    database: 'postgres',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || 'changeme',
  });
  try {
    await adminPool.query(`CREATE DATABASE "${TEST_DB}"`);
  } catch (e: any) {
    if (!e.message.includes('already exists')) throw e;
  }
  await adminPool.end();

  // Pre-create restore sentinel so setup-db doesn't poll for 60 seconds
  const testPool = createTestPool();
  await testPool.query(`
    CREATE TABLE IF NOT EXISTS _restore_complete (done BOOLEAN);
    DELETE FROM _restore_complete;
    INSERT INTO _restore_complete (done) VALUES (true);
  `);
  await testPool.end();

  execSync('node dist/setup-db.js', {
    env: { ...process.env, DB_NAME: TEST_DB, NODE_ENV: 'test' },
    stdio: 'inherit',
  });

  const pool = createTestPool();
  await seedTestDb(pool);
  await pool.end();

  const server = spawn('node', ['dist/server.js'], {
    detached: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      DB_NAME: TEST_DB,
      PORT: '3001',
      BASE_PATH: '/mealstock',
      SESSION_SECRET: 'test-secret-pw',
      NODE_ENV: 'test',
    },
  });
  server.unref();
  fs.writeFileSync(PID_FILE, String(server.pid));

  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    try {
      const r = await fetch('http://localhost:3001/mealstock/login');
      if (r.status < 500) break;
    } catch {}
    await new Promise(r => setTimeout(r, 300));
  }
}
