const { Client } = require('ssh2');

const sshConfig = {
  host: '187.127.170.222',
  port: 22,
  username: 'root',
  password: 'SatwikPal@123Shubham'
};

const commands = `
cat > /var/www/trinetra/audit2_temp.js << 'EOF'
import { initDb, getDb } from './server/dist/database/connection.js';

async function check() {
  await initDb();
  const db = getDb();
  
  const leads = await db.all("SELECT * FROM leads ORDER BY created_at DESC LIMIT 10");
  console.log("=== RECENT LEADS ===");
  console.log(leads.map(l => ({ id: l.id, name: l.name, phone: l.phone, created: l.created_at, ai_summary: l.ai_summary })));

  const chats = await db.all("SELECT * FROM whatsapp_chats ORDER BY timestamp DESC LIMIT 10");
  console.log("=== RECENT CHATS ===");
  console.log(chats.map(c => ({ id: c.id, lead_id: c.lead_id, body: c.body.substring(0, 50), dir: c.direction, status: c.status, ts: c.timestamp })));

  process.exit(0);
}
check();
EOF
cd /var/www/trinetra
node audit2_temp.js > /var/www/trinetra/audit2_output.txt
cat /var/www/trinetra/audit2_output.txt
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
