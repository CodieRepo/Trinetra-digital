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
  
  console.log("=== LATEST 3 LEADS ===");
  const leads = await db.all("SELECT * FROM leads ORDER BY updated_at DESC LIMIT 3");
  console.log(leads);

  console.log("=== LATEST 5 CHATS ===");
  const chats = await db.all("SELECT * FROM whatsapp_chats ORDER BY timestamp DESC LIMIT 5");
  console.log(chats);

  console.log("=== LATEST 5 OUTBOUND QUEUE ===");
  const queue = await db.all("SELECT * FROM outbound_queue ORDER BY created_at DESC LIMIT 5");
  console.log(queue);
  
  process.exit(0);
}
check();
`;

const commands = `
cat > /var/www/trinetra/fetch_trace_temp.js << 'EOF'
${remoteScript}
EOF
cd /var/www/trinetra
node fetch_trace_temp.js
echo "=== PM2 LOGS FOR THE LAST 5 MINUTES ==="
pm2 logs trinetra-crm-backend --lines 200 --nostream
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
