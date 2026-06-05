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

    -- Lead timeline events log
    CREATE TABLE IF NOT EXISTS lead_timeline (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      event_type TEXT NOT NULL, -- 'inbound' | 'outbound' | 'ai_action' | 'human_action' | 'stage_change'
      description TEXT NOT NULL,
      timestamp TEXT DEFAULT (CURRENT_TIMESTAMP),
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    );

    -- Tasks table
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending', -- 'pending' | 'completed'
      type TEXT NOT NULL, -- 'HUMAN_HANDOFF_TASK' | 'QUOTATION_TASK' | 'APPOINTMENT_TASK' | 'FOLLOWUP_REMINDER'
      due_at TEXT,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    );

    -- Quotations table
    CREATE TABLE IF NOT EXISTS quotations (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      package_tier TEXT NOT NULL,        -- 'starter_presence' | 'growth_engine' | 'sales_system' | 'business_os' | 'custom'
      package_name TEXT NOT NULL,
      line_items TEXT NOT NULL,          -- JSON array of { description, price }
      setup_cost REAL NOT NULL,
      monthly_cost REAL NOT NULL,
      discount_pct REAL DEFAULT 0,
      total_setup REAL NOT NULL,
      total_monthly REAL NOT NULL,
      currency TEXT DEFAULT 'INR',
      validity_days INTEGER DEFAULT 7,
      status TEXT DEFAULT 'draft',       -- 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired'
      version INTEGER DEFAULT 1,         -- Version number (v1, v2, v3 revisions)
      parent_quotation_id TEXT,          -- Points to previous version; NULL for first version
      expiry_task_created INTEGER DEFAULT 0, -- Lock to avoid duplicate expiry tasks
      sent_at TEXT,
      viewed_at TEXT,
      accepted_at TEXT,
      rejected_at TEXT,
      expired_at TEXT,
      notes TEXT,
      pdf_path TEXT,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT DEFAULT (CURRENT_TIMESTAMP),
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    );

    -- Appointment slots table
    CREATE TABLE IF NOT EXISTS appointment_slots (
      id TEXT PRIMARY KEY,
      slot_date TEXT NOT NULL,           -- 'YYYY-MM-DD'
      slot_time TEXT NOT NULL,           -- 'HH:MM'
      duration_mins INTEGER DEFAULT 30,
      is_available INTEGER DEFAULT 1,
      booked_by_lead_id TEXT,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP)
    );

    CREATE INDEX IF NOT EXISTS idx_token_usage_date ON token_usage(timestamp);
    CREATE INDEX IF NOT EXISTS idx_handoff_lead ON handoff_alerts(lead_id, status);
    CREATE INDEX IF NOT EXISTS idx_appointments_lead ON appointments(lead_id, status);
    CREATE INDEX IF NOT EXISTS idx_lead_tags_lead ON lead_tags_log(lead_id);
    CREATE INDEX IF NOT EXISTS idx_lead_timeline_lead ON lead_timeline(lead_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_lead ON tasks(lead_id, status);
    CREATE INDEX IF NOT EXISTS idx_quotations_lead ON quotations(lead_id, status);

    -- Pipeline stage movement audit trail (Phase 4B)
    CREATE TABLE IF NOT EXISTS pipeline_audit_log (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      old_stage TEXT NOT NULL,
      new_stage TEXT NOT NULL,
      changed_by TEXT NOT NULL,    -- 'admin' | 'system'
      reason TEXT,
      timestamp TEXT DEFAULT (CURRENT_TIMESTAMP),
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_pipeline_audit_lead ON pipeline_audit_log(lead_id, timestamp);
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
    { sql: 'ALTER TABLE leads ADD COLUMN ai_summary_detailed TEXT;',                label: 'ai_summary_detailed' },
    { sql: 'ALTER TABLE leads ADD COLUMN intent_level TEXT DEFAULT "COLD";',        label: 'intent_level' },
    { sql: 'ALTER TABLE leads ADD COLUMN recommended_action TEXT;',                label: 'recommended_action' },
    { sql: 'ALTER TABLE appointments ADD COLUMN confirmed_at TEXT;',                label: 'confirmed_at' },
    { sql: 'ALTER TABLE appointments ADD COLUMN reminder_sent INTEGER DEFAULT 0;',  label: 'reminder_sent' },
    { sql: 'ALTER TABLE appointments ADD COLUMN meeting_link TEXT;',                label: 'meeting_link' },
    { sql: 'ALTER TABLE appointments ADD COLUMN deal_value REAL;',                  label: 'deal_value' },
    // Quotation versioning & expiry columns (Phase 4A+)
    { sql: 'ALTER TABLE quotations ADD COLUMN version INTEGER DEFAULT 1;',                    label: 'quotations.version' },
    { sql: 'ALTER TABLE quotations ADD COLUMN parent_quotation_id TEXT;',                     label: 'quotations.parent_quotation_id' },
    { sql: 'ALTER TABLE quotations ADD COLUMN expiry_task_created INTEGER DEFAULT 0;',        label: 'quotations.expiry_task_created' },
    { sql: 'ALTER TABLE quotations ADD COLUMN expired_at TEXT;',                              label: 'quotations.expired_at' },
    // Pipeline Revenue Forecasting columns (Phase 4B)
    { sql: 'ALTER TABLE leads ADD COLUMN deal_probability REAL DEFAULT 20;',                  label: 'leads.deal_probability' },
    { sql: 'ALTER TABLE leads ADD COLUMN deal_setup_value REAL DEFAULT 0;',                   label: 'leads.deal_setup_value' },
    { sql: 'ALTER TABLE leads ADD COLUMN deal_mrr REAL DEFAULT 0;',                           label: 'leads.deal_mrr' },
    { sql: 'ALTER TABLE leads ADD COLUMN deal_annual_value REAL DEFAULT 0;',                  label: 'leads.deal_annual_value' },
    { sql: 'ALTER TABLE leads ADD COLUMN stage_entered_at TEXT;',                               label: 'leads.stage_entered_at' },
    { sql: 'ALTER TABLE leads ADD COLUMN pipeline_notes TEXT;',                               label: 'leads.pipeline_notes' },
    { sql: 'ALTER TABLE leads ADD COLUMN assigned_owner TEXT;',                               label: 'leads.assigned_owner' },
    { sql: 'ALTER TABLE leads ADD COLUMN stuck_task_7d INTEGER DEFAULT 0;',                   label: 'leads.stuck_task_7d' },
    { sql: 'ALTER TABLE leads ADD COLUMN stuck_task_14d INTEGER DEFAULT 0;',                  label: 'leads.stuck_task_14d' },
    { sql: 'ALTER TABLE leads ADD COLUMN stuck_task_30d INTEGER DEFAULT 0;',                  label: 'leads.stuck_task_30d' },
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
