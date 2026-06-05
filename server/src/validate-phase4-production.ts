/**
 * Trinetra OS — Phase 4A Production Validation Script
 * Tests: quotation lifecycle, versioning, expiry handling, auto-tasks on acceptance,
 *        appointment workflow, and conversion pipeline.
 * 
 * Run: node dist/validate-phase4-production.js
 */

import { initDb } from './database/connection';
import { QuotationService } from './services/quotation.service';
import { TaskModel } from './models/tasks.model';
import { logTimelineEvent } from './services/timeline.service';
import { getDb } from './database/connection';
import path from 'path';
import fs from 'fs';

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m',
};

let passed = 0;
let failed = 0;
const results: { name: string; pass: boolean; detail: string }[] = [];

function log(msg: string, color = COLORS.reset) {
  console.log(`${color}${msg}${COLORS.reset}`);
}

function assert(name: string, condition: boolean, detail: string) {
  if (condition) {
    passed++;
    results.push({ name, pass: true, detail });
    log(`  ✅ ${name}`, COLORS.green);
  } else {
    failed++;
    results.push({ name, pass: false, detail });
    log(`  ❌ FAILED: ${name} — ${detail}`, COLORS.red);
  }
}

async function cleanup(db: any, leadId: string) {
  await db.run('DELETE FROM lead_timeline WHERE lead_id = ?', [leadId]);
  await db.run('DELETE FROM tasks WHERE lead_id = ?', [leadId]);
  await db.run('DELETE FROM quotations WHERE lead_id = ?', [leadId]);
  await db.run('DELETE FROM appointments WHERE lead_id = ?', [leadId]);
  await db.run('DELETE FROM leads WHERE id = ?', [leadId]);
}

