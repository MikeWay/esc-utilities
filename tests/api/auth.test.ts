import request from 'supertest';
import { TEST_ADMIN, TEST_USER } from '../helpers/db';

const BASE = 'http://localhost:3001';

describe('Authentication', () => {
  describe('GET /mealstock/login', () => {
    it('returns 200 with login form', async () => {
      const res = await request(BASE).get('/mealstock/login');
      expect(res.status).toBe(200);
      expect(res.text).toContain('login');
    });

    it('redirects authenticated users to app', async () => {
      const agent = request.agent(BASE);
      await agent.post('/mealstock/auth/login')
        .type('form')
        .send({ email: TEST_ADMIN.email, password: TEST_ADMIN.password });
      const res = await agent.get('/mealstock/login');
      expect(res.status).toBe(302);
      expect(res.headers.location).toMatch(/\/mealstock\//);
    });
  });

  describe('POST /mealstock/auth/login', () => {
    it('redirects to app on valid admin credentials', async () => {
      const agent = request.agent(BASE);
      const res = await agent.post('/mealstock/auth/login')
        .type('form')
        .send({ email: TEST_ADMIN.email, password: TEST_ADMIN.password });
      expect(res.status).toBe(302);
      expect(res.headers.location).toMatch(/\/mealstock\//);
    });

    it('redirects to app on valid user credentials', async () => {
      const agent = request.agent(BASE);
      const res = await agent.post('/mealstock/auth/login')
        .type('form')
        .send({ email: TEST_USER.email, password: TEST_USER.password });
      expect(res.status).toBe(302);
      expect(res.headers.location).toMatch(/\/mealstock\//);
    });

    it('redirects back to login on wrong password', async () => {
      const res = await request(BASE).post('/mealstock/auth/login')
        .type('form')
        .send({ email: TEST_ADMIN.email, password: 'WrongPass1!' });
      expect(res.status).toBe(302);
      expect(res.headers.location).toMatch(/login/);
    });

    it('redirects back to login for unknown email', async () => {
      const res = await request(BASE).post('/mealstock/auth/login')
        .type('form')
        .send({ email: 'nobody@example.com', password: 'Admin1234!' });
      expect(res.status).toBe(302);
      expect(res.headers.location).toMatch(/login/);
    });

    it('redirects pending user to /pending', async () => {
      const agent = request.agent(BASE);
      const res = await agent.post('/mealstock/auth/login')
        .type('form')
        .send({ email: 'pending@test.com', password: 'Pending1!' });
      expect(res.status).toBe(302);
      expect(res.headers.location).toMatch(/\/pending/);
    });
  });

  describe('POST /mealstock/auth/logout', () => {
    it('destroys session and redirects to login', async () => {
      const agent = request.agent(BASE);
      await agent.post('/mealstock/auth/login')
        .type('form')
        .send({ email: TEST_ADMIN.email, password: TEST_ADMIN.password });

      const res = await agent.post('/mealstock/auth/logout');
      expect(res.status).toBe(302);
      expect(res.headers.location).toMatch(/login/);

      // Session should be gone — app root redirects to login
      const check = await agent.get('/mealstock/');
      expect(check.headers.location).toMatch(/login/);
    });
  });

  describe('POST /mealstock/auth/register', () => {
    it('rejects weak passwords', async () => {
      const res = await request(BASE).post('/mealstock/auth/register')
        .type('form')
        .send({ email: 'new@test.com', password: 'weak', display_name: 'New' });
      expect(res.status).toBe(302);
      expect(res.headers.location).toMatch(/error=/);
    });

    it('rejects duplicate email', async () => {
      const res = await request(BASE).post('/mealstock/auth/register')
        .type('form')
        .send({ email: TEST_ADMIN.email, password: 'NewPass1!', display_name: 'Dup' });
      expect(res.status).toBe(302);
      expect(res.headers.location).toMatch(/error=taken/);
    });
  });
});
