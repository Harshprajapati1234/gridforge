import * as http from 'http';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TypedEventEmitter, generateId } from '@gridforge/shared';

export interface BridgeJobItem {
  sku: string;
  url?: string;
}

export interface BridgeJob {
  id: string;
  sheetName: string;
  items: BridgeJobItem[];
  imgCol?: number;
  linkCol?: number;
  created: number;
}

export interface SkuResult {
  jobId: string;
  sku: string;
  status: 'ok' | 'notfound' | 'error';
  title?: string;
  imageLink?: string;
  productLink?: string;
  price?: number;
  stock?: string;
  rating?: number;
  msg?: string;
  timestamp: number;
}

export interface PairedTokenRecord {
  hash: string;
  extensionId: string;
  pairedAt: number;
}

export interface ConnectedClientInfo {
  id: string;
  extensionId: string;
  ip: string;
  connectedAt: number;
}

export interface BridgeServerEvents {
  'client:connected': { id: string; ip: string; extensionId: string };
  'client:disconnected': { id: string };
  'client:revoked': { id: string };
  'paired': { token: string; extensionId: string };
  'sku:result': SkuResult;
  'sheet:write-range': { startRow: number; startCol: number; data: any[][] };
  'sheet:append-rows': { data: any[][] };
}

export class BridgeServer extends TypedEventEmitter<BridgeServerEvents> {
  private server: http.Server | null = null;
  private port: number;
  private currentPin: string = '';
  private pinExpiry: number = 0;
  private failedAttempts: number = 0;
  private lockoutUntil: number = 0;

  // Stored token records with SHA-256 hashes
  private pairedTokens: Map<string, PairedTokenRecord> = new Map(); // hash -> record
  private pairedExtensionIds: Set<string> = new Set();
  private pairedFile: string;

  // Active WebSocket clients
  private activeSockets: Map<string, { socket: any; extensionId: string; ip: string; connectedAt: number }> = new Map();
  private pendingJobs: Map<string, BridgeJob> = new Map();
  private jobResults: Map<string, SkuResult> = new Map();

  constructor(port = 47831, customPairedFile?: string) {
    super();
    this.port = port;
    if (customPairedFile) {
      this.pairedFile = customPairedFile;
    } else {
      const appSupport = path.join(os.homedir(), 'Library', 'Application Support', 'GridForge');
      try { fs.mkdirSync(appSupport, { recursive: true }); } catch {}
      this.pairedFile = path.join(appSupport, 'bridge-paired.json');
    }
    this.loadPairedTokens();
    this.generateNewPin();
  }

  private hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  private loadPairedTokens() {
    try {
      if (fs.existsSync(this.pairedFile)) {
        const raw = JSON.parse(fs.readFileSync(this.pairedFile, 'utf8'));
        if (Array.isArray(raw.tokens)) {
          for (const item of raw.tokens) {
            if (typeof item === 'string') {
              // Legacy migration
              const h = this.hashToken(item);
              this.pairedTokens.set(h, { hash: h, extensionId: 'legacy', pairedAt: Date.now() });
              this.pairedExtensionIds.add('legacy');
            } else if (item && item.hash) {
              this.pairedTokens.set(item.hash, item);
              if (item.extensionId) this.pairedExtensionIds.add(item.extensionId);
            }
          }
        }
      }
    } catch {}
  }

  private savePairedTokens() {
    try {
      fs.writeFileSync(
        this.pairedFile,
        JSON.stringify({ tokens: Array.from(this.pairedTokens.values()) }, null, 2)
      );
    } catch {}
  }

  public generateNewPin(): string {
    this.currentPin = Math.floor(100000 + Math.random() * 900000).toString();
    this.pinExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
    return this.currentPin;
  }

  public getCurrentPin(): { pin: string; remainingSeconds: number } {
    if (Date.now() > this.pinExpiry) {
      this.generateNewPin();
    }
    const remainingSeconds = Math.max(0, Math.floor((this.pinExpiry - Date.now()) / 1000));
    return { pin: this.currentPin, remainingSeconds };
  }

  public isPaired(): boolean {
    return this.pairedTokens.size > 0;
  }

  public getConnectedClientsCount(): number {
    return this.activeSockets.size;
  }

  public getConnectedClients(): ConnectedClientInfo[] {
    return Array.from(this.activeSockets.entries()).map(([id, s]) => ({
      id,
      extensionId: s.extensionId,
      ip: s.ip,
      connectedAt: s.connectedAt
    }));
  }

