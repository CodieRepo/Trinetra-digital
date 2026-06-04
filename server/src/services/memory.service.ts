/**
 * memory.service.ts
 * Rolling conversation memory for Trinetra WhatsApp AI CRM
 * 
 * - Stores compressed summaries in ai_memory table
 * - Retrieves last 10 messages only (never full history)
 * - Auto-summarizes every 20 messages using OpenRouter
 * - Builds complete context package for AI calls
 */

import { getDb, logAuditAction } from '../database/connection';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1/chat/completions';
const MAX_RECENT_MESSAGES = 10;
const SUMMARIZE_EVERY_N_MESSAGES = 20;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConversationContext {
  leadId: string;
  leadName: string;
  leadPhone: string;
  service: string;
  source: string;
  city?: string;
  company?: string;
  currentScore: number;
  conversationSummary: string;
  recentMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
  totalMessagesCount?: number;
}

// ─── Get or create memory record ──────────────────────────────────────────────

async function getMemory(leadId: string): Promise<{ summary: string; message_count: number } | null> {
  try {
    const db = getDb();
    return await db.get(
      'SELECT summary, message_count FROM ai_memory WHERE lead_id = ?',
      [leadId]
    ) || null;
  } catch {
    return null;
  }
}

async function saveMemory(leadId: string, summary: string, messageCount: number): Promise<void> {
  try {
    const db = getDb();
    const existing = await db.get('SELECT id FROM ai_memory WHERE lead_id = ?', [leadId]);
    if (existing) {
      await db.run(
        'UPDATE ai_memory SET summary = ?, message_count = ?, last_updated = CURRENT_TIMESTAMP WHERE lead_id = ?',
        [summary, messageCount, leadId]
      );
    } else {
      await db.run(
        'INSERT INTO ai_memory (id, lead_id, summary, message_count) VALUES (?, ?, ?, ?)',
        [`mem-${leadId}`, leadId, summary, messageCount]
      );
    }
  } catch (err) {
    console.error('⚠️ [MEMORY] Failed to save memory:', err);
  }
}

// ─── Auto-summarize when message count hits threshold ─────────────────────────

async function summarizeConversation(
  leadName: string,
  messages: Array<{ direction: string; body: string }>
): Promise<string> {
  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY.length < 20) {
    return `Conversation with ${leadName}. AI summarization unavailable.`;
  }

  const transcript = messages
    .slice(-SUMMARIZE_EVERY_N_MESSAGES)
    .map(m => `${m.direction === 'inbound' ? 'Customer' : 'Trinetra AI'}: ${m.body}`)
    .join('\n');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    const res = await fetch(OPENROUTER_BASE, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite', // cheapest model for summarization
        messages: [
          {
            role: 'system',
            content: 'You are a CRM assistant. Summarize the following WhatsApp conversation in 2-3 sentences. Focus on: what the customer needs, their business, any budget/urgency mentioned, and current interest level. Be concise.',
          },
          { role: 'user', content: `Conversation:\n${transcript}` },
        ],
        temperature: 0.3,
        max_tokens: 150, // very low — summaries are short
      }),
    });

    clearTimeout(timeout);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as any;
    const summary = data.choices?.[0]?.message?.content?.trim() || '';
    
    if (summary) {
      await logAuditAction('MEMORY_SUMMARIZE', `Auto-summarized conversation for ${leadName} (${messages.length} msgs).`);
      return summary;
    }
  } catch (err: any) {
    console.warn('⚠️ [MEMORY] Summarization failed:', err?.message);
  }

  return `Ongoing conversation with ${leadName}. Customer has been engaged over ${messages.length} messages.`;
}

// ─── Build full context for AI call ──────────────────────────────────────────

export async function buildContext(leadId: string): Promise<ConversationContext | null> {
  try {
    const db = getDb();

    // Load lead profile
    const lead = await db.get('SELECT * FROM leads WHERE id = ?', [leadId]);
    if (!lead) return null;

    // Load all messages
    const allMessages = await db.all(
      'SELECT direction, body FROM whatsapp_chats WHERE lead_id = ? ORDER BY timestamp ASC',
      [leadId]
    );

    const totalCount = allMessages.length;

    // Load stored memory
    let memory = await getMemory(leadId);
    let summary = memory?.summary || '';
    const lastSummarizedCount = memory?.message_count || 0;

    // Auto-summarize if we've accumulated 20+ new messages since last summary
    if (totalCount - lastSummarizedCount >= SUMMARIZE_EVERY_N_MESSAGES && totalCount >= SUMMARIZE_EVERY_N_MESSAGES) {
      console.log(`📝 [MEMORY] Auto-summarizing conversation for ${lead.name} (${totalCount} total messages)`);
      summary = await summarizeConversation(lead.name, allMessages);
      await saveMemory(leadId, summary, totalCount);
    } else if (!summary && totalCount > 5) {
      // Build basic summary ONLY from inbound messages (never from old outbound AI replies)
      // Outbound messages from old AI may contain stale/wrong branding — exclude them
      const inboundOnly = allMessages.filter(m => m.direction === 'inbound');
      const inboundText = inboundOnly.slice(-3).map(m => m.body).join('; ');
      summary = `${lead.name} contacted via ${lead.source || 'whatsapp'}.` +
        (lead.company ? ` Company: ${lead.company}.` : '') +
        (inboundText ? ` Recent messages: "${inboundText}".` : ` ${totalCount} messages exchanged.`);
    }

    // Get last 10 messages ONLY for the AI context
    const recentRaw = allMessages.slice(-MAX_RECENT_MESSAGES);
    const recentMessages = recentRaw.map(m => ({
      role: (m.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.body,
    }));

    const ctx = {
      leadId: lead.id,
      leadName: lead.name,
      leadPhone: lead.phone,
      service: lead.service || '',          // empty = 'Not yet specified' in prompt
      source: lead.source || 'whatsapp',
      city: lead.city || undefined,
      company: lead.company || undefined,
      currentScore: lead.ai_score || 0,
      conversationSummary: summary,
      recentMessages,
      totalMessagesCount: totalCount,
    };

    // ── Diagnostic log: verify what context the AI actually receives
    console.log(`🔍 [CONTEXT] ${lead.name} | service='${ctx.service || 'Not yet specified'}' | summary='${(ctx.conversationSummary || '').substring(0,120)}' | msgs=${recentMessages.length}`);

    return ctx;

  } catch (err) {
    console.error('❌ [MEMORY] buildContext failed:', err);
    return null;
  }
}

// ─── Update memory after AI response ─────────────────────────────────────────

export async function updateMemoryAfterResponse(
  leadId: string,
  newSummary: string
): Promise<void> {
  try {
    const db = getDb();
    const count = await db.get(
      'SELECT COUNT(*) as c FROM whatsapp_chats WHERE lead_id = ?',
      [leadId]
    );
    await saveMemory(leadId, newSummary, count?.c || 0);
  } catch (err) {
    console.error('⚠️ [MEMORY] updateMemoryAfterResponse failed:', err);
  }
}
