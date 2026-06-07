const { Client } = require('ssh2');

const sshConfig = {
  host: '187.127.170.222',
  port: 22,
  username: 'root',
  password: 'SatwikPal@123Shubham'
};

const commands = `
cat > /var/www/trinetra/server/trace_latest2.cjs << 'EOF'
const { initDb, getDb } = require('./dist/database/connection.js');
const { execSync } = require('child_process');
const fs = require('fs');

async function trace() {
  process.env.DATABASE_PATH = '/var/www/trinetra/server/data/trinetra.db';
  await initDb();
  const db = getDb();

  const lead = await db.get("SELECT * FROM leads ORDER BY created_at DESC LIMIT 1");
  if (!lead) process.exit(0);
  
  const timeline = await db.all("SELECT event_type, description, timestamp FROM lead_timeline WHERE lead_id = ? ORDER BY timestamp ASC", [lead.id]);
  const chats = await db.all("SELECT id, direction, status, body, timestamp FROM whatsapp_chats WHERE lead_id = ? ORDER BY timestamp ASC", [lead.id]);
  const alerts = await db.all("SELECT * FROM handoff_alerts WHERE lead_id = ?", [lead.id]);
  
  let logs = "";
  try {
    logs = execSync(\`grep -E "\${lead.phone.replace('+', '')}|\${lead.id}|OPENROUTER" /var/www/trinetra/server/logs/out.log /var/www/trinetra/server/logs/err.log | tail -n 30\`).toString();
  } catch(e) {}

  const result = {
    lead,
    timeline,
    chats,
    alerts,
    logs: logs.split('\\n')
  };

  fs.writeFileSync('/var/www/trinetra/server/trace_result.json', JSON.stringify(result, null, 2));
  process.exit(0);
}
trace();
EOF
cd /var/www/trinetra/server
node trace_latest2.cjs
cat trace_result.json
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
