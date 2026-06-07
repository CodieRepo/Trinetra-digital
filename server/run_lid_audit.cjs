const { Client } = require('ssh2');

const sshConfig = {
  host: '187.127.170.222',
  port: 22,
  username: 'root',
  password: 'SatwikPal@123Shubham'
};

const commands = `
cat > /var/www/trinetra/server/audit_lid.cjs << 'EOF'
const { initDb, getDb } = require('./dist/database/connection.js');

async function audit() {
  await initDb();
  const db = getDb();
  
  const allLeads = await db.all("SELECT id, phone, name, ai_enabled FROM leads");
  const lidLeads = allLeads.filter(l => l.phone.startsWith('+') && l.phone.length === 16);
  const normalLeads = allLeads.filter(l => !(l.phone.startsWith('+') && l.phone.length === 16));

  console.log("=== LID RESOLUTION AUDIT ===");
  console.log("Total Leads: " + allLeads.length);
  console.log("LID Proxies Remaining: " + lidLeads.length);
  console.log("Normal Phones: " + normalLeads.length);
  console.log("Resolution Failure Rate: " + ((lidLeads.length / allLeads.length) * 100).toFixed(2) + "%\\n");

  for (const lead of lidLeads) {
    console.log("LID Lead: " + lead.id + " (" + lead.phone + ") - " + lead.name);
    // Check timeline for resolution attempts
    const timeline = await db.all("SELECT * FROM lead_timeline WHERE lead_id = ? ORDER BY timestamp DESC", [lead.id]);
    const lidTraces = timeline.filter(t => t.description.includes('LID') || t.description.includes('sync'));
    if (lidTraces.length > 0) {
      console.log("  Timeline traces: " + JSON.stringify(lidTraces));
    } else {
      console.log("  Timeline: No LID resolution traces found in timeline.");
    }
    
    // Any conversations?
    const conv = await db.get("SELECT id, phone FROM conversations WHERE lead_id = ?", [lead.id]);
    console.log("  Conversation Phone: " + (conv ? conv.phone : 'N/A'));
  }
  
  // Look at recent pm2 logs for LID SYNC
  console.log("\\n=== PM2 LOGS FOR LID ===");
  const { execSync } = require('child_process');
  try {
    const logs = execSync('grep "LID" /var/www/trinetra/server/logs/out.log /var/www/trinetra/server/logs/err.log | tail -n 20').toString();
    console.log(logs);
  } catch(e) { console.log("No LID logs found."); }

  process.exit(0);
}
audit();
EOF
node /var/www/trinetra/server/audit_lid.cjs
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
