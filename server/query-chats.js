const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/trinetra.db');

console.log('--- CHATS FOR SATWIK ---');
db.all("SELECT * FROM whatsapp_chats WHERE lead_id IN (SELECT id FROM leads WHERE name = 'Satwik') ORDER BY timestamp ASC", [], (err, rows) => {
  if (err) {
    console.error('Error querying chats:', err);
  } else {
    console.log(JSON.stringify(rows, null, 2));
  }
  
  console.log('\n--- LEAD INFO FOR SATWIK ---');
  db.all("SELECT * FROM leads WHERE name = 'Satwik'", [], (err2, rows2) => {
    if (err2) {
      console.error('Error querying leads:', err2);
    } else {
      console.log(JSON.stringify(rows2, null, 2));
    }
    db.close();
  });
});
