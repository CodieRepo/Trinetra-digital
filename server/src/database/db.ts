import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const dbPath = process.env.DATABASE_PATH || './data/trinetra.db';
export const resolvedDbPath = path.resolve(process.cwd(), dbPath);

// Ensure the directory exists
const dbDir = path.dirname(resolvedDbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db: Database<sqlite3.Database, sqlite3.Statement>;

export async function initDb(): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
  if (db) return db;

  db = await open({
    filename: resolvedDbPath,
    driver: sqlite3.Database
  });

  // Enable WAL mode for high performance and low concurrency overhead
  await db.exec('PRAGMA journal_mode = WAL;');
  await db.exec('PRAGMA synchronous = NORMAL;');
  await db.exec('PRAGMA temp_store = MEMORY;');
  await db.exec('PRAGMA foreign_keys = ON;');

  // Create tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP)
    );

    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT NOT NULL,
      company TEXT,
      service TEXT,
      source TEXT DEFAULT 'website',
      status TEXT DEFAULT 'new',
      ai_score INTEGER DEFAULT 0,
      ai_budget BOOLEAN DEFAULT 0,
      ai_summary TEXT,
      notes TEXT,
      ai_enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT DEFAULT (CURRENT_TIMESTAMP)
    );

    CREATE TABLE IF NOT EXISTS whatsapp_chats (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      direction TEXT NOT NULL, -- 'inbound' or 'outbound'
      body TEXT NOT NULL,
      status TEXT DEFAULT 'sent',
      timestamp TEXT DEFAULT (CURRENT_TIMESTAMP),
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS followup_sequences (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      sequence_name TEXT NOT NULL,
      current_step INTEGER DEFAULT 1,
      status TEXT DEFAULT 'active', -- 'active', 'paused', 'completed', 'cancelled'
      next_run_at TEXT NOT NULL,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      details TEXT,
      timestamp TEXT DEFAULT (CURRENT_TIMESTAMP)
    );
  `);

  try {
    await db.exec('ALTER TABLE leads ADD COLUMN ai_enabled INTEGER DEFAULT 1;');
    console.log('⚡ Schema Migrated: Added ai_enabled column to leads table in db.ts');
  } catch (e) {
    // Ignore: Column already exists
  }

  // Insert default admin if users table is empty
  const adminExists = await db.get('SELECT id FROM users WHERE username = ?', ['admin']);
  if (!adminExists) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('trinetra123', salt);
    await db.run(
      'INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)',
      ['admin-uuid-1', 'admin', hash, 'admin']
    );
    console.log('Default admin user created: admin / trinetra123');
  }

  console.log(`SQLite database successfully initialized at: ${resolvedDbPath}`);
  return db;
}

export function getDb() {
  if (!db) {
    throw new Error('Database not initialized! Call initDb() first.');
  }
  return db;
}

export async function logAuditAction(action: string, details?: string) {
  try {
    const database = getDb();
    const id = 'audit-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    await database.run(
      'INSERT INTO audit_logs (id, action, details) VALUES (?, ?, ?)',
      [id, action, details || null]
    );
    console.log(`📝 [AUDIT] ${action}: ${details || ''}`);
  } catch (err) {
    console.error('❌ Audit logging failed:', err);
  }
}
