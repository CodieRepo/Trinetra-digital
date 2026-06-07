const { Client } = require('ssh2');

const sshConfig = {
  host: '187.127.170.222',
  port: 22,
  username: 'root',
  password: 'SatwikPal@123Shubham'
};

const commands = `
cat > /var/www/trinetra/server/audit_extraction.cjs << 'EOF'
const { initDb, getDb } = require('./dist/database/connection.js');
const fs = require('fs');

async function audit() {
  process.env.DATABASE_PATH = '/var/www/trinetra/server/data/trinetra.db';
  await initDb();
  const db = getDb();

  const leads = await db.all("SELECT * FROM leads ORDER BY created_at DESC LIMIT 10");
  
  for (const lead of leads) {
     const chats = await db.all("SELECT direction, body, timestamp FROM whatsapp_chats WHERE lead_id = ? ORDER BY timestamp ASC", [lead.id]);
     lead.chats = chats;
  }
  
  fs.writeFileSync('/var/www/trinetra/server/audit_extraction_result.json', JSON.stringify(leads, null, 2));
  process.exit(0);
}
audit();
EOF
cd /var/www/trinetra/server
node audit_extraction.cjs
cat audit_extraction_result.json
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
