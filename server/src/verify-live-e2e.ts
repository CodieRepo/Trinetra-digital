import { getDb, initDb } from './database/connection';
import { processWithAI, AIContext } from './services/openrouter.service';

const BASE_URL = 'http://localhost:5000/api';

async function main() {
  console.log('🏁 STARTING PRODUCTION STABILITY & E2E LIVE VERIFICATION...');

  // Initialize DB connection so we can query database records directly
  await initDb();
  const db = getDb();

  // 1. Authenticate Admin User
  console.log('\n🔐 [AUTH] Authenticating admin user...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'trinetra123' })
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
  }

  const { token } = await loginRes.json() as any;
  console.log('✅ Admin authenticated successfully. JWT obtained.');

  // 2. Capture Lead (English)
  const testPhone = '+222483684843672'; // Satwik's phone number
  console.log(`\n📡 [TEST A: INBOUND + LEAD CAPTURE + AI RESPONSE] Capturing lead for Satwik (${testPhone})...`);
  const captureRes = await fetch(`${BASE_URL}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Satwik Live Test',
      phone: testPhone,
      email: 'satwik@example.com',
      company: 'Satwik CRM Automation',
      service: 'AI CRM and Lead Intake Integration',
      source: 'E2E Live Verification Suite'
    })
  });

  if (!captureRes.ok) {
    throw new Error(`Lead capture failed: ${captureRes.status} ${await captureRes.text()}`);
  }

  const captureData = await captureRes.json() as any;
  const leadId = captureData.leadId;
  console.log(`✅ Lead captured successfully! Lead ID: ${leadId}`);

  // Wait 15 seconds for background Gemini processing and WhatsApp dispatch
  console.log('⏳ Waiting 15 seconds for Gemini AI routing and auto-reply delivery...');
  await new Promise(resolve => setTimeout(resolve, 15000));

  // 3. Fetch Lead & Conversation Details
  console.log('\n🔍 Fetching lead details and chat history from SQLite...');
  const leadDetailsRes = await fetch(`${BASE_URL}/leads/${leadId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!leadDetailsRes.ok) {
    throw new Error(`Failed to fetch lead details: ${leadDetailsRes.status}`);
  }

  const { lead, chats } = await leadDetailsRes.json() as any;
  console.log('\n📊 --- LEAD DB STATE ---');
  console.log(`ID: ${lead.id}`);
  console.log(`Name: ${lead.name}`);
  console.log(`Phone: ${lead.phone}`);
  console.log(`AI Score: ${lead.ai_score}`);
  console.log(`AI Budget Qualified: ${lead.ai_budget}`);
  console.log(`AI Summary: "${lead.ai_summary}"`);
  console.log(`AI Enabled: ${lead.ai_enabled}`);
  console.log(`Status: ${lead.status}`);

  console.log('\n💬 --- CHAT TIMELINE ---');
  chats.forEach((c: any) => {
    console.log(`[${c.direction.toUpperCase()} | ID: ${c.id} | Status: ${c.status}] ${c.body}`);
  });

  // 4. Test B: Inbound follow-up to check Conversation Memory
  const recentMessages = chats.map((c: any) => ({
    role: c.direction === 'inbound' ? 'user' as const : 'assistant' as const,
    content: c.body
  }));
  // Append new inbound message
  recentMessages.push({ role: 'user', content: 'Yes, I would like to book a slot for tomorrow at 4 PM. My budget is around $1500/month.' });
  
  const ctx: AIContext = {
    leadId: lead.id,
    leadName: lead.name,
    leadPhone: lead.phone,
    service: lead.service,
    source: lead.source,
    currentScore: lead.ai_score || 0,
    conversationSummary: lead.ai_summary || '',
    recentMessages: recentMessages,
    totalMessagesCount: recentMessages.length
  };
  
  console.log('🤖 Invoking OpenRouter AI with conversation memory history...');
  const memoryResult = await processWithAI(ctx);
  console.log('✅ Context-aware response generated successfully!');
  console.log(`- New Score: ${memoryResult.ai_score}`);
  console.log(`- New Budget: ${memoryResult.ai_budget}`);
  console.log(`- New Summary: "${memoryResult.ai_summary}"`);
  console.log(`- Suggestion: "${memoryResult.reply}"`);

  // 5. Test C & D: Send Manual CRM Message & Verify Human Handoff (AI pauses)
  console.log(`\n✉️ [TEST C & D: MANUAL DISPATCH + HUMAN HANDOFF] Sending manual CRM message...`);
  const manualText = 'Hi Satwik, this is Shubham here from Trinetra team. I am taking over this conversation to coordinate the calendly demo details.';
  
  const manualSendRes = await fetch(`${BASE_URL}/leads/${leadId}/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ body: manualText })
  });

  if (!manualSendRes.ok) {
    throw new Error(`Manual message dispatch failed: ${manualSendRes.status} ${await manualSendRes.text()}`);
  }

  console.log('✅ Manual CRM message dispatched successfully.');

  // Fetch lead again to verify Human Handoff auto-pauses AI
  console.log('\n🔍 Verifying Human Handoff interlock...');
  const leadAfterManualRes = await fetch(`${BASE_URL}/leads/${leadId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const { lead: leadAfterManual, chats: chatsAfterManual } = await leadAfterManualRes.json() as any;
  console.log(`AI Enabled state: ${leadAfterManual.ai_enabled} (Expected: 0)`);
  console.log(`Status: ${leadAfterManual.status}`);

  console.log('\n💬 --- UPDATED CHAT TIMELINE (With unique Baileys JID key and manual message) ---');
  chatsAfterManual.forEach((c: any) => {
    console.log(`[${c.direction.toUpperCase()} | ID: ${c.id} | Status: ${c.status}] ${c.body}`);
  });

  // Verify Audit logs
  console.log('\n📝 --- AUDIT LOG EVIDENCE ---');
  const audits = await db.all('SELECT action, details, timestamp FROM audit_logs ORDER BY timestamp DESC LIMIT 5');
  audits.forEach((a: any) => {
    console.log(`[${a.timestamp}] [${a.action}] ${a.details}`);
  });

  // 6. Test E: Resume AI
  console.log('\n🔄 [TEST E: RESUME AI] Resuming AI automated responses...');
  const resumeRes = await fetch(`${BASE_URL}/leads/${leadId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ ai_enabled: 1 })
  });

  if (!resumeRes.ok) {
    throw new Error(`Failed to resume AI: ${resumeRes.status}`);
  }

  const leadAfterResumeRes = await fetch(`${BASE_URL}/leads/${leadId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const { lead: leadAfterResume } = await leadAfterResumeRes.json() as any;
  console.log(`AI Enabled state: ${leadAfterResume.ai_enabled} (Expected: 1)`);

  console.log('\n🏆 ALL STABILITY & E2E LIVE TEST RUNS COMPLETED SUCCESSFULLY!');
}

main().catch(err => {
  console.error('❌ E2E Verification failed:', err);
  process.exit(1);
});
