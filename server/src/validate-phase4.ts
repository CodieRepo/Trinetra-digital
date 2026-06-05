import { initDb, getDb, logAuditAction } from './database/connection';
import { QuotationService } from './services/quotation.service';
import { logTimelineEvent, getLeadTimeline } from './services/timeline.service';
import { TaskModel } from './models/tasks.model';
import fs from 'fs';
import path from 'path';

async function runValidation() {
  console.log('🧪 Starting Trinetra OS Phase-4A Revenue Conversion Engine Validation...');

  // 1. Initialize Database
  await initDb();
  const db = getDb();
  console.log('✅ SQLite Database successfully connected.');

  // Create a clean test lead if not exists
  const testLeadId = 'validate-lead-phase4';
  await db.run('DELETE FROM leads WHERE id = ?', [testLeadId]);
  await db.run(
    `INSERT INTO leads (id, name, phone, email, company, service, status, ai_score, ai_enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [testLeadId, 'Phase4 Tester', '+919876543210', 'tester@phase4.com', 'Tester Inc.', 'Growth Engine', 'nurturing', 85, 1]
  );
  console.log('✅ Initialized validation lead "Phase4 Tester".');

  // Clean old quotations for this lead
  await db.run('DELETE FROM quotations WHERE lead_id = ?', [testLeadId]);

  // ── TEST 1: Generate Quote & Verify Pricing ──
  console.log('\n📡 TEST 1: Generating Quote for Growth Engine...');
  const quote = await QuotationService.generateQuote(testLeadId, 'growth_engine', undefined, 10, 'Test notes');
  
  console.log('📊 TEST 1 RESULT:');
  console.log(`- Quote ID: ${quote.id}`);
  console.log(`- Package: ${quote.package_name}`);
  console.log(`- Setup Cost: ₹${quote.setup_cost}`);
  console.log(`- Monthly Cost: ₹${quote.monthly_cost}`);
  console.log(`- Discount: ${quote.discount_pct}%`);
  console.log(`- Total Setup: ₹${quote.total_setup} (Expected: ₹26999)`);
  console.log(`- Total Monthly: ₹${quote.total_monthly} (Expected: ₹5399)`);
  console.log(`- Status: ${quote.status}`);

  if (quote.total_setup !== 26999 || quote.total_monthly !== 5399) {
    throw new Error('❌ Pricing calculations are incorrect!');
  }
  console.log('✅ Test 1 Passed.');

  // ── TEST 2: PDF Proposal Generation ──
  console.log('\n📡 TEST 2: Checking Branded PDF Generation...');
  if (!quote.pdf_path) {
    throw new Error('❌ Proposal PDF was not compiled successfully!');
  }
  const absolutePath = path.resolve(process.cwd(), quote.pdf_path);
  console.log(`- PDF Location: ${absolutePath}`);
  
  if (!fs.existsSync(absolutePath)) {
    throw new Error('❌ Generated PDF does not exist on disk!');
  }
  const stats = fs.statSync(absolutePath);
  console.log(`- PDF File Size: ${stats.size} bytes`);
  if (stats.size === 0) {
    throw new Error('❌ Generated PDF is empty!');
  }
  console.log('✅ Test 2 Passed.');

  // ── TEST 3: Status Transition & Timeline Log ──
  console.log('\n📡 TEST 3: Simulating Public Link View Tracker & Acceptance...');
  
  // Lead clicks link -> Viewed
  await QuotationService.markViewed(quote.id);
  let updatedQuote = await QuotationService.findById(quote.id);
  console.log(`- Status after viewed: ${updatedQuote?.status} (Expected: viewed)`);
  if (updatedQuote?.status !== 'viewed') {
    throw new Error('❌ Transition to viewed failed!');
  }

  // Lead accepts proposal
  await QuotationService.markAccepted(quote.id);
  updatedQuote = await QuotationService.findById(quote.id);
  console.log(`- Status after accepted: ${updatedQuote?.status} (Expected: accepted)`);
  if (updatedQuote?.status !== 'accepted') {
    throw new Error('❌ Transition to accepted failed!');
  }

  // Check lead stage update
  const lead = await db.get('SELECT lead_stage FROM leads WHERE id = ?', [testLeadId]);
  console.log(`- Lead CRM stage: ${lead?.lead_stage} (Expected: won)`);
  if (lead?.lead_stage !== 'won') {
    throw new Error('❌ Lead stage was not updated to won!');
  }

  // Check if onboarding task was created automatically
  const tasks = await TaskModel.findByLead(testLeadId);
  console.log(`- Tasks created for lead: ${tasks.length}`);
  const onboardingTask = tasks.find(t => t.title.includes('Onboard'));
  if (!onboardingTask) {
    throw new Error('❌ Automated client onboarding task was not created!');
  }
  console.log(`- Task Created: "${onboardingTask.title}" (${onboardingTask.status})`);

  // Check lead timeline entries
  const timeline = await getLeadTimeline(testLeadId);
  console.log(`- Timeline events logged: ${timeline.length}`);
  timeline.forEach((event: any) => {
    console.log(`  [${event.event_type.toUpperCase()}] ${event.description}`);
  });

  const acceptedTimelineEvent = timeline.find(e => e.description.includes('WON'));
  if (!acceptedTimelineEvent) {
    throw new Error('❌ Acceptance timeline log not found!');
  }
  console.log('✅ Test 3 Passed.');

  console.log('\n🏆 Trinetra OS Phase-4A Revenue Conversion Engine Validated Successfully!');
}

runValidation().catch((err) => {
  console.error('\n❌ Validation Suite failed:', err);
  process.exit(1);
});
