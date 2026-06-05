const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function runMigrations() {
  const db = await open({ filename: path.resolve('./data/trinetra.db'), driver: sqlite3.Database });
  
  await db.exec('PRAGMA journal_mode = WAL;');
  await db.exec('PRAGMA foreign_keys = ON;');

  await db.exec([
    'CREATE TABLE IF NOT EXISTS lead_timeline (',
    '  id TEXT PRIMARY KEY,',
    '  lead_id TEXT NOT NULL,',
    '  event_type TEXT NOT NULL,',
    '  description TEXT NOT NULL,',
    '  timestamp TEXT DEFAULT (CURRENT_TIMESTAMP),',
    '  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE',
    ');',
  ].join('\n'));

  await db.exec([
    'CREATE TABLE IF NOT EXISTS tasks (',
    '  id TEXT PRIMARY KEY,',
    '  lead_id TEXT NOT NULL,',
    '  title TEXT NOT NULL,',
    '  description TEXT,',
    '  status TEXT DEFAULT \'pending\',',
    '  type TEXT NOT NULL,',
    '  due_at TEXT,',
    '  created_at TEXT DEFAULT (CURRENT_TIMESTAMP),',
    '  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE',
    ');',
  ].join('\n'));

  await db.exec('CREATE INDEX IF NOT EXISTS idx_lead_timeline_lead ON lead_timeline(lead_id);');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_lead ON tasks(lead_id, status);');

  const migrations = [
    'ALTER TABLE leads ADD COLUMN ai_summary_detailed TEXT',
    'ALTER TABLE leads ADD COLUMN intent_level TEXT DEFAULT \'COLD\'',
    'ALTER TABLE leads ADD COLUMN recommended_action TEXT',
    'ALTER TABLE leads ADD COLUMN ai_enabled INTEGER DEFAULT 1',
    'ALTER TABLE leads ADD COLUMN city TEXT',
    'ALTER TABLE leads ADD COLUMN business_type TEXT',
    'ALTER TABLE leads ADD COLUMN budget_range TEXT',
    'ALTER TABLE leads ADD COLUMN urgency_level TEXT',
    'ALTER TABLE leads ADD COLUMN lead_tags TEXT DEFAULT \'[]\'',
    'ALTER TABLE leads ADD COLUMN recommended_package TEXT',
    'ALTER TABLE leads ADD COLUMN lead_stage TEXT DEFAULT \'greeting\'',
    'ALTER TABLE leads ADD COLUMN opt_out INTEGER DEFAULT 0',
    'ALTER TABLE leads ADD COLUMN appointment_requested INTEGER DEFAULT 0',
    'ALTER TABLE leads ADD COLUMN has_website INTEGER DEFAULT 0',
    'ALTER TABLE leads ADD COLUMN has_crm INTEGER DEFAULT 0',
    'ALTER TABLE leads ADD COLUMN team_size TEXT',
    'ALTER TABLE leads ADD COLUMN monthly_lead_volume TEXT',
    'ALTER TABLE leads ADD COLUMN current_problems TEXT',
    'ALTER TABLE leads ADD COLUMN is_decision_maker INTEGER DEFAULT 0',
    'ALTER TABLE leads ADD COLUMN business_name TEXT',
  ];
  
  for (const sql of migrations) {
    try { await db.exec(sql); } catch(e) { /* already exists */ }
  }
  
  console.log('=== MIGRATIONS APPLIED ===');
  const cols = await db.all('PRAGMA table_info(leads)');
  const names = cols.map(c => c.name);
  console.log('leads.ai_summary_detailed:', names.includes('ai_summary_detailed') ? 'OK' : 'MISSING');
  console.log('leads.intent_level:', names.includes('intent_level') ? 'OK' : 'MISSING');
  console.log('leads.recommended_action:', names.includes('recommended_action') ? 'OK' : 'MISSING');
  console.log('leads.budget_range:', names.includes('budget_range') ? 'OK' : 'MISSING');
  
  const tlCols = await db.all('PRAGMA table_info(lead_timeline)');
  console.log('lead_timeline:', tlCols.length > 0 ? 'OK (' + tlCols.length + ' cols)' : 'MISSING');
  
  const taskCols = await db.all('PRAGMA table_info(tasks)');
  console.log('tasks:', taskCols.length > 0 ? 'OK (' + taskCols.length + ' cols)' : 'MISSING');
  
  const leadCount = await db.get('SELECT COUNT(*) as c FROM leads');
  console.log('Current leads in DB:', leadCount.c);
  
  await db.close();
  console.log('Done.');
}
runMigrations().catch(e => console.error('Migration error:', e.message));
