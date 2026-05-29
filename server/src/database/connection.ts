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
  `);

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

  // Preload Mock Leads if fresh
  const leadsCount = await db.get('SELECT COUNT(*) as count FROM leads');
  if (leadsCount && leadsCount.count === 0) {
    console.log('🌱 Databases tables empty. Seeding mock leads for E2E tests...');
    
    // Seed 3 realistic Leads
    const demoLeads = [
      {
        id: 'demo-lead-1',
        name: 'Aarav Sharma',
        email: 'aarav.sharma@gmail.com',
        phone: '+919988776655',
        company: 'Sharma Medicos',
        service: 'WhatsApp Automation',
        source: 'website',
        status: 'qualified',
        ai_score: 94,
        ai_budget: 1,
        ai_summary: 'Pharmacy retail manager wanting refill triggers.',
        notes: 'Requested scheduling.'
      },
      {
        id: 'demo-lead-2',
        name: 'Priya Verma',
        email: 'priya.verma@outlook.com',
        phone: '+918877665544',
        company: 'Verma coaching Academy',
        service: 'AI CRM Solutions',
        source: 'referral',
        status: 'nurturing',
        ai_score: 82,
        ai_budget: 1,
        ai_summary: 'Educational partner inquiring on student workflows.',
        notes: 'Emailed portfolio details.'
      },
      {
        id: 'demo-lead-3',
        name: 'Rohan Gupta',
        email: null,
        phone: '+917766554433',
        company: 'Gupta Builders Group',
        service: 'Smart Follow-up Client',
        source: 'website',
        status: 'new',
        ai_score: 65,
        ai_budget: 0,
        ai_summary: 'Real estate developer looking for auto setter sequence.',
        notes: 'Needs live workflow demo.'
      }
    ];

    for (const lead of demoLeads) {
      await db.run(
        `INSERT INTO leads (id, name, email, phone, company, service, source, status, ai_score, ai_budget, ai_summary, notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          lead.id, lead.name, lead.email, lead.phone, lead.company,
          lead.service, lead.source, lead.status, lead.ai_score,
          lead.ai_budget, lead.ai_summary, lead.notes
        ]
      );

      // Seed conversation threads for CRM dashboard compatibility
      let lastMsg = 'No conversations started yet.';
      if (lead.id === 'demo-lead-1') {
        lastMsg = 'Hello Aarav! 🚀 We can set up automated refill triggers for Sharma Medicos in under 2 hours. When are you free?';
      } else if (lead.id === 'demo-lead-2') {
        lastMsg = 'Educational partner inquiring on student workflows.';
      } else if (lead.id === 'demo-lead-3') {
        lastMsg = 'Real estate developer looking for auto setter sequence.';
      }

      await db.run(
        `INSERT INTO conversations (id, lead_id, phone, unread_count, last_message) 
         VALUES (?, ?, ?, ?, ?)`,
        [`conv-${lead.id}`, lead.id, lead.phone, 0, lastMsg]
      );

      // Seed chat bubbles
      if (lead.id === 'demo-lead-1') {
        await db.run(
          `INSERT INTO whatsapp_chats (id, lead_id, direction, body, status) VALUES (?, ?, ?, ?, ?)`,
          ['chat-1', lead.id, 'inbound', 'Hi Trinetra, I saw your WhatsApp CRM, I want to deploy this.', 'read']
        );
        await db.run(
          `INSERT INTO whatsapp_chats (id, lead_id, direction, body, status) VALUES (?, ?, ?, ?, ?)`,
          ['chat-2', lead.id, 'outbound', 'Hello Aarav! 🚀 We can set up automated refill triggers for Sharma Medicos in under 2 hours. When are you free?', 'sent']
        );
      }
    }
    console.log('✅ SQLite database pre-seeded with 3 mock entities.');
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
