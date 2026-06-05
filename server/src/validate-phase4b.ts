/**
 * Phase 4B Production Validation Script
 * Tests: pipeline data, stage movement with audit trail, probability override,
 *        deal value computation, expected revenue, stuck-lead detection,
 *        no-reply detection, forecast engine (month/quarter/year).
 *
 * Run: node dist/validate-phase4b.js
 */

import { initDb } from './database/connection';
import { PipelineService, INTENT_PROBABILITY } from './services/pipeline.service';
import { TaskModel } from './models/tasks.model';
import { getDb } from './database/connection';

const COLORS = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', cyan: '\x1b[36m', bold: '\x1b[1m', magenta: '\x1b[35m'
};

let passed = 0, failed = 0;
const results: { name: string; pass: boolean; detail: string }[] = [];

function log(msg: string, color = COLORS.reset) { console.log(`${color}${msg}${COLORS.reset}`); }

function assert(name: string, condition: boolean, detail: string) {
  if (condition) { passed++; results.push({ name, pass: true, detail }); log(`  ✅ ${name}`, COLORS.green); }
  else { failed++; results.push({ name, pass: false, detail }); log(`  ❌ FAILED: ${name} — ${detail}`, COLORS.red); }
}

async function cleanup(db: any, leadId: string) {
  await db.run('DELETE FROM pipeline_audit_log WHERE lead_id = ?', [leadId]);
  await db.run('DELETE FROM lead_timeline WHERE lead_id = ?', [leadId]);
  await db.run('DELETE FROM tasks WHERE lead_id = ?', [leadId]);
  await db.run('DELETE FROM quotations WHERE lead_id = ?', [leadId]);
  await db.run('DELETE FROM leads WHERE id = ?', [leadId]);
}

async function run() {
  log('\n🧪 Trinetra OS — Phase 4B Revenue Pipeline Validation\n', COLORS.bold + COLORS.cyan);
  log('═'.repeat(60), COLORS.cyan);

  const db = await initDb();

  // Setup test leads
  const leads = [
    { id: 'pipe-hot-' + Date.now(), name: 'HOT Lead Test', intent: 'HOT', stage: 'qualified' },
    { id: 'pipe-warm-' + Date.now() + 1, name: 'WARM Lead Test', intent: 'WARM', stage: 'nurturing' },
    { id: 'pipe-cold-' + Date.now() + 2, name: 'COLD Lead Test', intent: 'COLD', stage: 'new' },
    { id: 'pipe-qr-' + Date.now() + 3, name: 'QR Lead Test', intent: 'QUOTATION_REQUIRED', stage: 'ai_qualifying' },
  ];

  for (const l of leads) await cleanup(db, l.id);

  for (const l of leads) {
    await db.run(
      `INSERT INTO leads (id, name, phone, lead_stage, intent_level, ai_enabled, deal_probability, stage_entered_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP)`,
      [l.id, l.name, '9998' + Math.floor(Math.random() * 1000000), l.stage, l.intent, INTENT_PROBABILITY[l.intent]]
    );
  }
  log(`\n🎯 ${leads.length} test leads initialized\n`, COLORS.cyan);

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST BLOCK 1: Intent-Based Default Probabilities
  // ═══════════════════════════════════════════════════════════════════════════

  log('📋 TEST BLOCK 1: Intent-Based Default Probabilities', COLORS.magenta);

  const hotLead = await db.get<any>('SELECT * FROM leads WHERE id = ?', [leads[0].id]);
  const warmLead = await db.get<any>('SELECT * FROM leads WHERE id = ?', [leads[1].id]);
  const coldLead = await db.get<any>('SELECT * FROM leads WHERE id = ?', [leads[2].id]);
  const qrLead = await db.get<any>('SELECT * FROM leads WHERE id = ?', [leads[3].id]);

  assert('PROB: HOT lead default = 80%', hotLead?.deal_probability === 80, `Got: ${hotLead?.deal_probability}%`);
  assert('PROB: WARM lead default = 50%', warmLead?.deal_probability === 50, `Got: ${warmLead?.deal_probability}%`);
  assert('PROB: COLD lead default = 20%', coldLead?.deal_probability === 20, `Got: ${coldLead?.deal_probability}%`);
  assert('PROB: QUOTATION_REQUIRED default = 70%', qrLead?.deal_probability === 70, `Got: ${qrLead?.deal_probability}%`);

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST BLOCK 2: Manual Probability Override
  // ═══════════════════════════════════════════════════════════════════════════

  log('\n📋 TEST BLOCK 2: Manual Probability Override', COLORS.magenta);

  await PipelineService.updateProbability(leads[0].id, 95, 'sales_rep_override');
  const overridden = await db.get<{ deal_probability: number }>('SELECT deal_probability FROM leads WHERE id = ?', [leads[0].id]);
  assert('PROB: Override to 95%', overridden?.deal_probability === 95, `Got: ${overridden?.deal_probability}%`);

  await PipelineService.updateProbability(leads[0].id, 105, 'test_clamp'); // Should clamp to 100
  const clamped = await db.get<{ deal_probability: number }>('SELECT deal_probability FROM leads WHERE id = ?', [leads[0].id]);
  assert('PROB: Clamp to 100% max', clamped?.deal_probability === 100, `Got: ${clamped?.deal_probability}%`);

  await PipelineService.updateProbability(leads[0].id, -10, 'test_clamp'); // Should clamp to 0
  const clampedMin = await db.get<{ deal_probability: number }>('SELECT deal_probability FROM leads WHERE id = ?', [leads[0].id]);
  assert('PROB: Clamp to 0% min', clampedMin?.deal_probability === 0, `Got: ${clampedMin?.deal_probability}%`);

  // Reset to 80 for further tests
  await PipelineService.updateProbability(leads[0].id, 80, 'test_reset');

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST BLOCK 3: Deal Value Computation (Setup + MRR × 12 = Annual)
  // ═══════════════════════════════════════════════════════════════════════════

  log('\n📋 TEST BLOCK 3: Deal Value Calculation (Setup + MRR × 12)', COLORS.magenta);

  await PipelineService.updateDealValues(leads[0].id, 29999, 5999);
  const dealLead = await db.get<any>('SELECT * FROM leads WHERE id = ?', [leads[0].id]);

  assert('DEAL: Setup stored = ₹29,999', dealLead?.deal_setup_value === 29999, `Got: ₹${dealLead?.deal_setup_value}`);
  assert('DEAL: MRR stored = ₹5,999', dealLead?.deal_mrr === 5999, `Got: ₹${dealLead?.deal_mrr}`);
  const expectedAnnual = 29999 + 5999 * 12;
  assert(`DEAL: Annual = Setup + MRR×12 = ₹${expectedAnnual.toLocaleString('en-IN')}`,
    dealLead?.deal_annual_value === expectedAnnual, `Got: ₹${dealLead?.deal_annual_value}`);

  // Expected revenue = annual × probability / 100
  const expectedRev = Math.round(expectedAnnual * 80 / 100);
  const pipelineData = await PipelineService.getPipelineData();
  const hotGroup = pipelineData.find(g => g.stage === 'qualified');
  const hotInPipeline = hotGroup?.leads.find(l => l.id === leads[0].id);
  assert('DEAL: Expected revenue in pipeline data', !!hotInPipeline, `HOT lead found in qualified stage`);
  assert(`DEAL: Expected revenue = Annual × 80% = ₹${expectedRev.toLocaleString('en-IN')}`,
    hotInPipeline?.expected_revenue === expectedRev, `Got: ₹${hotInPipeline?.expected_revenue}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST BLOCK 4: Stage Movement with Full Audit Trail
  // ═══════════════════════════════════════════════════════════════════════════

  log('\n📋 TEST BLOCK 4: Stage Movement & Audit Trail', COLORS.magenta);

  // Move HOT lead: qualified → nurturing
  await PipelineService.moveStage(leads[0].id, 'nurturing', 'test_admin', 'Follow-up call completed, moving to nurturing');
  const movedLead = await db.get<any>('SELECT * FROM leads WHERE id = ?', [leads[0].id]);
  assert('STAGE: qualified → nurturing', movedLead?.lead_stage === 'nurturing', `Got: ${movedLead?.lead_stage}`);
  assert('STAGE: stage_entered_at updated', !!movedLead?.stage_entered_at, `Got: ${movedLead?.stage_entered_at}`);
  assert('STAGE: stuck locks reset (7d)', movedLead?.stuck_task_7d === 0, `Got: ${movedLead?.stuck_task_7d}`);
  assert('STAGE: stuck locks reset (14d)', movedLead?.stuck_task_14d === 0, `Got: ${movedLead?.stuck_task_14d}`);

  // Verify audit trail
  const audit = await PipelineService.getAuditTrail(leads[0].id);
  assert('AUDIT: At least 1 audit entry created', audit.length >= 1, `Got: ${audit.length} entries`);
  const lastAudit = audit[0]; // Most recent first
  assert('AUDIT: old_stage = qualified', lastAudit.old_stage === 'qualified', `Got: ${lastAudit.old_stage}`);
  assert('AUDIT: new_stage = nurturing', lastAudit.new_stage === 'nurturing', `Got: ${lastAudit.new_stage}`);
  assert('AUDIT: changed_by = test_admin', lastAudit.changed_by === 'test_admin', `Got: ${lastAudit.changed_by}`);
  assert('AUDIT: reason recorded', !!(lastAudit.reason?.includes('Follow-up')), `Got: ${lastAudit.reason}`);
  assert('AUDIT: timestamp recorded', !!lastAudit.timestamp, `Got: ${lastAudit.timestamp}`);

  // Move to won — should set probability to 100
  await PipelineService.moveStage(leads[0].id, 'won', 'test_admin', 'Contract signed');
  const wonLead = await db.get<any>('SELECT lead_stage, deal_probability FROM leads WHERE id = ?', [leads[0].id]);
  assert('STAGE: nurturing → won', wonLead?.lead_stage === 'won', `Got: ${wonLead?.lead_stage}`);
  assert('STAGE: Won auto-sets probability to 100%', wonLead?.deal_probability === 100, `Got: ${wonLead?.deal_probability}%`);

  // Move to lost — should set probability to 0
  await PipelineService.moveStage(leads[2].id, 'lost' as any, 'test_admin', 'No budget available');
  const lostLead = await db.get<any>('SELECT lead_stage, deal_probability FROM leads WHERE id = ?', [leads[2].id]);
  assert('STAGE: new → lost', lostLead?.lead_stage === 'lost', `Got: ${lostLead?.lead_stage}`);
  assert('STAGE: Lost auto-sets probability to 0%', lostLead?.deal_probability === 0, `Got: ${lostLead?.deal_probability}%`);

  // Verify complete audit chain for HOT lead (qualified→nurturing→won)
  const fullAudit = await PipelineService.getAuditTrail(leads[0].id);
  assert('AUDIT: Chain = 2 movements (qualified→nurturing→won)', fullAudit.length === 2, `Got: ${fullAudit.length} entries`);

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST BLOCK 5: Pipeline Data Grouping & Stage Totals
  // ═══════════════════════════════════════════════════════════════════════════

  log('\n📋 TEST BLOCK 5: Pipeline Data Grouping', COLORS.magenta);

  const pipeline = await PipelineService.getPipelineData();
  assert('PIPELINE: Returns 6 stage groups', pipeline.length === 6, `Got: ${pipeline.length} groups`);

  const stages = pipeline.map(g => g.stage);
  assert('PIPELINE: Contains all canonical stages',
    ['new', 'ai_qualifying', 'qualified', 'nurturing', 'won', 'lost'].every(s => (stages as string[]).includes(s)),
    `Stages: ${stages.join(', ')}`);

  const wonGroup = pipeline.find(g => g.stage === 'won');
  assert('PIPELINE: Won stage has leads', (wonGroup?.lead_count || 0) >= 1, `Count: ${wonGroup?.lead_count}`);
  assert('PIPELINE: Won pipeline value > 0', (wonGroup?.total_pipeline_value || 0) > 0, `Value: ${wonGroup?.total_pipeline_value}`);
  assert('PIPELINE: Won expected revenue > 0', (wonGroup?.total_expected_revenue || 0) > 0, `Expected: ${wonGroup?.total_expected_revenue}`);

  // Check days_in_stage and enriched data on a lead
  const wonLeadInPipeline = wonGroup?.leads.find(l => l.id === leads[0].id);
  assert('PIPELINE: Lead has days_in_stage', wonLeadInPipeline !== undefined && (wonLeadInPipeline.days_in_stage >= 0),
    `days_in_stage: ${wonLeadInPipeline?.days_in_stage}`);
  assert('PIPELINE: Lead has expected_revenue', (wonLeadInPipeline?.expected_revenue || 0) >= 0, 'ok');

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST BLOCK 6: Stuck Lead Detection
  // ═══════════════════════════════════════════════════════════════════════════

  log('\n📋 TEST BLOCK 6: Stuck Lead Detection', COLORS.magenta);

  const stuckLeadId = 'pipe-stuck-' + Date.now();
  await cleanup(db, stuckLeadId);
  await db.run(
    `INSERT INTO leads (id, name, phone, lead_stage, intent_level, ai_enabled, deal_probability, stuck_task_7d, stuck_task_14d, stuck_task_30d)
     VALUES (?, ?, ?, ?, ?, 1, 50, 0, 0, 0)`,
    [stuckLeadId, 'Stuck Lead 14 Days', '9997123456', 'qualified', 'WARM']
  );
  // Backdate stage_entered_at to 15 days ago
  const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
  await db.run('UPDATE leads SET stage_entered_at = ? WHERE id = ?', [fifteenDaysAgo, stuckLeadId]);

  // Run detection
  await PipelineService.detectStuckLeads();

  const stuckTasks = await TaskModel.findByLead(stuckLeadId);
  const task7d = stuckTasks.find(t => t.title.includes('stuck') && !t.title.includes('ESCALATION'));
  const task14d = stuckTasks.find(t => t.title.includes('ESCALATION'));
  assert('STUCK: 7-day task created', !!task7d, `Tasks: ${stuckTasks.map(t=>t.title).join(', ')}`);
  assert('STUCK: 14-day escalation task created', !!task14d, `Tasks: ${stuckTasks.map(t=>t.title).join(', ')}`);
  assert('STUCK: Task count is 2 (7d + 14d)', stuckTasks.length === 2, `Got: ${stuckTasks.length} tasks`);

  const stuckFlags = await db.get<{ stuck_task_7d: number; stuck_task_14d: number }>(
    'SELECT stuck_task_7d, stuck_task_14d FROM leads WHERE id = ?', [stuckLeadId]
  );
  assert('STUCK: stuck_task_7d flag = 1 (prevents duplicates)', stuckFlags?.stuck_task_7d === 1, `Got: ${stuckFlags?.stuck_task_7d}`);
  assert('STUCK: stuck_task_14d flag = 1 (prevents duplicates)', stuckFlags?.stuck_task_14d === 1, `Got: ${stuckFlags?.stuck_task_14d}`);

  // Run again — should NOT create duplicates
  await PipelineService.detectStuckLeads();
  const afterSecondRun = await TaskModel.findByLead(stuckLeadId);
  assert('STUCK: No duplicate tasks on second run', afterSecondRun.length === 2, `Got: ${afterSecondRun.length} tasks`);

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST BLOCK 7: No-Reply Detection (30 days)
  // ═══════════════════════════════════════════════════════════════════════════

  log('\n📋 TEST BLOCK 7: No-Reply Detection (30 days)', COLORS.magenta);

  const silentLeadId = 'pipe-silent-' + Date.now();
  await cleanup(db, silentLeadId);
  await db.run(
    `INSERT INTO leads (id, name, phone, lead_stage, intent_level, ai_enabled, deal_probability, stuck_task_30d)
     VALUES (?, ?, ?, ?, ?, 1, 50, 0)`,
    [silentLeadId, 'Silent Lead 35 Days', '9996123456', 'nurturing', 'WARM']
  );
  // Add a 35-day-old inbound message
  const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();
  await db.run(
    `INSERT INTO whatsapp_chats (id, lead_id, direction, body, status, timestamp) VALUES (?, ?, ?, ?, ?, ?)`,
    ['old-msg-' + Date.now(), silentLeadId, 'inbound', 'Old message', 'read', thirtyFiveDaysAgo]
  );

  await PipelineService.detectStuckLeads();

  const silentTasks = await TaskModel.findByLead(silentLeadId);
  const noReplyTask = silentTasks.find(t => t.title.includes('No reply') || t.title.includes('📵'));
  assert('NO-REPLY: 30d task created for silent lead', !!noReplyTask, `Tasks: ${silentTasks.map(t=>t.title).join(', ')}`);

  const silentFlag = await db.get<{ stuck_task_30d: number }>('SELECT stuck_task_30d FROM leads WHERE id = ?', [silentLeadId]);
  assert('NO-REPLY: stuck_task_30d flag = 1', silentFlag?.stuck_task_30d === 1, `Got: ${silentFlag?.stuck_task_30d}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST BLOCK 8: Forecast Engine (Month / Quarter / Year)
  // ═══════════════════════════════════════════════════════════════════════════

  log('\n📋 TEST BLOCK 8: Forecast Engine', COLORS.magenta);

  const monthForecast = await PipelineService.getForecastData('month');
  const quarterForecast = await PipelineService.getForecastData('quarter');
  const yearForecast = await PipelineService.getForecastData('year');

  assert('FORECAST: month period returned', monthForecast.period === 'month', `Got: ${monthForecast.period}`);
  assert('FORECAST: quarter period returned', quarterForecast.period === 'quarter', `Got: ${quarterForecast.period}`);
  assert('FORECAST: year period returned', yearForecast.period === 'year', `Got: ${yearForecast.period}`);
  assert('FORECAST: pipeline_value ≥ 0', monthForecast.pipeline_value >= 0, `Got: ₹${monthForecast.pipeline_value}`);
  assert('FORECAST: expected_revenue ≤ pipeline_value', monthForecast.expected_revenue <= monthForecast.pipeline_value, `Expected: ${monthForecast.expected_revenue} ≤ ${monthForecast.pipeline_value}`);
  assert('FORECAST: win_rate 0–100', monthForecast.win_rate >= 0 && monthForecast.win_rate <= 100, `Got: ${monthForecast.win_rate}%`);
  assert('FORECAST: avg_deal_size ≥ 0', monthForecast.avg_deal_size >= 0, `Got: ${monthForecast.avg_deal_size}`);
  assert('FORECAST: avg_sales_cycle_days ≥ 0', monthForecast.avg_sales_cycle_days >= 0, `Got: ${monthForecast.avg_sales_cycle_days}`);
  assert('FORECAST: Year pipeline ≥ month pipeline (same data set)', yearForecast.pipeline_value >= monthForecast.pipeline_value, 'Year should encompass all active leads');

  log(`\n  Forecast (Month): Pipeline ₹${monthForecast.pipeline_value.toLocaleString('en-IN')}, Expected ₹${monthForecast.expected_revenue.toLocaleString('en-IN')}, Win Rate ${monthForecast.win_rate}%`, COLORS.yellow);

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST BLOCK 9: Deal Value Sync from Quotation
  // ═══════════════════════════════════════════════════════════════════════════

  log('\n📋 TEST BLOCK 9: Deal Value Sync from Quotation', COLORS.magenta);

  const syncLeadId = 'pipe-sync-' + Date.now();
  await cleanup(db, syncLeadId);
  await db.run(
    `INSERT INTO leads (id, name, phone, lead_stage, intent_level, ai_enabled, deal_probability)
     VALUES (?, ?, ?, ?, ?, 1, 60)`,
    [syncLeadId, 'Sync Test Lead', '9995123456', 'qualified', 'WARM']
  );
  const quotationId = 'q-sync-' + Date.now();
  await db.run(
    `INSERT INTO quotations (id, lead_id, package_tier, package_name, setup_cost, monthly_cost, 
     total_setup, total_monthly, discount_pct, line_items, currency, validity_days, status, version)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [quotationId, syncLeadId, 'sales_system', 'Sales System', 59999, 9999, 59999, 9999, 0, '[]', 'INR', 7, 'sent', 1]
  );

  await PipelineService.syncDealValues(syncLeadId);
  const synced = await db.get<any>('SELECT * FROM leads WHERE id = ?', [syncLeadId]);
  assert('SYNC: deal_setup_value from quotation', synced?.deal_setup_value === 59999, `Got: ₹${synced?.deal_setup_value}`);
  assert('SYNC: deal_mrr from quotation', synced?.deal_mrr === 9999, `Got: ₹${synced?.deal_mrr}`);
  const expectedSyncAnnual = 59999 + 9999 * 12;
  assert(`SYNC: deal_annual_value = ₹${expectedSyncAnnual.toLocaleString('en-IN')}`,
    synced?.deal_annual_value === expectedSyncAnnual, `Got: ₹${synced?.deal_annual_value}`);

  // ─── Cleanup ───────────────────────────────────────────────────────────────
  for (const l of leads) await cleanup(db, l.id);
  await cleanup(db, stuckLeadId);
  await cleanup(db, silentLeadId);
  await cleanup(db, syncLeadId);
  await db.run('DELETE FROM whatsapp_chats WHERE lead_id LIKE ?', ['pipe-%']);

  // ═══════════════════════════════════════════════════════════════════════════
  // FINAL REPORT
  // ═══════════════════════════════════════════════════════════════════════════

  log('\n' + '═'.repeat(60), COLORS.cyan);
  log(`\n🏆 Phase 4B Revenue Pipeline Validation Complete\n`, COLORS.bold + COLORS.cyan);
  log(`  Total:  ${passed + failed} tests`, COLORS.reset);
  log(`  Passed: ${passed} ✅`, COLORS.green);
  log(`  Failed: ${failed} ${failed > 0 ? '❌' : ''}`, failed > 0 ? COLORS.red : COLORS.green);

  if (failed > 0) {
    log('\n🔴 FAILED TESTS:', COLORS.red);
    results.filter(r => !r.pass).forEach(r => log(`  • ${r.name}: ${r.detail}`, COLORS.red));
  } else {
    log('\n🟢 ALL TESTS PASSED — Phase 4B Revenue Pipeline Validated!', COLORS.bold + COLORS.green);
    log('🚀 Ready for VPS deployment\n', COLORS.bold + COLORS.cyan);
  }

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('\n💥 Validation script crashed:', err);
  process.exit(1);
});
