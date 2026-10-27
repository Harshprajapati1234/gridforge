import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import * as http from 'http';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { BridgeServer } from '../src';

describe('Chrome Extension Bridge & Security Hardening (Batch 3)', () => {
  const TEST_PORT = 47841;
  let server: BridgeServer;
  let tmpPairedFile: string;

  beforeAll(async () => {
    tmpPairedFile = path.join(os.tmpdir(), `gf-bridge-test-${Date.now()}.json`);
    server = new BridgeServer(TEST_PORT, tmpPairedFile);
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
    try { fs.unlinkSync(tmpPairedFile); } catch {}
  });

  function makeRequest(
    method: string,
    reqPath: string,
    body?: any,
    token?: string,
    headers: Record<string, string> = {}
  ): Promise<{ status: number; data: any; headers: http.IncomingHttpHeaders }> {
    return new Promise((resolve, reject) => {
      const allHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers
      };
      if (token) allHeaders['Authorization'] = `Bearer ${token}`;

      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: TEST_PORT,
          path: reqPath,
          method,
          headers: allHeaders
        },
        (res) => {
          let str = '';
          res.on('data', (c) => (str += c));
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode || 0, data: JSON.parse(str), headers: res.headers });
            } catch {
              resolve({ status: res.statusCode || 0, data: str, headers: res.headers });
            }
          });
        }
      );
      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  function attemptWebSocketUpgrade(reqPath: string, origin?: string): Promise<number> {
    return new Promise((resolve) => {
      const headers: Record<string, string> = {
        Connection: 'Upgrade',
        Upgrade: 'websocket',
        'Sec-WebSocket-Version': '13',
        'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ=='
      };
      if (origin) headers['Origin'] = origin;

      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: TEST_PORT,
          path: reqPath,
          method: 'GET',
          headers
        },
        (res) => {
          resolve(res.statusCode || 0);
        }
      );
      req.on('error', () => resolve(403));
      req.end();
    });
  }

  it('answers GET /ping with gridforge metadata', async () => {
    const res = await makeRequest('GET', '/ping');
    expect(res.status).toBe(200);
    expect(res.data.ok).toBe(true);
    expect(res.data.app).toBe('gridforge');
  });

  it('rejects unauthenticated API access with 403 BEFORE any pairing has occurred', async () => {
    // Before pairing, /api/jobs must return 403 (verifies auth bypass is closed)
    const res = await makeRequest('GET', '/api/jobs');
    expect(res.status).toBe(403);
    expect(res.data.ok).toBe(false);
  });

  it('enforces lockout and rotates PIN after 5 wrong attempts', async () => {
    const { pin } = server.getCurrentPin();
    const wrongPin = pin === '111111' ? '222222' : '111111';

    // 4 wrong attempts return 401
    for (let i = 0; i < 4; i++) {
      const res = await makeRequest('POST', '/pair', { pin: wrongPin, extensionId: 'test-ext' });
      expect(res.status).toBe(401);
    }

    // 5th wrong attempt triggers 429 lockout
    const res5 = await makeRequest('POST', '/pair', { pin: wrongPin, extensionId: 'test-ext' });
    expect(res5.status).toBe(429);
    expect(res5.data.error).toContain('Locked out');

    // Subsequent attempt during lockout also returns 429
    const resLock = await makeRequest('POST', '/pair', { pin: wrongPin, extensionId: 'test-ext' });
    expect(resLock.status).toBe(429);

    // Reset lockout for subsequent tests
    (server as any).lockoutUntil = 0;
    (server as any).failedAttempts = 0;
  });

  it('rejects forged WebSocket upgrade with wrong Origin (e.g. http://evil.com)', async () => {
    const status = await attemptWebSocketUpgrade('/', 'http://evil.com');
    expect(status).toBe(403);
  });

  it('rejects forged WebSocket upgrade without valid pairing token', async () => {
    const status = await attemptWebSocketUpgrade('/?token=fake-token', 'chrome-extension://abcdefghijklmnopabcdefghijklmnop');
    expect(status).toBe(403);
  });

  it('successfully pairs with valid PIN and extension ID, and issues hashed token', async () => {
    const { pin } = server.getCurrentPin();
    const extId = 'abcdefghijklmnopabcdefghijklmnop';

    const res = await makeRequest('POST', '/pair', { pin, extensionId: extId });
    expect(res.status).toBe(200);
    expect(res.data.ok).toBe(true);
    expect(typeof res.data.token).toBe('string');
    expect(res.data.token.length).toBeGreaterThan(20);

    const validToken = res.data.token;

    // Paired token can access /api/jobs
    const jobsRes = await makeRequest('GET', '/api/jobs', undefined, validToken);
    expect(jobsRes.status).toBe(200);
    expect(Array.isArray(jobsRes.data.jobs)).toBe(true);

    // CORS header returned for paired chrome-extension origin
    const corsRes = await makeRequest('GET', '/api/jobs', undefined, validToken, {
      Origin: `chrome-extension://${extId}`
    });
    expect(corsRes.headers['access-control-allow-origin']).toBe(`chrome-extension://${extId}`);

    // Queue and submit SKU result
    server.queueJob({
      id: 'sec-job-1',
      sheetName: 'Sheet1',
      items: [{ sku: 'SKU-SEC-1' }],
      created: Date.now()
    });

    let receivedResult: any = null;
    server.on('sku:result', (r) => {
      receivedResult = r;
    });

    const submitRes = await makeRequest(
      'POST',
      '/api/result',
      {
        jobId: 'sec-job-1',
        sku: 'SKU-SEC-1',
        status: 'ok',
        title: 'Security Verified Cotton Shirt',
        price: 799
      },
      validToken
    );

    expect(submitRes.status).toBe(200);
    expect(receivedResult).not.toBeNull();
    expect(receivedResult.title).toBe('Security Verified Cotton Shirt');
  });

  it('rejects invalid payload fields with 400 Bad Request', async () => {
    const { pin } = server.getCurrentPin();
    const pairRes = await makeRequest('POST', '/pair', { pin, extensionId: 'valid-ext' });
    const token = pairRes.data.token;

    // Invalid status field
    const badStatusRes = await makeRequest(
      'POST',
      '/api/result',
      {
        jobId: 'j1',
        sku: 's1',
        status: 'invalid-status-type'
      },
      token
    );
    expect(badStatusRes.status).toBe(400);

    // Out-of-bounds sheet range
    const badRangeRes = await makeRequest(
      'POST',
      '/api/sheet/write-range',
      {
        startRow: -5,
        startCol: 0,
        data: [['bad']]
      },
      token
    );
    expect(badRangeRes.status).toBe(400);
  });
});