async function run() {
  log('\n🧪 Trinetra OS — Phase 4A Production Validation\n', COLORS.bold + COLORS.cyan);
  log('═'.repeat(60), COLORS.cyan);

  const db = await initDb();

  // ─── Setup ─────────────────────────────────────────────────────────────────
  const leadId = 'validate-prod-phase4-' + Date.now();
  const leadName = 'Phase4 Production Tester';

  // Clean up any stale test data
  await cleanup(db, leadId);

  await db.run(
    `INSERT INTO leads (id, name, phone, lead_stage, intent_level, ai_enabled) VALUES (?, ?, ?, ?, ?, ?)`,
    [leadId, leadName, '9999000001', 'qualified', 'HOT', 1]
  );
  log(`\n🎯 Test lead initialized: "${leadName}" (${leadId})\n`, COLORS.cyan);

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST BLOCK 1: Basic Quotation Generation & PDF
  // ═══════════════════════════════════════════════════════════════════════════

  log('📋 TEST BLOCK 1: Quotation Generation & PDF', COLORS.magenta);

  const q1 = await QuotationService.generateQuote(leadId, 'growth_engine', undefined, 10, 'Production validation test');
  assert('Q1: Quote generated', !!q1 && !!q1.id, `Got ID: ${q1?.id}`);
  assert('Q1: Package is Growth Engine', q1.package_name === 'Growth Engine', `Got: ${q1.package_name}`);
  assert('Q1: Setup cost correct (₹29999 × 90%)', q1.total_setup === 26999, `Got: ₹${q1.total_setup}`);
  assert('Q1: Monthly cost correct (₹5999 × 90%)', q1.total_monthly === 5399, `Got: ₹${q1.total_monthly}`);
  assert('Q1: Status is draft', q1.status === 'draft', `Got: ${q1.status}`);
  assert('Q1: Version is 1', q1.version === 1, `Got: v${q1.version}`);
  assert('Q1: No parent', !q1.parent_quotation_id, `parent: ${q1.parent_quotation_id}`);

  // Check PDF generated
  const pdfAbs = path.resolve(process.cwd(), q1.pdf_path || '');
  assert('Q1: PDF file exists on disk', fs.existsSync(pdfAbs), `Path: ${pdfAbs}`);
  const pdfSize = fs.existsSync(pdfAbs) ? fs.statSync(pdfAbs).size : 0;
  assert('Q1: PDF has reasonable size (>1KB)', pdfSize > 1024, `Size: ${pdfSize} bytes`);

  // Check expiry info
  const expiryInfo = QuotationService.computeExpiryInfo(q1);
  assert('Q1: Expiry computed', !!expiryInfo.expiresAt, `expiresAt: ${expiryInfo.expiresAt}`);
  assert('Q1: Days remaining = 7', expiryInfo.daysRemaining === 7, `Got: ${expiryInfo.daysRemaining} days`);
  assert('Q1: Not expired yet', !expiryInfo.isExpired, 'Should not be expired');

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST BLOCK 2: Quotation Versioning (v1 → v2 → v3)
  // ═══════════════════════════════════════════════════════════════════════════

  log('\n📋 TEST BLOCK 2: Quotation Versioning', COLORS.magenta);

  const q2 = await QuotationService.createRevision(q1.id, 15, undefined, 'Revised — 15% discount applied');
  assert('Q2: Revision created', !!q2 && !!q2.id, `Got ID: ${q2?.id}`);
  assert('Q2: Version is 2', q2.version === 2, `Got: v${q2.version}`);
  assert('Q2: Parent is Q1', q2.parent_quotation_id === q1.id, `parent: ${q2.parent_quotation_id}`);
  assert('Q2: Discount is 15%', q2.discount_pct === 15, `Got: ${q2.discount_pct}%`);
  assert('Q2: Setup reflects 15% off', q2.total_setup === Math.round(29999 * 0.85), `Got: ₹${q2.total_setup}`);
  assert('Q2: Same package', q2.package_tier === 'growth_engine', `Got: ${q2.package_tier}`);

  const q3 = await QuotationService.createRevision(q2.id, 20, undefined, 'Final offer — 20% discount');
  assert('Q3: v3 revision created', !!q3 && !!q3.id, `Got ID: ${q3?.id}`);
  assert('Q3: Version is 3', q3.version === 3, `Got: v${q3.version}`);
  assert('Q3: Parent is Q2', q3.parent_quotation_id === q2.id, `parent: ${q3.parent_quotation_id}`);

  // Version chain
  const chain = await QuotationService.findVersionChain(q3.id);
  assert('Version chain: 3 versions found', chain.length === 3, `Got: ${chain.length} versions`);
  assert('Version chain: versions ordered 1,2,3', chain.map(c => c.version).join(',') === '1,2,3', `Got: ${chain.map(c=>c.version).join(',')}`);
  assert('Version chain: root is Q1', chain[0].id === q1.id, `Root: ${chain[0].id}`);
  assert('Version chain: latest is Q3', chain[2].id === q3.id, `Latest: ${chain[2].id}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST BLOCK 3: Status Transitions
  // ═══════════════════════════════════════════════════════════════════════════

  log('\n📋 TEST BLOCK 3: Status Transitions (DRAFT→VIEWED→ACCEPTED)', COLORS.magenta);

  // Simulate lead viewing the quotation (latest version q3)
  await QuotationService.markViewed(q3.id);
  const viewed = await QuotationService.findById(q3.id);
  assert('STATUS: draft→viewed transition', viewed?.status === 'viewed', `Status: ${viewed?.status}`);
  assert('STATUS: viewed_at recorded', !!viewed?.viewed_at, `viewed_at: ${viewed?.viewed_at}`);

  // Accept the quotation
  await QuotationService.markAccepted(q3.id);
  const accepted = await QuotationService.findById(q3.id);
  assert('STATUS: viewed→accepted transition', accepted?.status === 'accepted', `Status: ${accepted?.status}`);
  assert('STATUS: accepted_at recorded', !!accepted?.accepted_at, `accepted_at: ${accepted?.accepted_at}`);

  // Lead stage should move to won
  const wonLead = await db.get<{ lead_stage: string }>('SELECT lead_stage FROM leads WHERE id = ?', [leadId]);
  assert('STATUS: Lead stage → WON', wonLead?.lead_stage === 'won', `Stage: ${wonLead?.lead_stage}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST BLOCK 4: Auto-Task Creation on Acceptance (3 tasks)
  // ═══════════════════════════════════════════════════════════════════════════

  log('\n📋 TEST BLOCK 4: Auto-Task Creation on Acceptance', COLORS.magenta);

  const tasks = await TaskModel.findByLead(leadId);
  assert('TASKS: 3 tasks auto-created', tasks.length === 3, `Got: ${tasks.length} tasks`);

  const onboardingTask = tasks.find(t => t.title.includes('Welcome Pack'));
  const kickoffTask = tasks.find(t => t.title.includes('Kickoff Call'));
  const requirementsTask = tasks.find(t => t.title.includes('Requirements'));

  assert('TASKS: Onboarding/Welcome task exists', !!onboardingTask, `Tasks: ${tasks.map(t=>t.title).join(', ')}`);
  assert('TASKS: Kickoff task exists', !!kickoffTask, `Tasks: ${tasks.map(t=>t.title).join(', ')}`);
  assert('TASKS: Requirements task exists', !!requirementsTask, `Tasks: ${tasks.map(t=>t.title).join(', ')}`);

  if (onboardingTask) {
    assert('TASKS: Onboarding due in 24h', !!onboardingTask.due_at, `due_at: ${onboardingTask.due_at}`);
    assert('TASKS: Onboarding is pending', onboardingTask.status === 'pending', `status: ${onboardingTask.status}`);
  }
  if (kickoffTask) {
    assert('TASKS: Kickoff type is APPOINTMENT_TASK', kickoffTask.type === 'APPOINTMENT_TASK', `type: ${kickoffTask.type}`);
  }
  if (requirementsTask) {
    assert('TASKS: Requirements type is QUOTATION_TASK', requirementsTask.type === 'QUOTATION_TASK', `type: ${requirementsTask.type}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST BLOCK 5: Quotation Expiry Handling
  // ═══════════════════════════════════════════════════════════════════════════

  log('\n📋 TEST BLOCK 5: Expiry Handling', COLORS.magenta);

  // Create a quotation with validity_days = 0 (already expired)
  const expiredLeadId = 'validate-expiry-lead-' + Date.now();
  await cleanup(db, expiredLeadId);
  await db.run(
    `INSERT INTO leads (id, name, phone, lead_stage, intent_level, ai_enabled) VALUES (?, ?, ?, ?, ?, ?)`,
    [expiredLeadId, 'Expiry Test Lead', '9999000002', 'qualified', 'WARM', 1]
  );

  const qExpiry = await QuotationService.generateQuote(expiredLeadId, 'starter_presence', undefined, 0);

  // Manually backdated: set created_at to 10 days ago so it's expired
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
  await db.run(`UPDATE quotations SET created_at = ?, status = 'sent' WHERE id = ?`, [tenDaysAgo, qExpiry.id]);

  // Force-refresh the object
  const expiredQ = await QuotationService.findById(qExpiry.id);
  const expiredInfo = QuotationService.computeExpiryInfo(expiredQ!);
  assert('EXPIRY: computeExpiryInfo detects expired', expiredInfo.isExpired, `isExpired: ${expiredInfo.isExpired}`);
  assert('EXPIRY: daysRemaining = 0', expiredInfo.daysRemaining === 0, `Got: ${expiredInfo.daysRemaining} days`);

  // Run the expiry sweep
  await QuotationService.processExpiry();

  const afterSweep = await QuotationService.findById(qExpiry.id);
  assert('EXPIRY: processExpiry marks status=expired', afterSweep?.status === 'expired', `Status: ${afterSweep?.status}`);
  assert('EXPIRY: expired_at recorded', !!afterSweep?.expired_at, `expired_at: ${afterSweep?.expired_at}`);

  // ─── Pre-expiry task (3 days remaining) ───
  const nearExpiryLeadId = 'validate-nearexpiry-lead-' + Date.now();
  await cleanup(db, nearExpiryLeadId);
  await db.run(
    `INSERT INTO leads (id, name, phone, lead_stage, intent_level, ai_enabled) VALUES (?, ?, ?, ?, ?, ?)`,
    [nearExpiryLeadId, 'Near Expiry Lead', '9999000003', 'qualified', 'HOT', 1]
  );
  const qNear = await QuotationService.generateQuote(nearExpiryLeadId, 'sales_system', undefined, 0);

  // Backdate so created 5 days ago → 2 days remaining from 7-day validity
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
  await db.run(`UPDATE quotations SET created_at = ?, status = 'sent', expiry_task_created = 0 WHERE id = ?`, [fiveDaysAgo, qNear.id]);

  // Run expiry sweep
  await QuotationService.processExpiry();

  const nearTasks = await TaskModel.findByLead(nearExpiryLeadId);
  const expiryTask = nearTasks.find(t => t.title.includes('Expiring'));
  assert('EXPIRY: Pre-expiry task created when ≤3 days remain', !!expiryTask, `Tasks: ${nearTasks.map(t=>t.title).join(', ')}`);

  const nearQ = await QuotationService.findById(qNear.id);
  assert('EXPIRY: expiry_task_created = 1 after sweep', nearQ?.expiry_task_created === 1, `Got: ${nearQ?.expiry_task_created}`);
  assert('EXPIRY: Quote still not expired (2 days remain)', nearQ?.status !== 'expired', `Status: ${nearQ?.status}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST BLOCK 6: Timeline Logging Validation
  // ═══════════════════════════════════════════════════════════════════════════

  log('\n📋 TEST BLOCK 6: Timeline Logging', COLORS.magenta);

  const timeline = await db.all<{ event_type: string; description: string }[]>(
    'SELECT event_type, description FROM lead_timeline WHERE lead_id = ? ORDER BY timestamp ASC',
    [leadId]
  );

  const hasQuoteGenerated = timeline.some(e => e.description.includes('Generated quotation'));
  const hasRevision = timeline.some(e => e.description.includes('v2') || e.description.includes('v3'));
  const hasViewed = timeline.some(e => e.description.includes('viewed'));
  const hasAccepted = timeline.some(e => e.description.includes('ACCEPTED'));

  assert('TIMELINE: Quote generation logged', hasQuoteGenerated, `Events: ${timeline.length}`);
  assert('TIMELINE: Revision logged', hasRevision, `Events: ${timeline.length}`);
  assert('TIMELINE: Viewed event logged', hasViewed, `Events: ${timeline.length}`);
  assert('TIMELINE: Accepted event logged', hasAccepted, `Events: ${timeline.length}`);

  log(`\n  Timeline events for main test lead: ${timeline.length}`, COLORS.yellow);
  timeline.forEach(e => log(`    [${e.event_type}] ${e.description.substring(0, 80)}`, COLORS.yellow));

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST BLOCK 7: Appointment Slot & Booking
  // ═══════════════════════════════════════════════════════════════════════════

  log('\n📋 TEST BLOCK 7: Appointment Workflow', COLORS.magenta);

  const slotId = 'slot-test-' + Date.now();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const slotDate = tomorrow.toISOString().split('T')[0];

  await db.run(
    `INSERT INTO appointment_slots (id, slot_date, slot_time, duration_mins, is_available) VALUES (?, ?, ?, ?, ?)`,
    [slotId, slotDate, '10:00', 30, 1]
  );

  const slot = await db.get<{ id: string; is_available: number }>('SELECT * FROM appointment_slots WHERE id = ?', [slotId]);
  assert('APPT: Slot created successfully', !!slot, `Slot ID: ${slotId}`);
  assert('APPT: Slot is available', slot?.is_available === 1, `is_available: ${slot?.is_available}`);

  // Book the slot
  const apptId = 'appt-test-' + Date.now();
  await db.run(
    `INSERT INTO appointments (id, lead_id, preferred_date, preferred_time, call_type, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [apptId, leadId, slotDate, '10:00', 'video', 'pending', 'Production validation appointment']
  );
  await db.run('UPDATE appointment_slots SET is_available = 0, booked_by_lead_id = ? WHERE id = ?', [leadId, slotId]);

  const appt = await db.get<{ id: string; status: string }>('SELECT * FROM appointments WHERE id = ?', [apptId]);
  assert('APPT: Appointment booked', !!appt, `Appt ID: ${apptId}`);
  assert('APPT: Status is pending', appt?.status === 'pending', `Status: ${appt?.status}`);

  // Confirm appointment
  const meetLink = 'https://meet.google.com/test-prod-val';
  await db.run(
    `UPDATE appointments SET status = 'confirmed', confirmed_at = CURRENT_TIMESTAMP, meeting_link = ? WHERE id = ?`,
    [meetLink, apptId]
  );
  const confirmed = await db.get<{ status: string; meeting_link: string; confirmed_at: string }>(
    'SELECT status, meeting_link, confirmed_at FROM appointments WHERE id = ?', [apptId]
  );
  assert('APPT: Confirmation status = confirmed', confirmed?.status === 'confirmed', `Status: ${confirmed?.status}`);
  assert('APPT: Meeting link stored', confirmed?.meeting_link === meetLink, `Link: ${confirmed?.meeting_link}`);
  assert('APPT: confirmed_at recorded', !!confirmed?.confirmed_at, `confirmed_at: ${confirmed?.confirmed_at}`);

  // Complete appointment with deal value
  const dealValue = 29999;
  await db.run(
    `UPDATE appointments SET status = 'completed', deal_value = ? WHERE id = ?`,
    [dealValue, apptId]
  );
  const completed = await db.get<{ status: string; deal_value: number }>(
    'SELECT status, deal_value FROM appointments WHERE id = ?', [apptId]
  );
  assert('APPT: Completion status = completed', completed?.status === 'completed', `Status: ${completed?.status}`);
  assert('APPT: Deal value recorded', completed?.deal_value === dealValue, `Deal: ₹${completed?.deal_value}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST BLOCK 8: Conversion Stats
  // ═══════════════════════════════════════════════════════════════════════════

  log('\n📋 TEST BLOCK 8: Conversion Stats', COLORS.magenta);

  const stats = await QuotationService.getConversionStats();
  assert('STATS: accepted count ≥ 1', stats.accepted >= 1, `Got: ${stats.accepted}`);
  assert('STATS: expired count ≥ 1', stats.expired >= 1, `Got: ${stats.expired}`);
  assert('STATS: totalRevenue > 0', stats.totalRevenue > 0, `Got: ₹${stats.totalRevenue}`);
  log(`\n  Stats: ${JSON.stringify(stats, null, 2)}`, COLORS.yellow);

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST BLOCK 9: Package Pricing Alignment with Knowledge Base
  // ═══════════════════════════════════════════════════════════════════════════

  log('\n📋 TEST BLOCK 9: Package Pricing Alignment', COLORS.magenta);

  const pkgLeadId = 'validate-pkg-' + Date.now();
  await cleanup(db, pkgLeadId);
  await db.run(
    `INSERT INTO leads (id, name, phone, lead_stage, intent_level, ai_enabled) VALUES (?, ?, ?, ?, ?, ?)`,
    [pkgLeadId, 'Package Tester', '9999000004', 'qualified', 'WARM', 1]
  );

  const starter = await QuotationService.generateQuote(pkgLeadId, 'starter_presence');
  assert('PKG: Starter setup = ₹14999', starter.setup_cost === 14999, `Got: ₹${starter.setup_cost}`);
  assert('PKG: Starter monthly = ₹2999', starter.monthly_cost === 2999, `Got: ₹${starter.monthly_cost}`);

  const growth = await QuotationService.generateQuote(pkgLeadId, 'growth_engine');
  assert('PKG: Growth setup = ₹29999', growth.setup_cost === 29999, `Got: ₹${growth.setup_cost}`);
  assert('PKG: Growth monthly = ₹5999', growth.monthly_cost === 5999, `Got: ₹${growth.monthly_cost}`);

  // ─── Cleanup ───────────────────────────────────────────────────────────────
  await cleanup(db, leadId);
  await cleanup(db, expiredLeadId);
  await cleanup(db, nearExpiryLeadId);
  await cleanup(db, pkgLeadId);
  await db.run('DELETE FROM appointment_slots WHERE id = ?', [slotId]);

  // ═══════════════════════════════════════════════════════════════════════════
  // FINAL REPORT
  // ═══════════════════════════════════════════════════════════════════════════

  log('\n' + '═'.repeat(60), COLORS.cyan);
  log(`\n🏆 Phase 4A Production Validation Complete\n`, COLORS.bold + COLORS.cyan);
  log(`  Total:  ${passed + failed} tests`, COLORS.reset);
  log(`  Passed: ${passed} ✅`, COLORS.green);
  log(`  Failed: ${failed} ${failed > 0 ? '❌' : ''}`, failed > 0 ? COLORS.red : COLORS.green);

  if (failed > 0) {
    log('\n🔴 FAILED TESTS:', COLORS.red);
    results.filter(r => !r.pass).forEach(r => log(`  • ${r.name}: ${r.detail}`, COLORS.red));
  } else {
    log('\n🟢 ALL TESTS PASSED — Phase 4A Production Validated!', COLORS.bold + COLORS.green);
    log('\n✅ Phase 4A — Revenue Conversion Engine: COMPLETE', COLORS.bold + COLORS.green);
    log('🚀 Ready to proceed to Phase 4B — Sales Pipeline Kanban\n', COLORS.bold + COLORS.cyan);
  }

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('\n💥 Validation script crashed:', err);
  process.exit(1);
});
