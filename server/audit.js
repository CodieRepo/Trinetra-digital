const { Client } = require('ssh2');

const sshConfig = {
  host: '187.127.170.222',
  port: 22,
  username: 'root',
  password: 'SatwikPal@123Shubham'
};

const commands = `
cd /var/www/trinetra/server

cat << 'EOF' > query_db.js
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');

async function run() {
  const db = await open({
    filename: path.join(__dirname, 'data/trinetra.db'),
    driver: sqlite3.Database
  });

  console.log("=== LATEST LEAD RECORD ===");
  const lead = await db.get("SELECT id, name, phone, ai_score, ai_enabled, lead_stage FROM leads ORDER BY created_at DESC LIMIT 1");
  console.log(lead);

  console.log("=== LATEST CONVERSATIONS ===");
  const conv = await db.get("SELECT id, lead_id, phone, unread_count, last_activity FROM conversations ORDER BY last_activity DESC LIMIT 1");
  console.log(conv);

  console.log("=== LATEST AUDIT LOGS ===");
  const logs = await db.all("SELECT action, details, timestamp FROM audit_logs ORDER BY timestamp DESC LIMIT 20");
  console.table(logs);
}
run().catch(console.error);
EOF

node query_db.js

echo "=== PM2 STATUS ==="
pm2 status trinetra-crm-backend

echo "=== WHATSAPP SESSION FOLDER ==="
ls -la data/wa-session | grep -v 'total' | head -n 10

echo "=== LATEST PM2 LOGS ==="
pm2 logs trinetra-crm-backend --lines 200 --nostream
`;

function runCommands(conn) {
  conn.exec(commands, (err, stream) => {
    if (err) {
      console.error('Exec error:', err);
      conn.end();
      return;
    }
    stream.on('close', (code, signal) => {
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}

function connectWithRetry(config) {
  const conn = new Client();
  conn.on('ready', () => {
    runCommands(conn);
  });
  conn.on('error', (err) => {
    console.error('SSH Connection Error:', err.message);
    conn.end();
  });
  conn.connect(config);
}

connectWithRetry(sshConfig);
