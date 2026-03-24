import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'cf-tracker.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    // Ensure directory exists
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');

    // Initialize tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        date        TEXT NOT NULL,
        amount      INTEGER NOT NULL,
        description TEXT NOT NULL,
        category    TEXT NOT NULL,
        subcategory TEXT,
        created_at  TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT
      );
    `);

    // Set default allowance if not exists
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('allowance');
    if (!row) {
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('allowance', '5000');
    }
  }
  return db;
}

export interface Transaction {
  id: number;
  date: string;
  amount: number;
  description: string;
  category: string;
  subcategory: string | null;
  created_at: string;
}