  public revokeClient(clientId: string): boolean {
    const client = this.activeSockets.get(clientId);
    if (!client) return false;
    try {
      client.socket.destroy();
    } catch {}
    this.activeSockets.delete(clientId);
    this.emit('client:revoked', { id: clientId });
    return true;
  }

  public revokeAllTokens(): void {
    for (const client of this.activeSockets.values()) {
      try { client.socket.destroy(); } catch {}
    }
    this.activeSockets.clear();
    this.pairedTokens.clear();
    this.pairedExtensionIds.clear();
    this.savePairedTokens();
  }

  public isTokenValid(token: string): boolean {
    if (!token || typeof token !== 'string') return false;
    const h = this.hashToken(token);
    return this.pairedTokens.has(h);
  }

  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => this.handleHttpRequest(req, res));
      this.server.on('upgrade', (req, socket, head) => this.handleWebSocketUpgrade(req, socket, head));

      // Strictly bind ONLY to 127.0.0.1 loopback
      this.server.listen(this.port, '127.0.0.1', () => {
        resolve();
      });

      this.server.on('error', (err) => {
        reject(err);
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.server) return resolve();
      for (const { socket } of this.activeSockets.values()) {
        try { socket.destroy(); } catch {}
      }
      this.activeSockets.clear();
      this.server.close(() => resolve());
    });
  }

  // --- HTTP Request Handler with Security Hardening ---
  private handleHttpRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    const origin = req.headers.origin || '';
    const isExtensionOrigin = origin.startsWith('chrome-extension://');
    const extId = isExtensionOrigin ? origin.replace('chrome-extension://', '').split('/')[0] : '';

    // CORS: Allow ONLY chrome-extension origins that are paired (or pairing endpoint)
    if (isExtensionOrigin && (pathnameIsPair(req.url) || this.pairedExtensionIds.has(extId) || this.pairedExtensionIds.has('legacy') || this.pairedExtensionIds.size === 0)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://127.0.0.1:${this.port}`);
    const pathname = url.pathname;

    // Body size limit: 2MB cap
    let body = '';
    let bodyLength = 0;
    const MAX_BODY_BYTES = 2 * 1024 * 1024;

    req.on('data', (chunk) => {
      bodyLength += chunk.length;
      if (bodyLength > MAX_BODY_BYTES) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Payload Too Large (capped at 2MB)' }));
        req.destroy();
      } else {
        body += chunk;
      }
    });

    req.on('end', () => {
      try {
        const json = body ? JSON.parse(body) : {};

        // 1. GET /ping (public metadata)
        if (req.method === 'GET' && pathname === '/ping') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, app: 'gridforge', version: '1.0.0', paired: this.isPaired() }));
          return;
        }

        // 2. POST /pair (6-digit PIN verification with lockout & constant-time compare)
        if (req.method === 'POST' && pathname === '/pair') {
          // Check lockout
          if (Date.now() < this.lockoutUntil) {
            const waitSeconds = Math.ceil((this.lockoutUntil - Date.now()) / 1000);
            res.writeHead(429, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: `Too many failed attempts. Locked out for ${waitSeconds} seconds.` }));
            return;
          }

          const pinInput = String(json.pin || '').trim();
          const extensionId = String(json.extensionId || extId || 'chrome-extension').trim();

          // Constant-time PIN comparison
          const pinBuf = Buffer.from(pinInput);
          const currentBuf = Buffer.from(this.currentPin);
          const isPinMatch = pinBuf.length === currentBuf.length && crypto.timingSafeEqual(pinBuf, currentBuf);

          if (isPinMatch && Date.now() <= this.pinExpiry) {
            this.failedAttempts = 0;
            const token = crypto.randomBytes(32).toString('hex');
            const hash = this.hashToken(token);

            this.pairedTokens.set(hash, {
              hash,
              extensionId,
              pairedAt: Date.now()
            });
            this.pairedExtensionIds.add(extensionId);
            this.savePairedTokens();
            this.generateNewPin(); // consume PIN immediately

            this.emit('paired', { token, extensionId });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, token, app: 'gridforge' }));
            return;
          }

          // Failed attempt handling
          this.failedAttempts++;
          if (this.failedAttempts >= 5) {
            this.lockoutUntil = Date.now() + 60 * 1000; // 60s lockout
            this.generateNewPin(); // rotate PIN
            res.writeHead(429, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: '5 failed attempts. Locked out for 60 seconds and PIN was rotated.' }));
            return;
          }

          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: `Invalid or expired 6-digit PIN (${5 - this.failedAttempts} attempts left)` }));
          return;
        }

        // --- AUTHENTICATION REQUIRED FOR ALL OTHER ENDPOINTS ---
        const authHeader = req.headers.authorization || '';
        const token = authHeader.replace(/^Bearer\s+/i, '').trim();

        if (!this.isTokenValid(token)) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Unauthorized: valid pairing token required.' }));
          return;
        }

        // 3. GET /api/jobs (retrieve pending jobs)
        if (req.method === 'GET' && pathname === '/api/jobs') {
          const jobs = Array.from(this.pendingJobs.values());
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, jobs }));
          return;
        }

        // 4. POST /api/result (submit SKU results with strict schema validation)
        if (req.method === 'POST' && pathname === '/api/result') {
          const valErr = this.validateSkuResultPayload(json);
          if (valErr) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: `Validation error: ${valErr}` }));
            return;
          }

          const skuResult: SkuResult = {
            jobId: String(json.jobId),
            sku: String(json.sku),
            status: json.status,
            title: json.title ? String(json.title).slice(0, 1000) : undefined,
            imageLink: json.imageLink ? String(json.imageLink).slice(0, 2048) : undefined,
            productLink: json.productLink ? String(json.productLink).slice(0, 2048) : undefined,
            price: json.price != null && !isNaN(Number(json.price)) ? Number(json.price) : undefined,
            stock: json.stock ? String(json.stock).slice(0, 100) : undefined,
            rating: json.rating != null && !isNaN(Number(json.rating)) ? Number(json.rating) : undefined,
            msg: json.msg ? String(json.msg).slice(0, 500) : undefined,
            timestamp: Date.now()
          };

          this.jobResults.set(`${skuResult.jobId}:${skuResult.sku}`, skuResult);
          this.emit('sku:result', skuResult);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
          return;
        }

        // 5. Sheet API endpoints with bounds checking
        if (req.method === 'POST' && pathname === '/api/sheet/write-range') {
          if (json.startRow == null || json.startCol == null || !Array.isArray(json.data)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: 'startRow, startCol, and data array are required' }));
            return;
          }

          const r = Number(json.startRow);
          const c = Number(json.startCol);
          if (r < 0 || r > 1000000 || c < 0 || c > 200 || json.data.length > 10000) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: 'Range exceeds maximum allowed sheet bounds (1M rows x 200 cols)' }));
            return;
          }

          this.emit('sheet:write-range', { startRow: r, startCol: c, data: json.data });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
          return;
        }

        if (req.method === 'POST' && pathname === '/api/sheet/append-rows') {
          if (!Array.isArray(json.data) || json.data.length > 5000) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: 'data must be an array of at most 5000 rows' }));
            return;
          }

          this.emit('sheet:append-rows', { data: json.data });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
          return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Endpoint not found' }));
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err?.message || 'Internal Server Error' }));
      }
    });
  }

  // --- Strict WebSocket Handshake with Origin & Token Check ---
  private handleWebSocketUpgrade(req: http.IncomingMessage, socket: any, _head: Buffer) {
    const origin = req.headers.origin || '';
    const isExtension = origin.startsWith('chrome-extension://');
    const extId = isExtension ? origin.replace('chrome-extension://', '').split('/')[0] : '';

    // Check Origin: reject non-extension origins or untrusted origins
    if (!isExtension) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\nOrigin not allowed');
      socket.destroy();
      return;
    }

    // Extract token from query (?token=...) or Authorization header
    const url = new URL(req.url || '/', `http://127.0.0.1:${this.port}`);
    const tokenQuery = url.searchParams.get('token') || '';
    const tokenHeader = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const token = tokenQuery || tokenHeader;

    if (!this.isTokenValid(token)) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\nUnauthorized: valid pairing token required');
      socket.destroy();
      return;
    }

    const key = req.headers['sec-websocket-key'];
    if (!key) {
      socket.destroy();
      return;
    }

    const acceptKey = crypto
      .createHash('sha1')
      .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
      .digest('base64');

    const headers = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey}`
    ];
    socket.write(headers.join('\r\n') + '\r\n\r\n');

    const clientId = generateId();
    this.activeSockets.set(clientId, {
      socket,
      extensionId: extId,
      ip: req.socket.remoteAddress || '127.0.0.1',
      connectedAt: Date.now()
    });
    this.emit('client:connected', { id: clientId, ip: req.socket.remoteAddress || '127.0.0.1', extensionId: extId });

    // Multi-frame buffer accumulation
    socket._wsBuffer = Buffer.alloc(0);

    socket.on('data', (chunk: Buffer) => {
      socket._wsBuffer = Buffer.concat([socket._wsBuffer, chunk]);
      this.processWebSocketBuffer(socket, (message) => {
        try {
          const json = JSON.parse(message);
          if (json.type === 'result' && json.sku) {
            const res: SkuResult = {
              jobId: json.jobId || 'direct',
              sku: json.sku,
              status: json.status || 'ok',
              title: json.title,
              imageLink: json.imageLink,
              productLink: json.productLink,
              price: json.price,
              stock: json.stock,
              rating: json.rating,
              msg: json.msg,
              timestamp: Date.now()
            };
            this.emit('sku:result', res);
          }
        } catch {}
      });
    });

    socket.on('close', () => {
      this.activeSockets.delete(clientId);
      this.emit('client:disconnected', { id: clientId });
    });

    socket.on('error', () => {
      this.activeSockets.delete(clientId);
      socket.destroy();
    });
  }

  // --- Multi-chunk, Fragmented WebSocket Frame Parser ---
  private processWebSocketBuffer(socket: any, onMessage: (msg: string) => void) {
    while (socket._wsBuffer && socket._wsBuffer.length >= 2) {
      const buffer: Buffer = socket._wsBuffer;
      const isMasked = (buffer[1] & 0x80) !== 0;
      let length = buffer[1] & 0x7f;
      let offset = 2;

      if (length === 126) {
        if (buffer.length < 4) return; // Wait for length bytes
        length = buffer.readUInt16BE(offset);
        offset += 2;
      } else if (length === 127) {
        if (buffer.length < 10) return; // Wait for length bytes
        length = Number(buffer.readBigUInt64BE(offset));
        offset += 8;
      }

      const maskLength = isMasked ? 4 : 0;
      const totalFrameLength = offset + maskLength + length;

      if (buffer.length < totalFrameLength) {
        return; // Partial frame: wait for remaining data
      }

      let mask: Buffer | null = null;
      if (isMasked) {
        mask = buffer.slice(offset, offset + 4);
        offset += 4;
      }

      const payload = buffer.slice(offset, offset + length);
      if (isMasked && mask) {
        for (let i = 0; i < payload.length; i++) {
          payload[i] ^= mask[i % 4];
        }
      }

      // Consume this frame from buffer
      socket._wsBuffer = buffer.slice(totalFrameLength);

      const message = payload.toString('utf8');
      onMessage(message);
    }
  }

  private sendWsMessage(socket: any, obj: any) {
    try {
      const payload = Buffer.from(JSON.stringify(obj), 'utf8');
      const length = payload.length;
      let header: Buffer;

      if (length <= 125) {
        header = Buffer.from([0x81, length]);
      } else if (length <= 65535) {
        header = Buffer.alloc(4);
        header[0] = 0x81;
        header[1] = 126;
        header.writeUInt16BE(length, 2);
      } else {
        header = Buffer.alloc(10);
        header[0] = 0x81;
        header[1] = 127;
        header.writeBigUInt64BE(BigInt(length), 2);
      }

      socket.write(Buffer.concat([header, payload]));
    } catch {}
  }

  private validateSkuResultPayload(json: any): string | null {
    if (!json || typeof json !== 'object') return 'Body must be a JSON object';
    if (!json.jobId || typeof json.jobId !== 'string' || json.jobId.length > 128) return 'jobId must be a string up to 128 chars';
    if (!json.sku || typeof json.sku !== 'string' || json.sku.length > 256) return 'sku must be a string up to 256 chars';
    if (json.status && !['ok', 'notfound', 'error'].includes(json.status)) return 'status must be ok, notfound, or error';
    if (json.imageLink && typeof json.imageLink !== 'string') return 'imageLink must be a string';
    if (json.productLink && typeof json.productLink !== 'string') return 'productLink must be a string';
    if (json.price != null && (typeof json.price !== 'number' || isNaN(json.price) || json.price < 0)) return 'price must be a positive number';
    return null;
  }

  // Job management
  public queueJob(job: BridgeJob) {
    this.pendingJobs.set(job.id, job);
    for (const { socket } of this.activeSockets.values()) {
      this.sendWsMessage(socket, { type: 'job:new', job });
    }
  }

  public getJob(id: string): BridgeJob | undefined {
    return this.pendingJobs.get(id);
  }

  public removeJob(id: string) {
    this.pendingJobs.delete(id);
  }
}

function pathnameIsPair(urlStr?: string): boolean {
  if (!urlStr) return false;
  try {
    const p = new URL(urlStr, 'http://127.0.0.1').pathname;
    return p === '/pair';
  } catch {
    return false;
  }
}
