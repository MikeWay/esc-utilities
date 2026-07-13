import request from 'supertest';
import { TEST_ADMIN, TEST_USER } from '../helpers/db';

const BASE = 'http://localhost:3001';

async function adminAgent() {
  const agent = request.agent(BASE);
  await agent.post('/mealstock/auth/login')
    .type('form')
    .send({ email: TEST_ADMIN.email, password: TEST_ADMIN.password });
  return agent;
}

async function userAgent() {
  const agent = request.agent(BASE);
  await agent.post('/mealstock/auth/login')
    .type('form')
    .send({ email: TEST_USER.email, password: TEST_USER.password });
  return agent;
}

describe('Admin access control', () => {
  it('GET /admin returns 200 for admin users', async () => {
    const agent = await adminAgent();
    const res = await agent.get('/mealstock/admin');
    expect(res.status).toBe(200);
    expect(res.text).toContain('User Management');
  });

  it('GET /admin returns 403 for regular users', async () => {
    const agent = await userAgent();
    const res = await agent.get('/mealstock/admin');
    expect(res.status).toBe(403);
  });

  it('GET /admin redirects unauthenticated requests to login', async () => {
    const res = await request(BASE).get('/mealstock/admin');
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/login/);
  });
});

describe('POST /admin/sql', () => {
  it('executes a SELECT query and returns results', async () => {
    const agent = await adminAgent();
    const res = await agent.post('/mealstock/admin/sql')
      .send({ query: 'SELECT 1 AS n' });
    expect(res.status).toBe(200);
    expect(res.body.columns).toEqual(['n']);
    expect(res.body.rows[0][0]).toBe(1);
  });

  it('returns error for invalid SQL', async () => {
    const agent = await adminAgent();
    const res = await agent.post('/mealstock/admin/sql')
      .send({ query: 'SELECT * FROM nonexistent_table_xyz' });
    expect(res.status).toBe(200);
    expect(res.body.error).toBeDefined();
  });

  it('returns 403 for non-admin users', async () => {
    const agent = await userAgent();
    const res = await agent.post('/mealstock/admin/sql')
      .send({ query: 'SELECT 1' });
    expect(res.status).toBe(403);
  });
});

describe('Admin user management', () => {
  it('can approve a pending user', async () => {
    const agent = await adminAgent();
    const usersRes = await agent.post('/mealstock/admin/sql')
      .send({ query: "SELECT id FROM users WHERE email='to-approve@test.com'" });
    const userId = usersRes.body.rows[0][0];

    const res = await agent.post(`/mealstock/admin/users/${userId}/approve`);
    expect(res.status).toBe(302);

    const check = await agent.post('/mealstock/admin/sql')
      .send({ query: `SELECT approved FROM users WHERE id=${userId}` });
    expect(check.body.rows[0][0]).toBe(true);
  });

  it('can promote a user to admin', async () => {
    const agent = await adminAgent();
    const usersRes = await agent.post('/mealstock/admin/sql')
      .send({ query: "SELECT id FROM users WHERE email='user@test.com'" });
    const userId = usersRes.body.rows[0][0];

    const res = await agent.post(`/mealstock/admin/users/${userId}/promote`);
    expect(res.status).toBe(302);

    const check = await agent.post('/mealstock/admin/sql')
      .send({ query: `SELECT is_admin FROM users WHERE id=${userId}` });
    expect(check.body.rows[0][0]).toBe(true);
  });
});

describe('Admin freezer options', () => {
  it('can add a freezer option', async () => {
    const agent = await adminAgent();
    const res = await agent.post('/mealstock/admin/freezer-options/add')
      .type('form')
      .send({ label: 'Test Freezer' });
    expect(res.status).toBe(302);

    const check = await agent.post('/mealstock/admin/sql')
      .send({ query: "SELECT label FROM freezer_options WHERE label='Test Freezer'" });
    expect(check.body.rows.length).toBe(1);
  });

  it('can delete a freezer option', async () => {
    const agent = await adminAgent();
    const idRes = await agent.post('/mealstock/admin/sql')
      .send({ query: "SELECT id FROM freezer_options WHERE label='Test Freezer' LIMIT 1" });
    if (idRes.body.rows.length === 0) return; // already deleted or not created
    const id = idRes.body.rows[0][0];

    const res = await agent.post('/mealstock/admin/freezer-options/delete')
      .type('form')
      .send({ id: String(id) });
    expect(res.status).toBe(302);
  });
});
