const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const { initDb, getDb } = require('./dist/database/connection');

async function testSafeguards() {
  console.log('🧪 RUNNING SAFEGUARDS INTEGRATION TESTS...');
  await initDb();

  // Import gateway modules
  const gateway = require('./dist/whatsapp/gateway');
  const { calculateHealthScore, listSessionBackups, getWhatsAppStatus } = gateway;

  // 1. Verify Health Scoring logic
  console.log('\n--- 1. Testing Health Score Calculation ---');
  
  // Test case 1: Healthy
  let score = calculateHealthScore('connected');
  console.log(`Score (connected): ${score} (Expected: 100)`);
  if (score !== 100) throw new Error('Health score failed for healthy state');

  // Test case 2: Offline states
  console.log(`Score (qr_required): ${calculateHealthScore('qr_required')} (Expected: 0)`);
  console.log(`Score (logged_out): ${calculateHealthScore('logged_out')} (Expected: 0)`);
  console.log(`Score (auth_failed): ${calculateHealthScore('auth_failed')} (Expected: 0)`);
  console.log(`Score (disconnected): ${calculateHealthScore('disconnected')} (Expected: 0)`);
  console.log(`Score (intervention_required): ${calculateHealthScore('intervention_required')} (Expected: 10)`);

  // 2. Verify backups directory listing
  console.log('\n--- 2. Testing Session Backup List ---');
  const backups = listSessionBackups();
  console.log(`Existing Backups Count: ${backups.length}`);
  console.log('Available backups list:', backups);

  // 3. Verify getWhatsAppStatus properties
  console.log('\n--- 3. Testing getWhatsAppStatus payload ---');
  const status = getWhatsAppStatus();
  console.log('WhatsApp status properties:', Object.keys(status));
  console.log('Current Health Score:', status.healthScore);
  if (status.healthScore === undefined) throw new Error('healthScore is missing from status payload');

  console.log('\n✅ SAFEGUARDS TEST SCRIPT RUN SUCCESSFULLY!');
  process.exit(0);
}

testSafeguards().catch(err => {
  console.error('❌ Safeguards test failed:', err);
  process.exit(1);
});
