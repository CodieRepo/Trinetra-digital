const { Client } = require('ssh2');

const sshConfig = {
  host: '187.127.170.222',
  port: 22,
  username: 'root',
  password: 'SatwikPal@123Shubham'
};

const commands = `
cat > /var/www/trinetra/server/audit_qualification.cjs << 'EOF'
const { initDb, getDb } = require('./dist/database/connection.js');
const fs = require('fs');

async function audit() {
  process.env.DATABASE_PATH = '/var/www/trinetra/server/data/trinetra.db';
  await initDb();
  const db = getDb();

  const lead = await db.get("SELECT * FROM leads WHERE id = 'lead-1780813331881'");
  if (!lead) process.exit(0);
  
  const chats = await db.all("SELECT id, direction, status, body, timestamp FROM whatsapp_chats WHERE lead_id = ? ORDER BY timestamp ASC", [lead.id]);
  
  const timeline = await db.all("SELECT event_type, description, timestamp FROM lead_timeline WHERE lead_id = ? ORDER BY timestamp ASC", [lead.id]);

  let logs = "";
  try {
    const execSync = require('child_process').execSync;
    logs = execSync(\`grep -B 5 -A 10 -E "score|intent|qualification|reasoning|extracted" /var/www/trinetra/server/logs/out.log | tail -n 50\`).toString();
  } catch(e) {}

  const result = {
    lead,
    chats,
    timeline,
    logs: logs.split('\\n')
  };

  fs.writeFileSync('/var/www/trinetra/server/audit_qual_result.json', JSON.stringify(result, null, 2));
  process.exit(0);
}
audit();
EOF
cd /var/www/trinetra/server
node audit_qualification.cjs
cat audit_qual_result.json
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
