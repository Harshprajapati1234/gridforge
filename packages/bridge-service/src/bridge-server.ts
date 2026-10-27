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

export interface BridgeServerEvents {
  'client:connected': { id: string; ip: string };
  'client:disconnected': { id: string };
  'paired': { token: string };
  'sku:result': SkuResult;
  'sheet:write-range': { startRow: number; startCol: number; data: any[][] };
  'sheet:append-rows': { data: any[][] };
}

export class BridgeServer extends TypedEventEmitter<BridgeServerEvents> {
  private server: http.Server | null = null;
  private port: number;
  private currentPin: string = '';
  private pinExpiry: number = 0;
  private pairedTokens: Set<string> = new Set();
  private pairedFile: string;
  private activeSockets: Map<string, any> = new Map();
  private pendingJobs: Map<string, BridgeJob> = new Map();
  private jobResults: Map<string, SkuResult> = new Map();

  constructor(port = 47831) {
    super();
    this.port = port;
    const appSupport = path.join(os.homedir(), 'Library', 'Application Support', 'GridForge');
    try { fs.mkdirSync(appSupport, { recursive: true }); } catch {}
    this.pairedFile = path.join(appSupport, 'bridge-paired.json');
    this.loadPairedTokens();
    this.generateNewPin();
  }

  private loadPairedTokens() {
    try {
      if (fs.existsSync(this.pairedFile)) {
        const raw = JSON.parse(fs.readFileSync(this.pairedFile, 'utf8'));
        if (Array.isArray(raw.tokens)) {
          this.pairedTokens = new Set(raw.tokens);
        }
      }
    } catch {}
  }

  private savePairedTokens() {
    try {
      fs.writeFileSync(this.pairedFile, JSON.stringify({ tokens: Array.from(this.pairedTokens) }, null, 2));
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

  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => this.handleHttpRequest(req, res));

      // Handle WebSocket upgrade
      this.server.on('upgrade', (req, socket, head) => this.handleWebSocketUpgrade(req, socket, head));

      // Bind ONLY to 127.0.0.1 loopback for strict offline security
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
      for (const socket of this.activeSockets.values()) {
        try { socket.destroy(); } catch {}
      }
      this.activeSockets.clear();
      this.server.close(() => resolve());
    });
  }

  // --- HTTP Request Handler ---
  private handleHttpRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    // Enable CORS for Chrome extensions
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://127.0.0.1:${this.port}`);
    const pathname = url.pathname;

    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const json = body ? JSON.parse(body) : {};

        // 1. Ping
        if (req.method === 'GET' && pathname === '/ping') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, app: 'gridforge', version: '1.0.0', paired: this.isPaired() }));
          return;
        }

        // 2. Pair with 6-digit PIN
        if (req.method === 'POST' && pathname === '/pair') {
          const pin = String(json.pin || '').trim();
          if (pin && pin === this.currentPin && Date.now() <= this.pinExpiry) {
            const token = crypto.randomBytes(24).toString('hex');
            this.pairedTokens.add(token);
            this.savePairedTokens();
            this.generateNewPin(); // consume PIN
            this.emit('paired', { token });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, token, app: 'gridforge' }));
            return;
          }
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Invalid or expired 6-digit PIN' }));
          return;
        }

        // Auth check for API endpoints
        const authHeader = req.headers.authorization || '';
        const token = authHeader.replace(/^Bearer\s+/i, '');
        if (!this.pairedTokens.has(token) && this.pairedTokens.size > 0) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Unauthorized. Please pair with GridForge.' }));
          return;
        }

        // 3. Get pending SKU jobs for Chrome Extension
        if (req.method === 'GET' && pathname === '/api/jobs') {
          const jobs = Array.from(this.pendingJobs.values());
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, jobs }));
          return;
        }

        // 4. Submit SKU result from Chrome Extension
        if (req.method === 'POST' && pathname === '/api/result') {
          const skuResult: SkuResult = {
            jobId: json.jobId,
            sku: json.sku,
            status: json.status || 'ok',
            title: json.title,
            imageLink: json.imageLink,
            productLink: json.productLink,
            price: json.price ? Number(json.price) : undefined,
            stock: json.stock,
            rating: json.rating ? Number(json.rating) : undefined,
            msg: json.msg,
            timestamp: Date.now()
          };

          this.jobResults.set(`${skuResult.jobId}:${skuResult.sku}`, skuResult);
          this.emit('sku:result', skuResult);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
          return;
        }

        // 5. Sheet write operations from extension
        if (req.method === 'POST' && pathname === '/api/sheet/write-range') {
          if (json.startRow != null && json.startCol != null && Array.isArray(json.data)) {
            this.emit('sheet:write-range', { startRow: json.startRow, startCol: json.startCol, data: json.data });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));
            return;
          }
        }

        if (req.method === 'POST' && pathname === '/api/sheet/append-rows') {
          if (Array.isArray(json.data)) {
            this.emit('sheet:append-rows', { data: json.data });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));
            return;
          }
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Endpoint not found' }));
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err?.message || 'Server error' }));
      }
    });
  }

  // --- Lightweight RFC 6455 WebSocket Handshake & Framing ---
  private handleWebSocketUpgrade(req: http.IncomingMessage, socket: any, _head: Buffer) {
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
      `Sec-WebSocket-Accept: ${acceptKey}`,
      '\r\n'
    ];

    socket.write(headers.join('\r\n'));
    const clientId = generateId('ws');
    this.activeSockets.set(clientId, socket);
    this.emit('client:connected', { id: clientId, ip: req.socket.remoteAddress || '127.0.0.1' });

    socket.on('data', (buffer: Buffer) => {
      this.decodeWebSocketFrame(buffer, (msgText) => {
        try {
          const msg = JSON.parse(msgText);
          if (msg.type === 'ping') {
            this.sendWsMessage(socket, { type: 'pong', time: Date.now() });
          } else if (msg.type === 'sku:result') {
            this.emit('sku:result', msg.result);
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

  private sendWsMessage(socket: any, data: any) {
    const jsonStr = JSON.stringify(data);
    const payload = Buffer.from(jsonStr, 'utf8');
    const length = payload.length;

    let frame: Buffer;
    if (length < 126) {
      frame = Buffer.alloc(2 + length);
      frame[0] = 0x81; // FIN + text opcode
      frame[1] = length;
      payload.copy(frame, 2);
    } else if (length <= 65535) {
      frame = Buffer.alloc(4 + length);
      frame[0] = 0x81;
      frame[1] = 126;
      frame.writeUInt16BE(length, 2);
      payload.copy(frame, 4);
    } else {
      frame = Buffer.alloc(10 + length);
      frame[0] = 0x81;
      frame[1] = 127;
      frame.writeBigUInt64BE(BigInt(length), 2);
      payload.copy(frame, 10);
    }

    try { socket.write(frame); } catch {}
  }

  private decodeWebSocketFrame(buffer: Buffer, onMessage: (msg: string) => void) {
    if (buffer.length < 2) return;
    const isMasked = (buffer[1] & 0x80) !== 0;
    let length = buffer[1] & 0x7f;
    let offset = 2;

    if (length === 126) {
      length = buffer.readUInt16BE(offset);
      offset += 2;
    } else if (length === 127) {
      length = Number(buffer.readBigUInt64BE(offset));
      offset += 8;
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

    const message = payload.toString('utf8');
    onMessage(message);
  }

  // Public helpers for modules
  public queueJob(job: BridgeJob) {
    this.pendingJobs.set(job.id, job);
    // Broadcast job to all connected sockets
    for (const socket of this.activeSockets.values()) {
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
