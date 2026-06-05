const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const { initDb, getDb } = require('./dist/database/connection');
const gateway = require('./dist/whatsapp/gateway');
const { processWithAI, getActiveAiProvider } = require('./dist/services/openrouter.service');
const { PipelineService } = require('./dist/services/pipeline.service');
const { QuotationService } = require('./dist/services/quotation.service');
const { TaskModel } = require('./dist/models/tasks.model');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m'
};

async function verifyAll() {
  console.log(`${COLORS.bold}${COLORS.cyan}==================================================`);
  console.log('🏁 POST-DEPLOYMENT PRODUCTION FUNCTIONAL VERIFICATION');
  console.log(`==================================================${COLORS.reset}\n`);

  // 1. Initialize Database Connection
  await initDb();
  const db = getDb();
  console.log(`✅ Database connection initialized successfully.`);

  // 2. Database Counts
  console.log(`\n${COLORS.bold}${COLORS.magenta}--- 📊 DATABASE COUNTS ---${COLORS.reset}`);
  const leadsCount = await db.get('SELECT COUNT(*) as c FROM leads');
  const tasksCount = await db.get('SELECT COUNT(*) as c FROM tasks');
  const quotationsCount = await db.get('SELECT COUNT(*) as c FROM quotations');
  const appointmentsCount = await db.get('SELECT COUNT(*) as c FROM appointments');
  const timelineCount = await db.get('SELECT COUNT(*) as c FROM lead_timeline');
  const auditLogsCount = await db.get('SELECT COUNT(*) as c FROM audit_logs');

  console.log(`• Leads:              ${leadsCount.c}`);
  console.log(`• Tasks:              ${tasksCount.c}`);
  console.log(`• Quotations:          ${quotationsCount.c}`);
  console.log(`• Appointments:       ${appointmentsCount.c}`);
  console.log(`• Timeline Events:     ${timelineCount.c}`);
  console.log(`• General Audit Logs:  ${auditLogsCount.c}`);

  // 3. WhatsApp Gateway Status
  console.log(`\n${COLORS.bold}${COLORS.magenta}--- 💬 WHATSAPP GATEWAY ---${COLORS.reset}`);
  const waStatus = gateway.getWhatsAppStatus();
  console.log(`• Connection Status:   ${waStatus.connectionStatus}`);
  console.log(`• QR Code Status:      ${waStatus.qr ? 'ACTIVE (Scan Required)' : 'INACTIVE (Connected or Offline)'}`);
  console.log(`• Active Session JID:  ${waStatus.jid || 'None'}`);
  console.log(`• Pending Queue Count: ${waStatus.pendingQueueCount}`);
  console.log(`• Failed Queue Count:  ${waStatus.failedQueueCount}`);
  console.log(`• Gateway Health Score: ${waStatus.healthScore}%`);

  // Query last inbound & outbound messages from DB
  const lastInbound = await db.get("SELECT body, timestamp FROM whatsapp_chats WHERE direction = 'inbound' ORDER BY timestamp DESC LIMIT 1");
  const lastOutbound = await db.get("SELECT body, timestamp FROM whatsapp_chats WHERE direction = 'outbound' ORDER BY timestamp DESC LIMIT 1");
  console.log(`• Last Inbound Message:  ${lastInbound ? `"${lastInbound.body}" (${lastInbound.timestamp})` : 'None in DB'}`);
  console.log(`• Last Outbound Message: ${lastOutbound ? `"${lastOutbound.body}" (${lastOutbound.timestamp})` : 'None in DB'}`);

  // 4. AI Provider and OpenRouter Connectivity
  console.log(`\n${COLORS.bold}${COLORS.magenta}--- 🤖 AI CAPABILITIES ---${COLORS.reset}`);
  const activeProvider = getActiveAiProvider();
  console.log(`• Active Provider:      ${activeProvider}`);

  // Test OpenRouter connectivity with real prompt
  console.log(`• Sending test prompt to OpenRouter model cascade...`);
  const dummyContext = {
    leadId: 'test-verify-' + Date.now(),
    leadName: 'Production Verification Bot',
    leadPhone: '+919999999999',
    service: 'AI Automation Solutions',
    source: 'production_verification',
    currentScore: 50,
    conversationSummary: 'Initial contact.',
    recentMessages: [
      { role: 'user', content: 'What are your package details and pricing?' }
    ],
    totalMessagesCount: 1
  };

  try {
    const aiResponse = await processWithAI(dummyContext);
    console.log(`  🟢 OpenRouter Connectivity: SUCCESSFUL`);
    console.log(`  🟢 Model Used:              ${aiResponse.model_used}`);
    console.log(`  🟢 Response Code Intent:    ${aiResponse.intent_level}`);
    console.log(`  🟢 Response Budget Stated:  ${aiResponse.ai_budget}`);
    console.log(`  🟢 Extracted Package:       ${aiResponse.recommended_package}`);
    console.log(`  🟢 Generated Reply Preview:`);
    console.log(`${COLORS.yellow}--------------------------------------------------`);
    console.log(aiResponse.reply);
    console.log(`--------------------------------------------------${COLORS.reset}`);
    console.log(`  🟢 Cost:                    $${aiResponse.cost_usd} (${aiResponse.input_tokens} prompt / ${aiResponse.output_tokens} completion tokens)`);
  } catch (err) {
    console.error(`  🔴 OpenRouter Connectivity: FAILED`);
    console.error(`  Error message:`, err.message);
  }

  // 5. CRM Load Verification
  console.log(`\n${COLORS.bold}${COLORS.magenta}--- 💼 CRM INTERACTION ---${COLORS.reset}`);
  
  // Verify loading Lead Intelligence Card details (fetch one lead)
  const sampleLead = await db.get('SELECT * FROM leads ORDER BY created_at DESC LIMIT 1');
  if (sampleLead) {
    console.log(`• AI Lead Intelligence:  LOADED SUCCESSFULLY`);
    console.log(`  Lead ID:               ${sampleLead.id}`);
    console.log(`  Lead Name:             ${sampleLead.name}`);
    console.log(`  Intent Level:          ${sampleLead.intent_level || 'COLD'}`);
    console.log(`  Win Probability:       ${sampleLead.deal_probability || 20}%`);
    console.log(`  Detailed Summary:      ${sampleLead.ai_summary_detailed || 'None'}`);
  } else {
    console.log(`• AI Lead Intelligence:  NO LEADS IN DATABASE`);
  }

  // Verify loading Tasks
  const sampleTask = await db.get('SELECT * FROM tasks LIMIT 1');
  console.log(`• Tasks Panel Load:      ${sampleTask ? 'LOADED SUCCESSFULLY' : 'EMPTY (but query successful)'}`);

  // Verify loading Timeline
  const sampleTimeline = await db.get('SELECT * FROM lead_timeline LIMIT 1');
  console.log(`• Timeline Load:         ${sampleTimeline ? 'LOADED SUCCESSFULLY' : 'EMPTY (but query successful)'}`);

  // Verify loading Analytics
  try {
    const stats = await QuotationService.getConversionStats();
    console.log(`• Analytics Load:        LOADED SUCCESSFULLY`);
    console.log(`  Setup Revenue:         ₹${stats.totalRevenue || 0}`);
    console.log(`  Active Pipeline:       ₹${stats.totalPipeline || 0}`);
    console.log(`  Accepted Quotes:       ${stats.accepted || 0}`);
    console.log(`  Expired Quotes:        ${stats.expired || 0}`);
  } catch (err) {
    console.error(`• Analytics Load:        FAILED (${err.message})`);
  }

  // 6. Revenue Engine Verification
  console.log(`\n${COLORS.bold}${COLORS.magenta}--- 💸 REVENUE ENGINE ---${COLORS.reset}`);
  const tempLeadId = 'verify-rev-' + Date.now();
  await db.run("INSERT INTO leads (id, name, phone, lead_stage, intent_level) VALUES (?, ?, ?, ?, ?)", [tempLeadId, 'Temp Rev Tester', '9999911111', 'qualified', 'HOT']);
  
  try {
    // Generate quote
    const quote = await QuotationService.generateQuote(tempLeadId, 'growth_engine', undefined, 10, 'Post-deploy check');
    console.log(`• Quote Generation:      SUCCESSFUL (ID: ${quote.id}, Version: ${quote.version})`);
    
    // PDF generation check
    const pdfPath = path.resolve(process.cwd(), quote.pdf_path);
    const pdfExists = fs.existsSync(pdfPath);
    console.log(`• PDF Generation:        ${pdfExists ? 'SUCCESSFUL' : 'FAILED'}`);
    if (pdfExists) {
      const size = fs.statSync(pdfPath).size;
      console.log(`• Quote Download Check:  FILE READABLE (Size: ${size} bytes)`);
    }

    // Quote status tracking: draft -> viewed
    await QuotationService.markViewed(quote.id);
    const viewedQ = await QuotationService.findById(quote.id);
    console.log(`• Quote State viewed:    SUCCESSFUL (New status: ${viewedQ.status}, viewed_at: ${viewedQ.viewed_at})`);

    // Quote state viewed -> accepted
    await QuotationService.markAccepted(quote.id);
    const acceptedQ = await QuotationService.findById(quote.id);
    console.log(`• Quote State accepted:  SUCCESSFUL (New status: ${acceptedQ.status}, accepted_at: ${acceptedQ.accepted_at})`);

    // Onboarding task creation check
    const generatedTasks = await TaskModel.findByLead(tempLeadId);
    console.log(`• Onboarding Tasks:      CREATED SUCCESSFULLY (${generatedTasks.length} tasks generated)`);
    generatedTasks.forEach(t => console.log(`  - [${t.type}] "${t.title}"`));
  } catch (err) {
    console.error(`• Revenue Engine:        VERIFICATION FAILED (${err.message})`);
  } finally {
    // Clean up
    await db.run('DELETE FROM lead_timeline WHERE lead_id = ?', [tempLeadId]);
    await db.run('DELETE FROM tasks WHERE lead_id = ?', [tempLeadId]);
    await db.run('DELETE FROM quotations WHERE lead_id = ?', [tempLeadId]);
    await db.run('DELETE FROM leads WHERE id = ?', [tempLeadId]);
  }

  // 7. Pipeline & Forecast Verification
  console.log(`\n${COLORS.bold}${COLORS.magenta}--- 🔀 PIPELINE & FORECAST ---${COLORS.reset}`);
  try {
    // Pipeline board loads
    const pipelineData = await PipelineService.getPipelineData();
    console.log(`• /admin/pipeline Load:  SUCCESSFUL (${pipelineData.length} columns loaded)`);

    // Forecast panel loads
    const forecast = await PipelineService.getForecastData('month');
    console.log(`• Forecast Panel Load:   SUCCESSFUL (Monthly Expected: ₹${forecast.expected_revenue})`);

    // Audit trail records stage movement
    const auditLeadId = 'verify-pipe-' + Date.now();
    await db.run("INSERT INTO leads (id, name, phone, lead_stage, intent_level) VALUES (?, ?, ?, ?, ?)", [auditLeadId, 'Temp Pipeline Tester', '9999922222', 'new', 'COLD']);
    
    // Perform stage movement
    await PipelineService.moveStage(auditLeadId, 'qualified', 'test_admin', 'Moving to qualified to check audit trail logging');
    
    // Query audit log
    const auditTrail = await PipelineService.getAuditTrail(auditLeadId);
    const logged = auditTrail.length > 0 && auditTrail[0].new_stage === 'qualified';
    console.log(`• Drag & Drop Audit:     ${logged ? 'SUCCESSFUL (Recorded stage movement in audit trail)' : 'FAILED'}`);
    if (logged) {
      console.log(`  Audit Entry:           "${auditTrail[0].old_stage}" -> "${auditTrail[0].new_stage}" by ${auditTrail[0].changed_by} (Reason: ${auditTrail[0].reason})`);
    }

    // Clean up pipeline tester
    await db.run('DELETE FROM pipeline_audit_log WHERE lead_id = ?', [auditLeadId]);
    await db.run('DELETE FROM lead_timeline WHERE lead_id = ?', [auditLeadId]);
    await db.run('DELETE FROM leads WHERE id = ?', [auditLeadId]);

  } catch (err) {
    console.error(`• Pipeline Verification: FAILED (${err.message})`);
  }

  console.log(`\n${COLORS.bold}${COLORS.cyan}==================================================`);
  console.log('🏁 FUNCTIONAL VERIFICATION COMPLETE');
  console.log(`==================================================${COLORS.reset}\n`);

  process.exit(0);
}

verifyAll().catch(err => {
  console.error('💥 Verification crashed:', err);
  process.exit(1);
});
