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

describe('Route protection', () => {
  it('GET / redirects unauthenticated requests to login', async () => {
    const res = await request(BASE).get('/mealstock/');
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/login/);
  });

  it('GET /audit redirects unauthenticated requests to login', async () => {
    const res = await request(BASE).get('/mealstock/audit');
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/login/);
  });

  it('GET /version redirects unauthenticated requests to login', async () => {
    const res = await request(BASE).get('/mealstock/version');
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/login/);
  });
});

describe('GET /mealstock/', () => {
  it('serves client HTML to authenticated users', async () => {
    const agent = await adminAgent();
    const res = await agent.get('/mealstock/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });

  it('serves client HTML to regular users', async () => {
    const agent = await userAgent();
    const res = await agent.get('/mealstock/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });
});

describe('GET /mealstock/version', () => {
  it('returns JSON with version and uptime', async () => {
    const agent = await adminAgent();
    const res = await agent.get('/mealstock/version');
    expect(res.status).toBe(200);
    const body = res.body as { version: number; appVersion: string };
    expect(typeof body.version).toBe('number');
    expect(typeof body.appVersion).toBe('string');
    expect(body.appVersion).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe('GET /mealstock/audit', () => {
  it('returns JSON array of audit log entries', async () => {
    const agent = await adminAgent();
    const res = await agent.get('/mealstock/audit');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('is accessible to regular users', async () => {
    const agent = await userAgent();
    const res = await agent.get('/mealstock/audit');
    expect(res.status).toBe(200);
  });
});
