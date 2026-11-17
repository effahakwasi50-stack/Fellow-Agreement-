import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { createServer as createViteServer } from 'vite';
import { DEFAULT_ADMIN_PIN, FELLOWS_SEED } from './src/data/fellowsSeed.ts';
import { parseFellowsUpload, validateSubmission } from './src/utils/verification.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, 'republic_hall_records.db');

const db = new DatabaseSync(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS fellows_directory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL UNIQUE
  );
  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    staff_id TEXT NOT NULL,
    signature_image BLOB NOT NULL,
    timestamp TEXT NOT NULL
  );
`);

const fellowCountRow = db
  .prepare('SELECT COUNT(*) AS count FROM fellows_directory')
  .get() as { count: number };

if (fellowCountRow.count === 0) {
  const insertStmt = db.prepare(
    'INSERT OR IGNORE INTO fellows_directory (full_name) VALUES (?)',
  );
  db.exec('BEGIN');
  try {
    for (const name of FELLOWS_SEED) {
      insertStmt.run(name);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function formatNowTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(
    now.getHours(),
  )}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function checkPin(req: express.Request): boolean {
  const headerPin = req.header('x-admin-pin') ?? '';
  return headerPin === DEFAULT_ADMIN_PIN;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/fellows', (_req, res) => {
    const rows = db
      .prepare('SELECT id, full_name FROM fellows_directory ORDER BY id ASC')
      .all() as Array<{ id: number; full_name: string }>;
    res.json({ fellows: rows });
  });

  app.post('/api/admin/verify-pin', (req, res) => {
    const pin = typeof req.body?.pin === 'string' ? req.body.pin : '';
    if (pin !== DEFAULT_ADMIN_PIN) {
      res.status(401).json({ valid: false, error: 'Invalid Admin PIN.' });
      return;
    }
    res.json({ valid: true });
  });

  app.post('/api/fellows', (req, res) => {
    if (!checkPin(req)) {
      res.status(401).json({ error: 'Unauthorized: invalid Admin PIN.' });
      return;
    }
    const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';
    if (!fullName) {
      res.status(400).json({ error: 'Fellow full name is required.' });
      return;
    }
    try {
      const info = db
        .prepare('INSERT INTO fellows_directory (full_name) VALUES (?)')
        .run(fullName);
      res.status(201).json({
        fellow: { id: Number(info.lastInsertRowid), full_name: fullName },
      });
    } catch {
      res.status(409).json({ error: 'This Fellow name already exists in the directory.' });
    }
  });

  app.delete('/api/fellows/:id', (req, res) => {
    if (!checkPin(req)) {
      res.status(401).json({ error: 'Unauthorized: invalid Admin PIN.' });
      return;
    }
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid Fellow ID.' });
      return;
    }
    const info = db.prepare('DELETE FROM fellows_directory WHERE id = ?').run(id);
    if (info.changes === 0) {
      res.status(404).json({ error: 'Fellow not found.' });
      return;
    }
    res.json({ deleted: true });
  });

  app.post('/api/fellows/import', (req, res) => {
    if (!checkPin(req)) {
      res.status(401).json({ error: 'Unauthorized: invalid Admin PIN.' });
      return;
    }
    const content = typeof req.body?.content === 'string' ? req.body.content : '';
    const filename = typeof req.body?.filename === 'string' ? req.body.filename : 'fellows.txt';
    const replaceExisting = Boolean(req.body?.replaceExisting);

    const parsedNames = parseFellowsUpload(content, filename);
    if (parsedNames.length === 0) {
      res.status(400).json({ error: 'No valid Fellow names found in uploaded file.' });
      return;
    }

    let inserted = 0;
    db.exec('BEGIN');
    try {
      if (replaceExisting) {
        db.exec('DELETE FROM fellows_directory');
      }
      const stmt = db.prepare(
        'INSERT OR IGNORE INTO fellows_directory (full_name) VALUES (?)',
      );
      for (const name of parsedNames) {
        const info = stmt.run(name);
        inserted += Number(info.changes);
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    const fellows = db
      .prepare('SELECT id, full_name FROM fellows_directory ORDER BY id ASC')
      .all() as Array<{ id: number; full_name: string }>;

    res.json({ inserted, detected: parsedNames.length, fellows });
  });

  app.post('/api/submissions', (req, res) => {
    const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';
    const staffId = typeof req.body?.staffId === 'string' ? req.body.staffId.trim() : '';
    const signatureDataUrl =
      typeof req.body?.signatureDataUrl === 'string' ? req.body.signatureDataUrl : '';

    const hasPngPrefix = signatureDataUrl.startsWith('data:image/png;base64,');
    const validation = validateSubmission({
      fullName: fullName || null,
      staffId,
      hasSignature: hasPngPrefix && signatureDataUrl.length > 50,
    });

    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const base64Payload = signatureDataUrl.slice('data:image/png;base64,'.length);
    const pngBuffer = Buffer.from(base64Payload, 'base64');
    if (pngBuffer.length === 0) {
      res.status(400).json({ error: 'Invalid signature image payload.' });
      return;
    }

    const timestamp = formatNowTimestamp();
    const info = db
      .prepare(
        'INSERT INTO submissions (full_name, staff_id, signature_image, timestamp) VALUES (?, ?, ?, ?)',
      )
      .run(fullName, staffId, pngBuffer, timestamp);

    res.status(201).json({
      submission: {
        id: Number(info.lastInsertRowid),
        full_name: fullName,
        staff_id: staffId,
        signature_data_url: signatureDataUrl,
        timestamp,
      },
    });
  });

  app.get('/api/submissions', (req, res) => {
    if (!checkPin(req)) {
      res.status(401).json({ error: 'Unauthorized: invalid Admin PIN.' });
      return;
    }
    const rows = db
      .prepare(
        'SELECT id, full_name, staff_id, signature_image, timestamp FROM submissions ORDER BY id DESC',
      )
      .all() as Array<{
      id: number;
      full_name: string;
      staff_id: string;
      signature_image: Uint8Array;
      timestamp: string;
    }>;

    const submissions = rows.map((row) => ({
      id: row.id,
      full_name: row.full_name,
      staff_id: row.staff_id,
      signature_data_url: `data:image/png;base64,${Buffer.from(row.signature_image).toString(
        'base64',
      )}`,
      timestamp: row.timestamp,
    }));

    res.json({ submissions });
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Republic Hall Verification Portal listening on http://localhost:${PORT}`);
  });
}

startServer();
