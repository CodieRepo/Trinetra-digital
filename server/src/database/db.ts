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

  // Seed default demo leads if leads table is empty
  const leadsCount = await db.get('SELECT COUNT(*) as count FROM leads');
  if (leadsCount && leadsCount.count === 0) {
    console.log('🌱 Database is empty. Seeding mock demo leads for testing...');
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
        ai_summary: 'Owner of a chain of retail pharmacies. Wants to automate batch refill reminders and lead follow-ups. Budget is verified.',
        notes: 'Highly motivated to get started. Scheduled live demo for tomorrow.'
      },
      {
        id: 'demo-lead-2',
        name: 'Priya Verma',
        email: 'priya.verma@outlook.com',
        phone: '+918877665544',
        company: 'Verma Coaching Academy',
        service: 'AI CRM',
        source: 'facebook',
        status: 'nurturing',
        ai_score: 82,
        ai_budget: 1,
        ai_summary: 'Director of an IAS coaching centre. Interested in self-updating AI CRM to capture student enquirers from Meta ads.',
        notes: 'Requested case studies of similar setups in educational sector.'
      },
      {
        id: 'demo-lead-3',
        name: 'Rohan Gupta',
        email: null,
        phone: '+917766554433',
        company: 'Gupta Developers & Builders',
        service: 'Smart Follow-Up',
        source: 'google',
        status: 'new',
        ai_score: 65,
        ai_budget: 0,
        ai_summary: 'Real estate partner looking for automated follow-up sequences for prospective home buyers. Budget intent not yet fully qualified.',
        notes: 'Just captured. AI qualification sequence active.'
      }
    ];

    for (const lead of demoLeads) {
      await db.run(
        `INSERT INTO leads (id, name, email, phone, company, service, source, status, ai_score, ai_budget, ai_summary, notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          lead.id,
          lead.name,
          lead.email,
          lead.phone,
          lead.company,
          lead.service,
          lead.source,
          lead.status,
          lead.ai_score,
          lead.ai_budget,
          lead.ai_summary,
          lead.notes
        ]
      );
      
      // Seed a few initial chats for Aarav to make the history look realistic!
      if (lead.id === 'demo-lead-1') {
        await db.run(
          `INSERT INTO whatsapp_chats (id, lead_id, direction, body, status) VALUES (?, ?, ?, ?, ?)`,
          ['chat-1', lead.id, 'inbound', 'Hi Trinetra, I saw your WhatsApp automation demo. I want this for Sharma Medicos.', 'read']
        );
        await db.run(
          `INSERT INTO whatsapp_chats (id, lead_id, direction, body, status) VALUES (?, ?, ?, ?, ?)`,
          ['chat-2', lead.id, 'outbound', 'Hello Aarav! 🚀 Thanks for reaching out. We can easily automate your refill notifications. What is the average number of daily prescriptions you process?', 'sent']
        );
      }
    }
    console.log('✅ SQLite database seeded with 3 realistic demo leads & initial chat history.');
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
