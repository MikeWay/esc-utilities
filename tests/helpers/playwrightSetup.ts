import { execSync } from 'child_process';
import { Pool } from 'pg';
import { createTestPool, seedTestDb, TEST_DB } from './db';

export default async function playwrightSetup(): Promise<void> {
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
}
