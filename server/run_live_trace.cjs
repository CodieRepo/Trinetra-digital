const { Client } = require('ssh2');

const sshConfig = {
  host: '187.127.170.222',
  port: 22,
  username: 'root',
  password: 'SatwikPal@123Shubham'
};

const commands = `
cat > /var/www/trinetra/server/trace_latest.cjs << 'EOF'
const { initDb, getDb } = require('./dist/database/connection.js');
const { execSync } = require('child_process');

async function trace() {
  process.env.DATABASE_PATH = '/var/www/trinetra/server/data/trinetra.db';
  await initDb();
  const db = getDb();

  console.log("=== 1-4. LATEST LEAD INFO ===");
  const lead = await db.get("SELECT * FROM leads ORDER BY created_at DESC LIMIT 1");
  if (!lead) {
    console.log("No leads found.");
    process.exit(0);
  }
  
  console.log(\`Lead ID: \${lead.id}\`);
  console.log(\`Name: \${lead.name}\`);
  console.log(\`Phone: \${lead.phone}\`);
  console.log(\`ai_enabled: \${lead.ai_enabled}\`);
  console.log(\`Lead Score: \${lead.ai_score}\`);

  console.log("\\n=== TIMELINE (Events, Scoring, AI) ===");
  const timeline = await db.all("SELECT event_type, description, timestamp FROM lead_timeline WHERE lead_id = ? ORDER BY timestamp ASC", [lead.id]);
  timeline.forEach(t => {
    console.log(\`[\${t.timestamp}] \${t.event_type}: \${t.description.substring(0, 150)}\`);
  });

  console.log("\\n=== WHATSAPP CHATS (Inbound & Outbound) ===");
  const chats = await db.all("SELECT id, direction, status, body, timestamp FROM whatsapp_chats WHERE lead_id = ? ORDER BY timestamp ASC", [lead.id]);
  chats.forEach(c => {
    console.log(\`[\${c.timestamp}] \${c.direction.toUpperCase()} (\${c.status}) [ID: \${c.id}]: \${c.body.substring(0, 50)}...\`);
  });

  console.log("\\n=== HANDOFF ALERTS ===");
  const alerts = await db.all("SELECT * FROM handoff_alerts WHERE lead_id = ?", [lead.id]);
  console.log(alerts);

  console.log("\\n=== OPENROUTER & QUEUE LOGS (from out.log) ===");
  try {
    const logs = execSync(\`grep -E "\${lead.phone.replace('+', '')}|\${lead.id}|OPENROUTER|AI_STARTUP|GATEWAY" /var/www/trinetra/server/logs/out.log /var/www/trinetra/server/logs/err.log | tail -n 50\`).toString();
    console.log(logs);
  } catch(e) {}

  process.exit(0);
}
trace();
EOF
cd /var/www/trinetra/server
node trace_latest.cjs
`;

const conn = new Client();
conn.on('ready', () => {
  conn.exec(commands, (err, stream) => {
    if (err) throw err;
    let output = '';
    stream.on('close', () => {
      conn.end();
      console.log(output);
    })
    .on('data', (data) => { output += data.toString(); })
    .stderr.on('data', (data) => process.stderr.write(data));
  });
}).connect(sshConfig);
