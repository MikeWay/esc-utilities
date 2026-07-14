import http from 'http';
import { WebSocket } from 'ws';
import { TEST_ADMIN, TEST_USER } from '../helpers/db';

const BASE_WS = 'ws://localhost:3001/mealstock';

function loginCookie(email: string, password: string): Promise<string> {
  const body = `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost', port: 3001,
      path: '/mealstock/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      const cookies = (res.headers['set-cookie'] ?? []).map(c => c.split(';')[0]).join('; ');
      res.resume();
      resolve(cookies);
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function openWS(cookie: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(BASE_WS, { headers: { Cookie: cookie } });
    ws.once('open', () => resolve(ws));
    ws.once('error', reject);
  });
}

function nextMsg(ws: WebSocket): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    ws.once('message', data => resolve(JSON.parse(data.toString())));
  });
}

function closeWS(ws: WebSocket): Promise<void> {
  return new Promise(resolve => { ws.once('close', resolve); ws.close(); });
}

describe('WebSocket', () => {
  let adminCookie: string;
  let userCookie: string;

  beforeAll(async () => {
    [adminCookie, userCookie] = await Promise.all([
      loginCookie(TEST_ADMIN.email, TEST_ADMIN.password),
      loginCookie(TEST_USER.email, TEST_USER.password),
    ]);
  });

  describe('initial connection', () => {
    it('sends full_state immediately after connect', async () => {
      const ws = await openWS(adminCookie);
      const msg = await nextMsg(ws);
      expect(msg.type).toBe('full_state');
      const data = msg.data as { weeks: unknown[]; activeWeek: number };
      expect(Array.isArray(data.weeks)).toBe(true);
      expect(data.weeks.length).toBeGreaterThan(0);
      await closeWS(ws);
    });

    it('rejects unauthenticated WebSocket connections', async () => {
      const ws = new WebSocket(BASE_WS);
      const status = await new Promise<number>(resolve => {
        ws.once('unexpected-response', (_req, res) => resolve(res.statusCode ?? 0));
        ws.once('error', () => resolve(0));
      });
      expect(status).toBe(401);
    });
  });

  describe('add_week broadcast', () => {
    // Regression test for Bug 1: "new week added on one browser not visible in another"
    // Root cause was that the broadcast was working but the client could miss it if its
    // WebSocket had been dropped by nginx's 60s idle timeout.
    // This test verifies the server-side broadcast reaches all connected clients.
    it('sends full_state with new week to ALL connected clients', async () => {
      const wsA = await openWS(adminCookie);
      const initialState = (await nextMsg(wsA)).data as { weeks: unknown[] };
      const initialCount = initialState.weeks.length;

      const wsB = await openWS(userCookie);
      await nextMsg(wsB); // consume wsB's own initial full_state

      // Register wsB's listener BEFORE wsA sends, to avoid the race where the
      // broadcast arrives before nextMsg() installs its event handler
      const broadcastBPromise = nextMsg(wsB);

      wsA.send(JSON.stringify({ type: 'add_week', label: 'WS Test Week' }));

      // wsA gets full_state back directly; wsB gets it via broadcast — both in parallel
      const [responseA, broadcastB] = await Promise.all([nextMsg(wsA), broadcastBPromise]);

      expect(responseA.type).toBe('full_state');
      expect(((responseA.data as { weeks: unknown[] }).weeks).length).toBe(initialCount + 1);

      expect(broadcastB.type).toBe('full_state');
      expect(((broadcastB.data as { weeks: unknown[] }).weeks).length).toBe(initialCount + 1);

      await closeWS(wsA);
      await closeWS(wsB);
    });

    it('reconnecting client receives current state including new weeks', async () => {
      const ws1 = await openWS(adminCookie);
      const state1 = (await nextMsg(ws1)).data as { weeks: unknown[] };
      const countBefore = state1.weeks.length;

      ws1.send(JSON.stringify({ type: 'add_week', label: 'Before Reconnect Week' }));
      await nextMsg(ws1); // server sends full_state directly to sender; wait for it

      await closeWS(ws1);

      // Reconnect — must see the new week immediately in full_state
      const ws2 = await openWS(adminCookie);
      const state2 = (await nextMsg(ws2)).data as { weeks: unknown[] };
      expect(state2.weeks.length).toBe(countBefore + 1);
      await closeWS(ws2);
    });
  });

  describe('set_active_week', () => {
    it('broadcasts set_active_week to other clients', async () => {
      const wsA = await openWS(adminCookie);
      await nextMsg(wsA); // consume full_state

      const wsB = await openWS(userCookie);
      await nextMsg(wsB); // consume full_state

      // Register before sending to avoid race
      const broadcastPromise = nextMsg(wsB);
      wsA.send(JSON.stringify({ type: 'set_active_week', weekIdx: 0 }));

      const msg = await broadcastPromise;
      expect(msg.type).toBe('set_active_week');
      expect(msg.weekIdx).toBe(0);

      await closeWS(wsA);
      await closeWS(wsB);
    });

    it('out-of-bounds set_active_week is silently ignored', async () => {
      const wsA = await openWS(adminCookie);
      await nextMsg(wsA);

      const wsB = await openWS(userCookie);
      await nextMsg(wsB);

      // Listen on wsB for any incoming message
      let receivedOob = false;
      const oobPromise = new Promise<void>(resolve => {
        wsB.once('message', () => { receivedOob = true; resolve(); });
        setTimeout(resolve, 500); // 500ms window
      });

      // Send out-of-bounds — server should ignore it entirely (no broadcast, no crash)
      wsA.send(JSON.stringify({ type: 'set_active_week', weekIdx: 9999 }));
      await oobPromise;
      expect(receivedOob).toBe(false);

      // Server must still be responsive: a valid set_active_week is broadcast normally
      const validBroadcast = nextMsg(wsB);
      wsA.send(JSON.stringify({ type: 'set_active_week', weekIdx: 0 }));
      const msg = await validBroadcast;
      expect(msg.type).toBe('set_active_week');
      expect(msg.weekIdx).toBe(0);

      await closeWS(wsA);
      await closeWS(wsB);
    });
  });
});
