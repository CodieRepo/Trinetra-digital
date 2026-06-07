const { Client } = require('ssh2');

const sshConfig = {
  host: '187.127.170.222',
  port: 22,
  username: 'root',
  password: 'SatwikPal@123Shubham'
};

const commands = `
cat > /var/www/trinetra/audit3_temp.js << 'EOF'
import { initDb, getDb } from './server/dist/database/connection.js';

async function check() {
  await initDb();
  const db = getDb();
  
  const leads = await db.all("SELECT id, name, phone, created_at FROM leads WHERE length(phone) > 13 OR phone LIKE '%lid%'");
  console.log("=== LEADS WITH LID ===");
  console.log(leads);

  const handoffs = await db.all("SELECT * FROM handoff_alerts ORDER BY created_at DESC LIMIT 5");
  console.log("=== HANDOFF ALERTS ===");
  console.log(handoffs);

  process.exit(0);
}
check();
EOF
cd /var/www/trinetra
node audit3_temp.js > /var/www/trinetra/audit3_output.txt
cat /var/www/trinetra/audit3_output.txt
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
