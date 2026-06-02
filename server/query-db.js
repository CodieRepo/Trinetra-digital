const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/trinetra.db');

console.log('--- ALL LEADS ---');
db.all("SELECT * FROM leads", [], (err, rows) => {
  if (err) {
    console.error('Error querying leads:', err);
  } else {
    console.log(JSON.stringify(rows, null, 2));
  }
  
  console.log('\n--- ALL WHATSAPP CHATS ---');
  db.all("SELECT * FROM whatsapp_chats", [], (err2, rows2) => {
    if (err2) {
      console.error('Error querying chats:', err2);
    } else {
      console.log(JSON.stringify(rows2, null, 2));
    }
    
    console.log('\n--- RECENT AUDIT LOGS ---');
    db.all("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 10", [], (err3, rows3) => {
      if (err3) {
        console.error('Error querying audits:', err3);
      } else {
        console.log(JSON.stringify(rows3, null, 2));
      }
      db.close();
    });
  });
});
