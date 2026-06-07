const { Client } = require('ssh2');

const sshConfig = {
  host: '187.127.170.222',
  port: 22,
  username: 'root',
  password: 'SatwikPal@123Shubham'
};

const commands = `
cat > /var/www/trinetra/server/lid_migration.cjs << 'EOF'
const { initDb, getDb } = require('./dist/database/connection.js');
const fs = require('fs');

async function migrate() {
  process.env.DATABASE_PATH = '/var/www/trinetra/server/data/trinetra.db';
  await initDb();
  const db = getDb();
  
  const backupPath = '/var/www/trinetra/server/data/trinetra_backup_' + Date.now() + '.db';
  await db.run(\`VACUUM INTO '\${backupPath}'\`);
  const stats = fs.statSync(backupPath);
  console.log("=== BACKUP SUCCESSFUL ===");
  console.log("Backup Path: " + backupPath);
  console.log("Backup Size: " + (stats.size / 1024).toFixed(2) + " KB\\n");

  const allLeads = await db.all("SELECT id, phone, name FROM leads");
  const lidLeads = allLeads.filter(l => l.phone.startsWith('+') && l.phone.length === 16);
  
  console.log("=== AUDIT PHASE ===");
  const migrationPlan = [];

  for (const lead of lidLeads) {
    let resolvedPhone = null;
    let confidence = 'NONE';
    
    // Check if another lead has the same name but a real phone number
    const sameName = allLeads.filter(l => l.name === lead.name && l.id !== lead.id && !(l.phone.startsWith('+') && l.phone.length === 16));
    if (sameName.length === 1) {
      resolvedPhone = sameName[0].phone;
      confidence = 'HIGH (Exact Name Match in Leads)';
    }

    migrationPlan.push({
      leadId: lead.id,
      name: lead.name,
      currentPhone: lead.phone,
      resolvedPhone,
      confidence
    });
    console.log(\`Lead: \${lead.name} | LID: \${lead.phone} | Resolved: \${resolvedPhone || 'Unknown'} | Source: \${confidence}\`);
  }

  console.log("\\n=== MIGRATION PHASE ===");
  let migrated = 0;
  let skipped = 0;

  for (const plan of migrationPlan) {
    if (plan.resolvedPhone && plan.confidence.startsWith('HIGH')) {
      // Execute migration
      await db.run('UPDATE leads SET phone = ? WHERE id = ?', [plan.resolvedPhone, plan.leadId]);
      await db.run('UPDATE conversations SET phone = ? WHERE lead_id = ?', [plan.resolvedPhone, plan.leadId]);
      // Update whatsapp_chats if any (though usually they just store lead_id)
      migrated++;
      console.log(\`[MIGRATED] \${plan.name} -> \${plan.resolvedPhone}\`);
    } else {
      skipped++;
      console.log(\`[SKIPPED] \${plan.name} (Insufficient confidence or no phone)\`);
    }
  }

  console.log("\\n=== MIGRATION REPORT ===");
  console.log("Migrated Leads: " + migrated);
  console.log("Skipped Leads: " + skipped);
  
  const finalLeads = await db.all("SELECT id, phone FROM leads");
  const finalLids = finalLeads.filter(l => l.phone.startsWith('+') && l.phone.length === 16);
  console.log("Final Unresolved Leads: " + finalLids.length);
  console.log("Final Resolution Failure Rate: " + ((finalLids.length / finalLeads.length) * 100).toFixed(2) + "%");

  process.exit(0);
}
migrate();
EOF
cd /var/www/trinetra/server
node lid_migration.cjs
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
