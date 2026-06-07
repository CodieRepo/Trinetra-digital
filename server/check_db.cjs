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
  
  console.log("=== LATEST 5 LEADS ===");
  const leads = await db.all("SELECT id, name, phone, created_at, updated_at FROM leads ORDER BY updated_at DESC LIMIT 5");
  console.log(leads);

  console.log("=== LATEST 10 CHATS ===");
  const chats = await db.all("SELECT id, lead_id, direction, body, status, timestamp FROM whatsapp_chats ORDER BY timestamp DESC LIMIT 10");
  console.log(chats);
  
  process.exit(0);
}
check();
`;

const commands = `
cat > /var/www/trinetra/check_db_temp.js << 'EOF'
${remoteScript}
EOF
cd /var/www/trinetra
node check_db_temp.js
`;

const conn = new Client();
conn.on('ready', () => {
  conn.exec(commands, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
          .on('data', (data) => process.stdout.write(data))
          .stderr.on('data', (data) => process.stderr.write(data));
  });
}).connect(sshConfig);
