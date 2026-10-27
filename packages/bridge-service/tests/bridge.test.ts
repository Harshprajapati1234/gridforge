import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import * as http from 'http';
import { BridgeServer } from '../src';

describe('Chrome Extension Bridge & Pairing Verification Suite (Phase 5)', () => {
  const TEST_PORT = 47839;
  let server: BridgeServer;

  beforeAll(async () => {
    server = new BridgeServer(TEST_PORT);
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  function makeRequest(method: string, path: string, body?: any, token?: string): Promise<{ status: number; data: any }> {
    return new Promise((resolve, reject) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: TEST_PORT,
          path,
          method,
          headers
        },
        (res) => {
          let str = '';
          res.on('data', (c) => (str += c));
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode || 0, data: JSON.parse(str) });
            } catch {
              resolve({ status: res.statusCode || 0, data: str });
            }
          });
        }
      );
      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  it('answers GET /ping with gridforge metadata', async () => {
    const res = await makeRequest('GET', '/ping');
    expect(res.status).toBe(200);
    expect(res.data.ok).toBe(true);
    expect(res.data.app).toBe('gridforge');
  });

  it('enforces 6-digit PIN pairing security', async () => {
    const { pin } = server.getCurrentPin();
    expect(pin).toMatch(/^\d{6}$/);

    // 1. Wrong PIN fails
    const failRes = await makeRequest('POST', '/pair', { pin: '000000' });
    expect(failRes.status).toBe(401);
    expect(failRes.data.ok).toBe(false);

    // 2. Correct PIN succeeds and issues token
    const okRes = await makeRequest('POST', '/pair', { pin });
    expect(okRes.status).toBe(200);
    expect(okRes.data.ok).toBe(true);
    expect(typeof okRes.data.token).toBe('string');
    expect(okRes.data.token.length).toBeGreaterThan(10);

    const token = okRes.data.token;

    // 3. API access requires paired token
    const unauthRes = await makeRequest('GET', '/api/jobs');
    expect(unauthRes.status).toBe(403);

    const authRes = await makeRequest('GET', '/api/jobs', undefined, token);
    expect(authRes.status).toBe(200);
    expect(Array.isArray(authRes.data.jobs)).toBe(true);
  });

  it('queues SKU jobs and receives automated Flipkart results', async () => {
    const { token } = (await makeRequest('POST', '/pair', { pin: server.getCurrentPin().pin })).data;

    // Queue a job in GridForge
    server.queueJob({
      id: 'job-fk-1',
      sheetName: 'Sheet1',
      items: [{ sku: 'SKU-1001-COTTON' }, { sku: 'SKU-1002-DENIM' }],
      created: Date.now()
    });

    const jobsRes = await makeRequest('GET', '/api/jobs', undefined, token);
    expect(jobsRes.status).toBe(200);
    expect(jobsRes.data.jobs.length).toBeGreaterThan(0);
    expect(jobsRes.data.jobs.some((j: any) => j.id === 'job-fk-1')).toBe(true);

    // Submit SKU result from Chrome Extension
    let receivedResult: any = null;
    server.on('sku:result', (r) => {
      receivedResult = r;
    });

    const submitRes = await makeRequest('POST', '/api/result', {
      jobId: 'job-fk-1',
      sku: 'SKU-1001-COTTON',
      status: 'ok',
      title: 'Premium Cotton Round Neck Tee',
      price: 499,
      stock: 'In Stock',
      imageLink: 'https://rukminim1.flixcart.com/image/128/128/sample.jpg'
    }, token);

    expect(submitRes.status).toBe(200);
    expect(submitRes.data.ok).toBe(true);
    expect(receivedResult).not.toBeNull();
    expect(receivedResult.title).toBe('Premium Cotton Round Neck Tee');
    expect(receivedResult.price).toBe(499);
  });
});
