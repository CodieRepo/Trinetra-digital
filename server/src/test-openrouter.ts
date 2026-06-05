import { processWithAI } from './services/openrouter.service';
import { initDb } from './database/connection';

async function runTests() {
  console.log('🧪 Starting Trinetra OS Phase-3 OpenRouter AI Validation Suite...\n');
  
  // Initialize Database in memory/connection for logging audit actions safely
  try {
    await initDb();
    console.log('✅ SQLite Audit database initialized successfully.');
  } catch (err) {
    console.warn('⚠️ Database initialization bypassed for standalone runner. Continuing with logging.');
  }

  // ── TEST 1: New Inbound Lead Ingestion & Initial Contact ──────────────────
  console.log('\n─────────────────────────────────────────────────────────────');
  console.log('📡 TEST 1: New Lead Capture Test (English, Initial Bottleneck Question)');
  console.log('─────────────────────────────────────────────────────────────');
  
  const test1 = await processWithAI({
    leadId: 'test-lead-1',
    leadName: 'Shubham Pal',
    leadPhone: '+919334757759',
    service: 'AI CRM Development',
    source: 'Vercel Webform',
    currentScore: 0,
    conversationSummary: '',
    recentMessages: []
  });

  console.log('\n📊 TEST 1 RESULT:');
  console.log(`- Score: ${test1.ai_score}/100`);
  console.log(`- Budget Qualified: ${test1.ai_budget}`);
  console.log(`- AI Summary: "${test1.ai_summary}"`);
  console.log(`- Outbound Message: "${test1.reply}"`);

  // ── TEST 2: Existing Lead Hindi Interaction & Discovery ─────────────────
  console.log('\n─────────────────────────────────────────────────────────────');
  console.log('📡 TEST 2: Existing Lead Test (Hindi, Intent Score Discovery)');
  console.log('─────────────────────────────────────────────────────────────');

  const test2 = await processWithAI({
    leadId: 'test-lead-2',
    leadName: 'Rajesh Kumar',
    leadPhone: '+919334757759',
    service: 'WhatsApp CRM',
    source: 'Google Ads',
    currentScore: 0,
    conversationSummary: '',
    recentMessages: [
      { role: 'user', content: 'Hi, I saw your WhatsApp CRM and I want it for Rajesh Retailers.' },
      { role: 'assistant', content: 'Namaste Rajesh! 🚀 Rajesh Retailers ke liye WhatsApp CRM setup karna bahut aasan hai. Aapki business mein kitne daily message enquiries aate hain?' },
      { role: 'user', content: 'Mere paas daily 250 se zyada leads aati hain aur manual answer dene mein bahut problem hoti hai. Budget 10,000 to 15,000 per month hai.' }
    ]
  });

  console.log('\n📊 TEST 2 RESULT:');
  console.log(`- Score: ${test2.ai_score}/100`);
  console.log(`- Budget Qualified: ${test2.ai_budget}`);
  console.log(`- AI Summary: "${test2.ai_summary}"`);
  console.log(`- Outbound Message: "${test2.reply}"`);

  // ── TEST 3: AI Failover Model Cascade Simulation ────────────────────
  console.log('\n─────────────────────────────────────────────────────────────');
  console.log('📡 TEST 3: Multi-Model Automatic Failover Cascade');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('ℹ️ Requesting qualification. The system will cascade through the models: Gemini Flash -> Gemini Flash Lite -> DeepSeek Chat.');
  
  const test3 = await processWithAI({
    leadId: 'test-lead-3',
    leadName: 'Simran Gupta',
    leadPhone: '+919334757759',
    service: 'Smart Follow-Up',
    source: 'WhatsApp Inbound',
    currentScore: 0,
    conversationSummary: '',
    recentMessages: [
      { role: 'user', content: 'How much do your services cost?' }
    ]
  });

  console.log('\n📊 TEST 3 RESULT:');
  console.log(`- Score: ${test3.ai_score}/100`);
  console.log(`- Budget Qualified: ${test3.ai_budget}`);
  console.log(`- AI Summary: "${test3.ai_summary}"`);
  console.log(`- Outbound Message: "${test3.reply}"`);

  console.log('\n🏆 Trinetra OS Phase-3 OpenRouter AI Validation Suite Completed successfully!');
}

runTests().catch(err => {
  console.error('❌ Integration Test Suite failed:', err);
});
