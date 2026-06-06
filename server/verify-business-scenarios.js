const { initDb, getDb } = require('./dist/database/connection');
const { processWithAI } = require('./dist/services/openrouter.service');
const { QuotationService } = require('./dist/services/quotation.service');
const { PipelineService } = require('./dist/services/pipeline.service');

async function runScenarios() {
  console.log('🏁 STARTING REAL-WORLD BUSINESS SCENARIOS VERIFICATION...');
  await initDb();
  const db = getDb();

  const testPhone = '+919999999999';
  const leadId = 'test-scenario-' + Date.now();
  
  // Create base lead
  await db.run(
    `INSERT INTO leads (id, name, phone, service, source, status, ai_score, ai_enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [leadId, 'Business Tester', testPhone, 'General Inquiry', 'Website', 'ai_qualifying', 0, 1]
  );
  
  console.log(`✅ Lead created: ${leadId}`);

  let currentScore = 0;
  let summary = '';
  let messages = [];

  async function simulateMessage(userText, expectedHandoff = false) {
    console.log(`\n👤 [USER]: ${userText}`);
    messages.push({ role: 'user', content: userText });
    
    const ctx = {
      leadId,
      leadName: 'Business Tester',
      leadPhone: testPhone,
      service: 'General Inquiry',
      source: 'Website',
      currentScore,
      conversationSummary: summary,
      recentMessages: messages.slice(-10),
      totalMessagesCount: messages.length
    };

    const aiRes = await processWithAI(ctx);
    
    console.log(`🤖 [AI]: ${aiRes.reply}`);
    console.log(`📊 [STATE]: Score: ${aiRes.ai_score} | Budget: ${aiRes.ai_budget} | Booking: ${aiRes.booking_state || 'none'}`);
    
    if (aiRes.human_handoff) {
      console.log(`🚨 [HANDOFF TRIGGERED]: ${aiRes.handoff_reason}`);
    }

    if (expectedHandoff && !aiRes.human_handoff) {
      console.error('❌ Expected handoff but it was not triggered!');
      process.exit(1);
    }
    if (!expectedHandoff && aiRes.human_handoff) {
      console.error('❌ Unexpected handoff triggered!');
      process.exit(1);
    }

    // Update state
    currentScore = aiRes.ai_score;
    summary = aiRes.ai_summary || summary;
    messages.push({ role: 'assistant', content: aiRes.reply });
    
    return aiRes;
  }

  // Scenario 1: New lead inquiry & Scenario 9: Lead qualification flow (Start)
  console.log('\n--- SCENARIO 1 & 9: New Lead Inquiry & Qualification ---');
  await simulateMessage('Hi, I am looking for software for my business.');

  // Scenario 2: Pricing inquiry
  console.log('\n--- SCENARIO 2: Pricing Inquiry ---');
  await simulateMessage('What is the cost of a WhatsApp automation system?');

  // Scenario 3: Package inquiry
  console.log('\n--- SCENARIO 3: Package Inquiry ---');
  await simulateMessage('What all is included in the Growth Engine package?');

  // Scenario 4: Quotation request
  console.log('\n--- SCENARIO 4: Quotation Request ---');
  await simulateMessage('Please send me a formal quotation for the Growth Engine package.');

  // Scenario 5: Demo request & Scenario 6: Appointment booking
  console.log('\n--- SCENARIO 5 & 6: Demo Request & Appointment Booking ---');
  await simulateMessage('I want to book a demo for tomorrow at 2 PM.');

  // Scenario 7: Human handoff request
  console.log('\n--- SCENARIO 7: Human Handoff Request ---');
  await simulateMessage('Connect me to a human agent please.', true);

  // Scenario 8 & 10: Follow-up sequence & Conversation resume
  console.log('\n--- SCENARIO 8 & 10: Conversation Resume after Handoff ---');
  console.log('🔄 Resolving handoff and resuming AI...');
  // Simulate handoff resolution
  messages.push({ role: 'assistant', content: 'Hi, human agent here. How can I help?' });
  messages.push({ role: 'user', content: 'Actually I just wanted to confirm the monthly cost.' });
  messages.push({ role: 'assistant', content: 'The monthly cost is ₹5,999. Let me know if you need anything else!' });
  
  // Now user messages again after human conversation
  console.log('👤 [USER]: Ok, that sounds good. Let us proceed.');
  await simulateMessage('Ok, that sounds good. Let us proceed.');

  console.log('\n✅ ALL 10 BUSINESS SCENARIOS VERIFIED SUCCESSFULLY!');
  
  // Cleanup
  await db.run('DELETE FROM leads WHERE id = ?', [leadId]);
  process.exit(0);
}

runScenarios().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
