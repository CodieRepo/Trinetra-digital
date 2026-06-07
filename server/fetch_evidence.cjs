const { Client } = require('ssh2');

const sshConfig = {
  host: '187.127.170.222',
  port: 22,
  username: 'root',
  password: 'SatwikPal@123Shubham'
};

const commands = `
cat > /var/www/trinetra/evidence_temp.js << 'EOF'
import fs from 'fs';
import { initDb, getDb } from './server/dist/database/connection.js';

async function check() {
  console.log("=== 1. API KEY EVIDENCE ===");
  try {
    const envFile = fs.readFileSync('/var/www/trinetra/.env', 'utf8');
    const keyMatch = envFile.match(/OPENROUTER_API_KEY=(.*)/);
    if (keyMatch && keyMatch[1]) {
      const k = keyMatch[1].trim();
      const masked = k.length > 10 ? k.substring(0,6) + '...' + k.substring(k.length-4) : 'TOO_SHORT';
      console.log(".env file key: " + masked + " (length: " + k.length + ")");
    } else {
      console.log(".env file key: NOT_FOUND");
    }
  } catch(e) { console.log(".env read error: " + e.message); }

  console.log("process.env.OPENROUTER_API_KEY: " + (process.env.OPENROUTER_API_KEY ? "EXISTS" : "MISSING"));

  await initDb();
  const db = getDb();
  
  console.log("=== 2 & 4. LEAD STATE EVIDENCE ===");
  // Fetch the latest 5 leads to find the one we need
  const leads = await db.all("SELECT id, name, phone, ai_enabled, ai_score, active_flow, booking_state, created_at FROM leads ORDER BY created_at DESC LIMIT 5");
  console.log("Recent Leads:");
  console.log(leads);

  console.log("=== 3. HUMAN TAKEOVER AUDIT EVIDENCE ===");
  const chats = await db.all("SELECT id, lead_id, direction, status, body, timestamp FROM whatsapp_chats ORDER BY timestamp DESC LIMIT 10");
  console.log("Recent Chats:");
  console.log(chats);

  const timeline = await db.all("SELECT event_type, description, timestamp FROM lead_timeline ORDER BY timestamp DESC LIMIT 10");
  console.log("Recent Timeline:");
  console.log(timeline);

  const handoffs = await db.all("SELECT * FROM handoff_alerts ORDER BY created_at DESC LIMIT 5");
  console.log("Recent Handoffs:");
  console.log(handoffs);

  process.exit(0);
}
check();
EOF
cd /var/www/trinetra
node evidence_temp.js > /var/www/trinetra/evidence_output.txt
cat /var/www/trinetra/evidence_output.txt
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
