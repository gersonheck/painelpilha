'use strict';

/**
 * Servidor Node (CommonJS) para app.vaideplanob.com.br
 * - Serve o SPA estático (dist/) do Vite.
 * - Expõe API de sono em /api/sleep (coerente com src/shared/contracts/sleep.ts).
 * - Conecta ao PostgreSQL quando DATABASE_URL está definido; senão usa store em memória.
 */

const path = require('path');
const fs = require('fs');
const http = require('http');

let express;
let pg;
try { express = require('express'); } catch (_) { express = null; }
try { pg = require('pg'); } catch (_) { pg = null; }

const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, '..', '..', 'dist');

// ---------------------------------------------------------------------------
// Validação de SleepRecord (mesma regra do front em src/shared/contracts/sleep.ts)
// ---------------------------------------------------------------------------
const SLEEP_RECORD_SOURCES = ['manual', 'passive-smartphone', 'wearable', 'hybrid'];
const SAFE_IDENTIFIER = /^[a-f0-9]{64}$/;
const CLOCK_TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?$/;

function isRecord(v) { return typeof v === 'object' && v !== null && !Array.isArray(v); }
function isClockTime(v) { return typeof v === 'string' && CLOCK_TIME.test(v); }
function isSleepRecordSource(v) { return typeof v === 'string' && SLEEP_RECORD_SOURCES.includes(v); }
function isPerceivedQuality(v) { return Number.isInteger(v) && v >= 1 && v <= 5; }
function isSleepDuration(v) { return typeof v === 'number' && Number.isFinite(v) && v >= 0.5 && v <= 16; }
function isConfidence(v) { return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1; }

function isSleepRecord(value) {
  if (!isRecord(value)) return false;
  const hasBed = value.bedTime !== undefined;
  const hasWake = value.wakeTime !== undefined;
  const paired = (!hasBed && !hasWake) || (isClockTime(value.bedTime) && value.wakeTime !== undefined ? false : false);
  const pairedOk = (!hasBed && !hasWake) || (typeof value.bedTime === 'string' && isClockTime(value.bedTime) && typeof value.wakeTime === 'string' && isClockTime(value.wakeTime));
  return (
    typeof value.id === 'string' && value.id.length > 0
    && typeof value.collaboratorId === 'string' && SAFE_IDENTIFIER.test(value.collaboratorId)
    && typeof value.dayKey === 'string' && ISO_DAY.test(value.dayKey)
    && typeof value.timestamp === 'string' && ISO_DATE.test(value.timestamp)
    && isSleepDuration(value.sleepHours)
    && isSleepRecordSource(value.source)
    && isConfidence(value.confidence)
    && (pairedOk || (!hasBed && !hasWake))
    && (value.perceivedQuality === undefined || isPerceivedQuality(value.perceivedQuality))
    && (value.notes === undefined || isRecord(value.notes))
  );
}

// ---------------------------------------------------------------------------
// Store: PostgreSQL (se DATABASE_URL) ou memória
// ---------------------------------------------------------------------------
const memoryStore = new Map(); // collaboratorId -> SleepRecord[]

async function getPool() {
  if (!process.env.DATABASE_URL || !pg) return null;
  if (getPool._pool) return getPool._pool;
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pool.query(
    "CREATE TABLE IF NOT EXISTS sleep_records ("
    + "id text PRIMARY KEY, collaborator_id text NOT NULL, day_key text NOT NULL, data jsonb NOT NULL, created_at timestamptz DEFAULT now());"
    + "CREATE INDEX IF NOT EXISTS idx_sleep_collaborator ON sleep_records(collaborator_id);",
  );
  getPool._pool = pool;
  return pool;
}

async function listRecords(collaboratorId) {
  const pool = await getPool();
  if (!pool) return memoryStore.get(collaboratorId) || [];
  const res = await pool.query(
    "SELECT data FROM sleep_records WHERE collaborator_id = $1 ORDER BY (data->>'timestamp') DESC",
    [collaboratorId],
  );
  return res.rows.map((r) => r.data);
}

async function insertRecord(record) {
  const pool = await getPool();
  if (!pool) {
    const arr = memoryStore.get(record.collaboratorId) || [];
    arr.unshift(record);
    memoryStore.set(record.collaboratorId, arr);
    return record;
  }
  await pool.query(
    "INSERT INTO sleep_records (id, collaborator_id, day_key, data) VALUES ($1,$2,$3,$4) "
    + "ON CONFLICT (id) DO UPDATE SET data = $4",
    [record.id, record.collaboratorId, record.dayKey, JSON.stringify(record)],
  );
  return record;
}

async function deleteRecord(collaboratorId, id) {
  const pool = await getPool();
  if (!pool) {
    const arr = memoryStore.get(collaboratorId) || [];
    memoryStore.set(collaboratorId, arr.filter((r) => r.id !== id));
    return;
  }
  await pool.query('DELETE FROM sleep_records WHERE collaborator_id = $1 AND id = $2', [collaboratorId, id]);
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch (e) { reject(new Error('JSON inválido')); }
    });
    req.on('error', reject);
  });
}

async function handleApi(req, res, url) {
  if (url.pathname === '/api/health') {
    const db = process.env.DATABASE_URL ? 'postgres' : 'memory';
    return sendJson(res, 200, { status: 'ok', db, ts: Date.now() });
  }

  const m = url.pathname.match(/^\/api\/sleep\/([a-f0-9]{64})$/);
  if (!m) return sendJson(res, 404, { error: 'Rota não encontrada.' });
  const collaboratorId = m[1];

  if (req.method === 'GET') {
    const records = await listRecords(collaboratorId);
    return sendJson(res, 200, { items: records });
  }

  if (req.method === 'POST') {
    const body = await readBody(req);
    const record = { ...body, collaboratorId };
    if (!isSleepRecord(record)) {
      return sendJson(res, 422, { error: 'Registro de sono inválido.', received: record });
    }
    const saved = await insertRecord(record);
    return sendJson(res, 201, saved);
  }

  if (req.method === 'DELETE') {
    const rm = url.pathname.match(/^\/api\/sleep\/[a-f0-9]{64}\/([^/]+)$/);
    if (!rm) return sendJson(res, 400, { error: 'Informe o id do registro.' });
    await deleteRecord(collaboratorId, decodeURIComponent(rm[1]));
    return sendJson(res, 204, {});
  }

  return sendJson(res, 405, { error: 'Método não permitido.' });
}

const handler = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.startsWith('/api/')) {
    handleApi(req, res, url).catch((e) => sendJson(res, 500, { error: e.message }));
    return;
  }
  serveStatic(req, res, url);
});

function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/index.html';
  const filePath = path.join(DIST_DIR, rel);
  if (!filePath.startsWith(DIST_DIR)) { res.writeHead(403); res.end('Forbidden'); return; }
  fs.readFile(filePath, (err, content) => {
    if (err) {
      const indexHtml = path.join(DIST_DIR, 'index.html');
      if (fs.existsSync(indexHtml)) { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(fs.readFileSync(indexHtml)); }
      else { res.writeHead(404); res.end('Not found'); }
      return;
    }
    const ext = path.extname(filePath);
    const types = {
      '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
      '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json',
    };
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

handler.listen(PORT, () => {
  console.log(`[server] ouvindo na porta ${PORT} | db=${process.env.DATABASE_URL ? 'postgres' : 'memory'} | dist=${DIST_DIR}`);
});
