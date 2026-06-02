const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/trinetra.db');

function normalizePhone(phone) {
  return phone.replace(/\D/g, '');
}

db.serialize(() => {
  console.log('🔄 Starting Lead Deduplication and Merge process...');

  // 1. Fetch all leads
  db.all('SELECT * FROM leads ORDER BY created_at ASC', [], async (err, leads) => {
    if (err) {
      console.error('❌ Failed to fetch leads:', err);
      db.close();
      return;
    }

    console.log(`ℹ️ Found total of ${leads.length} leads in database.`);

    // Group leads by normalized phone number
    const groups = {};
    leads.forEach(lead => {
      const cleanPhone = normalizePhone(lead.phone);
      if (!groups[cleanPhone]) {
        groups[cleanPhone] = [];
      }
      groups[cleanPhone].push(lead);
    });

    for (const [phone, group] of Object.entries(groups)) {
      if (group.length <= 1) continue;

      console.log(`\n👥 Duplicate group found for phone: +${phone} (${group.length} duplicates)`);
      
      // The oldest lead (first in chronological order) is our canonical lead
      const canonical = group[0];
      const duplicates = group.slice(1);

      console.log(`👑 Canonical Lead: ID: ${canonical.id}, Name: "${canonical.name}", Created: ${canonical.created_at}, ai_enabled: ${canonical.ai_enabled}`);

      // Collect merged updates from newer duplicates
      const updates = {
        email: canonical.email,
        company: canonical.company,
        service: canonical.service,
        source: canonical.source,
        notes: canonical.notes,
        ai_enabled: canonical.ai_enabled
      };

      // We want to preserve active state: if any duplicate has AI enabled, keep it enabled
      let mergedAiEnabled = canonical.ai_enabled;

      duplicates.forEach(dup => {
        console.log(`❌ Redundant Lead: ID: ${dup.id}, Name: "${dup.name}", Created: ${dup.created_at}, ai_enabled: ${dup.ai_enabled}`);
        
        if (!updates.email && dup.email) updates.email = dup.email;
        if (!updates.company && dup.company) updates.company = dup.company;
        if ((!updates.service || updates.service === 'WhatsApp Automation Intake') && dup.service) {
          updates.service = dup.service;
        }
        if (dup.notes) {
          updates.notes = updates.notes ? `${updates.notes}\n${dup.notes}` : dup.notes;
        }
        if (dup.ai_enabled === 1) {
          mergedAiEnabled = 1;
        }
      });

      updates.ai_enabled = mergedAiEnabled;

      // Update the canonical lead record
      db.run(
        `UPDATE leads SET 
          email = ?, 
          company = ?, 
          service = ?, 
          source = ?, 
          notes = ?, 
          ai_enabled = ?,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [updates.email, updates.company, updates.service, updates.source, updates.notes, updates.ai_enabled, canonical.id],
        function(err) {
          if (err) {
            console.error(`❌ Failed to update canonical lead ${canonical.id}:`, err);
            return;
          }
          console.log(`✅ Updated canonical lead details and merged properties.`);
        }
      );

      // Re-point associated tables
      for (const dup of duplicates) {
        // Move chats
        db.run(
          'UPDATE whatsapp_chats SET lead_id = ? WHERE lead_id = ?',
          [canonical.id, dup.id],
          function(err) {
            if (err) console.error(`❌ Failed to migrate chats for duplicate ${dup.id}:`, err);
            else if (this.changes > 0) console.log(`👉 Migrated ${this.changes} whatsapp chat messages to canonical ID.`);
          }
        );

        // Move followups
        db.run(
          'UPDATE followup_sequences SET lead_id = ? WHERE lead_id = ?',
          [canonical.id, dup.id],
          function(err) {
            if (err) console.error(`❌ Failed to migrate followups for duplicate ${dup.id}:`, err);
            else if (this.changes > 0) console.log(`👉 Migrated ${this.changes} follow-up sequence rows to canonical ID.`);
          }
        );

        // Move conversations
        db.run(
          'UPDATE conversations SET lead_id = ? WHERE lead_id = ?',
          [canonical.id, dup.id],
          function(err) {
            if (err) console.error(`❌ Failed to migrate conversation thread for duplicate ${dup.id}:`, err);
            else if (this.changes > 0) console.log(`👉 Migrated conversation thread to canonical ID.`);
          }
        );

        // Delete the duplicate lead record
        db.run(
          'DELETE FROM leads WHERE id = ?',
          [dup.id],
          function(err) {
            if (err) console.error(`❌ Failed to delete duplicate lead record ${dup.id}:`, err);
            else console.log(`🗑️ Successfully deleted duplicate lead record ${dup.id}.`);
          }
        );
      }
    }

    console.log('\n🌟 Deduplication and merge run finished checking all groups!');
  });
});
