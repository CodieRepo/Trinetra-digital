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
  
  console.log("=== DB SEARCH FOR MESSAGE A590D7087626AEC80BE87302BA4B16C7 ===");
  const msg = await db.get("SELECT * FROM whatsapp_chats WHERE id = ?", ['A590D7087626AEC80BE87302BA4B16C7']);
  console.log(msg);

  console.log("=== DB SEARCH FOR ANY MSG TO LID ===");
  const msgs = await db.all("SELECT * FROM whatsapp_chats WHERE lead_id LIKE '%lid%'");
  console.log(msgs);

  process.exit(0);
}
check();
`;

const commands = `
cat > /var/www/trinetra/query_msg_temp.js << 'EOF'
${remoteScript}
EOF
cd /var/www/trinetra
node query_msg_temp.js
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
