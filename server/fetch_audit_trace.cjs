const { Client } = require('ssh2');

const sshConfig = {
  host: '187.127.170.222',
  port: 22,
  username: 'root',
  password: 'SatwikPal@123Shubham'
};

const remoteScript = `
import { initDb, getDb } from './server/dist/database/connection.js';

async function check() {
  await initDb();
  const db = getDb();
  
  console.log("=== LATEST LEAD ===");
  const leads = await db.all("SELECT * FROM leads ORDER BY created_at DESC LIMIT 3");
  console.log(leads);

  if (leads.length > 0) {
    const lead = leads.find(l => l.phone.includes('1170') || l.phone.includes('lid') || l.phone.length > 13);
    const targetLeadId = lead ? lead.id : leads[0].id;
    console.log("=== TARGET LEAD ID: " + targetLeadId + " ===");

    const chats = await db.all("SELECT * FROM whatsapp_chats WHERE lead_id = ? ORDER BY timestamp ASC", [targetLeadId]);
    console.log("=== CONVERSATION THREAD ===");
    console.log(chats);
    
    const timeline = await db.all("SELECT * FROM lead_timeline WHERE lead_id = ? ORDER BY timestamp ASC", [targetLeadId]);
    console.log("=== TIMELINE EVENTS ===");
    console.log(timeline);
  }

  process.exit(0);
}
check();
`;

const commands = `
cat > /var/www/trinetra/audit_temp.js << 'EOF'
${remoteScript}
EOF
cd /var/www/trinetra
node audit_temp.js > /var/www/trinetra/audit_output.txt
cat /var/www/trinetra/audit_output.txt
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
