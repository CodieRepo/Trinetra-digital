import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcrypt';
import { envConfig } from '../config/env';

export const resolvedDbPath = path.resolve(process.cwd(), envConfig.DATABASE_PATH);

// Ensure the parent directory exists
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

  // Enable high-performance production PRAGMAs
  await db.exec('PRAGMA journal_mode = WAL;');
  await db.exec('PRAGMA synchronous = NORMAL;');
  await db.exec('PRAGMA temp_store = MEMORY;');
  await db.exec('PRAGMA foreign_keys = ON;');

  // Execute Schema migrations
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
      status TEXT DEFAULT 'active', -- 'active', 'paused', 'completed'
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

    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      target_group TEXT NOT NULL,
      status TEXT DEFAULT 'draft', -- 'draft', 'sending', 'completed', 'failed'
      sent_count INTEGER DEFAULT 0,
      delivered_count INTEGER DEFAULT 0,
      read_count INTEGER DEFAULT 0,
      scheduled_at TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP)
    );

    CREATE TABLE IF NOT EXISTS ai_agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT DEFAULT 'active', -- 'active', 'learning', 'paused'
      confidence_threshold INTEGER DEFAULT 80,
      total_conversations INTEGER DEFAULT 0,
      accuracy_rate REAL DEFAULT 90.0,
      prompt TEXT NOT NULL,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP)
    );

    CREATE TABLE IF NOT EXISTS automation_workflows (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      trigger TEXT NOT NULL,
      status TEXT DEFAULT 'active', -- 'active', 'paused'
      nodes_count INTEGER DEFAULT 0,
      connections_count INTEGER DEFAULT 0,
      last_triggered_at TEXT,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP)
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      unread_count INTEGER DEFAULT 0,
      last_message TEXT,
      last_activity TEXT DEFAULT (CURRENT_TIMESTAMP),
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_conversations_phone ON conversations(phone);
    CREATE INDEX IF NOT EXISTS idx_conversations_lead ON conversations(lead_id);

    -- Rolling conversation memory (compressed summaries)
    CREATE TABLE IF NOT EXISTS ai_memory (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL UNIQUE,
      summary TEXT NOT NULL,
      message_count INTEGER DEFAULT 0,
      last_updated TEXT DEFAULT (CURRENT_TIMESTAMP),
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    );

    -- Token usage and cost tracking per AI call
    CREATE TABLE IF NOT EXISTS token_usage (
      id TEXT PRIMARY KEY,
      lead_id TEXT,
      model TEXT NOT NULL,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      cost_usd REAL DEFAULT 0,
      timestamp TEXT DEFAULT (CURRENT_TIMESTAMP)
    );

    -- Human handoff alert queue
    CREATE TABLE IF NOT EXISTS handoff_alerts (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      reason TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    );

    -- Appointment booking requests from WhatsApp conversations
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      requested_at TEXT DEFAULT (CURRENT_TIMESTAMP),
      preferred_date TEXT,
      preferred_time TEXT,
      call_type TEXT DEFAULT 'call', -- 'call', 'video', 'in_person'
      status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'completed', 'cancelled'
      notes TEXT,
      admin_notes TEXT,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    );

    -- Lead tag history log (one row per tag per lead)
    CREATE TABLE IF NOT EXISTS lead_tags_log (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      tag TEXT NOT NULL,
      added_at TEXT DEFAULT (CURRENT_TIMESTAMP),
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_token_usage_date ON token_usage(timestamp);
    CREATE INDEX IF NOT EXISTS idx_handoff_lead ON handoff_alerts(lead_id, status);
    CREATE INDEX IF NOT EXISTS idx_appointments_lead ON appointments(lead_id, status);
    CREATE INDEX IF NOT EXISTS idx_lead_tags_lead ON lead_tags_log(lead_id);
  `);

  // ─── Safe incremental schema migrations (additive only — never destructive) ──
  const migrations: Array<{ sql: string; label: string }> = [
    { sql: 'ALTER TABLE leads ADD COLUMN ai_enabled INTEGER DEFAULT 1;',            label: 'ai_enabled' },
    { sql: 'ALTER TABLE leads ADD COLUMN city TEXT;',                               label: 'city' },
    { sql: 'ALTER TABLE leads ADD COLUMN business_type TEXT;',                      label: 'business_type' },
    { sql: 'ALTER TABLE leads ADD COLUMN business_name TEXT;',                      label: 'business_name' },
    { sql: 'ALTER TABLE leads ADD COLUMN monthly_lead_volume TEXT;',                label: 'monthly_lead_volume' },
    { sql: 'ALTER TABLE leads ADD COLUMN team_size TEXT;',                          label: 'team_size' },
    { sql: 'ALTER TABLE leads ADD COLUMN has_website INTEGER DEFAULT 0;',           label: 'has_website' },
    { sql: 'ALTER TABLE leads ADD COLUMN has_crm INTEGER DEFAULT 0;',               label: 'has_crm' },
    { sql: 'ALTER TABLE leads ADD COLUMN current_problems TEXT;',                   label: 'current_problems' },
    { sql: 'ALTER TABLE leads ADD COLUMN budget_range TEXT;',                       label: 'budget_range' },
    { sql: 'ALTER TABLE leads ADD COLUMN urgency_level TEXT;',                      label: 'urgency_level' },
    { sql: 'ALTER TABLE leads ADD COLUMN is_decision_maker INTEGER DEFAULT 0;',     label: 'is_decision_maker' },
    { sql: 'ALTER TABLE leads ADD COLUMN lead_tags TEXT DEFAULT "[]";',             label: 'lead_tags' },
    { sql: 'ALTER TABLE leads ADD COLUMN recommended_package TEXT;',                label: 'recommended_package' },
    { sql: 'ALTER TABLE leads ADD COLUMN lead_stage TEXT DEFAULT "greeting";',      label: 'lead_stage' },
    { sql: 'ALTER TABLE leads ADD COLUMN opt_out INTEGER DEFAULT 0;',               label: 'opt_out' },
    { sql: 'ALTER TABLE leads ADD COLUMN appointment_requested INTEGER DEFAULT 0;', label: 'appointment_requested' },
  ];

  for (const migration of migrations) {
    try {
      await db.exec(migration.sql);
      console.log(`⚡ Schema Migrated: Added column '${migration.label}' to leads table`);
    } catch (e) {
      // Column already exists — safe to ignore
    }
  }

  // Create default admin credentials if table is fresh
  const adminExists = await db.get('SELECT id FROM users WHERE username = ?', ['admin']);
  if (!adminExists) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('trinetra123', salt);
    await db.run(
      'INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)',
      ['admin-uuid-1', 'admin', hash, 'admin']
    );
    console.log('🌱 Default admin credentials initialized: admin / trinetra123');
  }

  console.log(`SQLite database successfully connected at: ${resolvedDbPath}`);
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
    console.log(`📝 [AUDIT LOG] ${action}: ${details || ''}`);
  } catch (err) {
    console.error('⚠️ Audit logger error:', err);
  }
}
