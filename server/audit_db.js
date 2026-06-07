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
const Database = require('better-sqlite3');
const db = new Database('./data/trinetra.db');

console.log("=== LEADS COUNT ===");
const leadsCount = db.prepare("SELECT count(*) as c FROM leads").get();
console.log(leadsCount);

console.log("=== RECENT LEADS ===");
const leads = db.prepare("SELECT id, name, phone, status, ai_score FROM leads ORDER BY created_at DESC LIMIT 5").all();
console.log(leads);

console.log("=== NOTIFICATIONS IN DB ===");
// Just an example, check tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log(tables);
EOF
node query_db.js
`;

const conn = new Client();
conn.on('ready', () => {
  conn.exec(commands, (err, stream) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    stream.on('close', () => conn.end())
          .on('data', (data) => process.stdout.write(data))
          .stderr.on('data', (data) => process.stderr.write(data));
  });
}).connect(sshConfig);
