import { Pool } from 'pg';
import bcrypt from 'bcrypt';

export const TEST_DB = 'mealstock_test';
export const TEST_PORT_API = 3001;
export const TEST_PORT_E2E = 3002;

export const TEST_ADMIN = { email: 'admin@test.com', password: 'Admin1234!', name: 'Test Admin' };
export const TEST_USER  = { email: 'user@test.com',  password: 'User1234!',  name: 'Test User' };

export function createTestPool(): Pool {
  return new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '5432'),
    database: TEST_DB,
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || 'changeme',
  });
}

export async function seedTestDb(pool: Pool): Promise<void> {
  await pool.query('TRUNCATE users, weeks, dishes, sessions, audit_log, app_settings, freezer_options, password_reset_tokens RESTART IDENTITY CASCADE');

  const adminHash   = await bcrypt.hash(TEST_ADMIN.password, 4);
  const userHash    = await bcrypt.hash(TEST_USER.password,  4);
  const pendingHash = await bcrypt.hash('Pending1!', 4);

  await pool.query(`
    INSERT INTO users (email, display_name, password_hash, approved, is_admin) VALUES
      ($1, $2, $3, true,  true),
      ($4, $5, $6, true,  false),
      ($7, 'Pending User',   $8, false, false),
      ($9, 'To Approve',     $8, false, false)
  `, [
    TEST_ADMIN.email, TEST_ADMIN.name, adminHash,
    TEST_USER.email,  TEST_USER.name,  userHash,
    'pending@test.com', pendingHash,
    'to-approve@test.com',
  ]);

  const SESSION_NAMES = [
    'Tues Diners','Tues Improv','Tues Cruisers','Wed Diners','Wed Dinghies',
    'Thurs Diners','Thurs Juniors','Thurs Cruisers','Friday','Saturday','Sunday',
  ];

  const dishDefs = [
    { cat: 'Meat',     name: 'Beef Stew',     diet: 'Contains meat', start: 50 },
    { cat: 'Non-Meat', name: 'Veggie Curry',   diet: 'Vegetarian',    start: 30 },
    { cat: 'Desserts', name: 'Apple Crumble',  diet: 'Vegetarian',    start: 40 },
  ];

  async function insertWeekDishes(wid: number, startQty: (d: typeof dishDefs[0]) => number) {
    for (const [i, d] of dishDefs.entries()) {
      const dr = await pool.query<{ id: number }>(
        `INSERT INTO dishes (week_id,category,sort_order,name,diet,freezer,start,ordered,corrections)
         VALUES ($1,$2,$3,$4,$5,'',   $6,    0,      0) RETURNING id`,
        [wid, d.cat, i + 1, d.name, d.diet, startQty(d)]
      );
      const dishId = dr.rows[0].id;
      for (const [si, sname] of SESSION_NAMES.entries()) {
        await pool.query(
          'INSERT INTO sessions (dish_id,session_idx,session_name,used) VALUES ($1,$2,$3,0)',
          [dishId, si, sname]
        );
      }
    }
  }

  const week1Res = await pool.query<{ id: number }>(
    "INSERT INTO weeks (label, sort_order) VALUES ('Week 1', 1) RETURNING id"
  );
  const weekId = week1Res.rows[0].id;
  await insertWeekDishes(weekId, d => d.start);

  // Seed a second week so E2E export tests can switch to a non-first week without UI add-week flow
  const week2Res = await pool.query<{ id: number }>(
    "INSERT INTO weeks (label, sort_order) VALUES ('Week 2', 2) RETURNING id"
  );
  await insertWeekDishes(week2Res.rows[0].id, () => 0);

  await pool.query(
    "INSERT INTO app_settings (key, value) VALUES ('active_week_id', $1) ON CONFLICT (key) DO UPDATE SET value=$1",
    [weekId.toString()]
  );
}
