import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'erp.db');

let SQL;
let rawDb;

export async function getDb() {
  if (rawDb) return rawDb;

  SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    rawDb = new SQL.Database(fileBuffer);
  } else {
    rawDb = new SQL.Database();
    saveDb();
  }

  return rawDb;
}

export function saveDb() {
  if (!rawDb) return;
  const data = rawDb.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

// Helper methods mimicking standard SQLite driver
export const db = {
  async init() {
    await getDb();
  },

  all(sql, params = []) {
    if (!rawDb) throw new Error('Database not initialized. Call getDb() first.');
    const stmt = rawDb.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  },

  get(sql, params = []) {
    if (!rawDb) throw new Error('Database not initialized. Call getDb() first.');
    const stmt = rawDb.prepare(sql);
    stmt.bind(params);
    let result = null;
    if (stmt.step()) {
      result = stmt.getAsObject();
    }
    stmt.free();
    return result;
  },

  run(sql, params = []) {
    if (!rawDb) throw new Error('Database not initialized. Call getDb() first.');
    const stmt = rawDb.prepare(sql);
    stmt.run(params);
    stmt.free();

    // Get last insert rowid and changes
    const rowIdRes = rawDb.exec('SELECT last_insert_rowid() as id, changes() as changes');
    let lastInsertRowid = 0;
    let changes = 0;
    if (rowIdRes.length > 0 && rowIdRes[0].values.length > 0) {
      lastInsertRowid = rowIdRes[0].values[0][0];
      changes = rowIdRes[0].values[0][1];
    }

    saveDb();
    return { lastInsertRowid, changes };
  },

  exec(sql) {
    if (!rawDb) throw new Error('Database not initialized. Call getDb() first.');
    rawDb.exec(sql);
    saveDb();
  }
};

export default db;
