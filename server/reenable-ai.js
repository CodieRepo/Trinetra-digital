const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/trinetra.db');

db.serialize(() => {
  db.run(
    "UPDATE leads SET ai_enabled = 1, ai_summary = NULL, status = 'new', updated_at = CURRENT_TIMESTAMP WHERE id = 'lead-1780362936667'",
    function(err) {
      if (err) {
        console.error('❌ Failed to re-enable AI:', err.message);
      } else {
        console.log('✅ AI re-enabled for canonical lead lead-1780362936667. Rows changed:', this.changes);
      }
    }
  );

  db.run(
    "DELETE FROM handoff_alerts WHERE lead_id = 'lead-1780362936667'",
    function(err) {
      if (err) {
        console.error('❌ Failed to delete handoff alerts:', err.message);
      } else {
        console.log('✅ Handoff alerts cleared. Rows changed:', this.changes);
      }
    }
  );
});

// Verify the result
setTimeout(() => {
  db.get("SELECT id, name, phone, ai_enabled, status, ai_summary FROM leads WHERE id = 'lead-1780362936667'", [], (err, row) => {
    if (err) {
      console.error('❌ Verification failed:', err.message);
    } else {
      console.log('\n📊 Canonical lead current state:');
      console.log(JSON.stringify(row, null, 2));
    }
    db.close();
  });
}, 200);
