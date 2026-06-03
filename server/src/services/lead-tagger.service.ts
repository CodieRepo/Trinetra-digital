/**
 * lead-tagger.service.ts
 * Automatic lead tagging system for Trinetra CRM
 *
 * Tags are stored as a JSON array in leads.lead_tags
 * and individually logged to lead_tags_log for audit trail.
 *
 * Tags are auto-applied after each AI conversation cycle.
 */

import { getDb, logAuditAction } from '../database/connection';

// ─── Tag definitions ──────────────────────────────────────────────────────────

export type LeadTag =
  | 'HOT_LEAD'
  | 'FIRE_LEAD'
  | 'BUDGET_CONFIRMED'
  | 'WEBSITE_INTEREST'
  | 'CRM_INTEREST'
  | 'AI_SYSTEM_INTEREST'
  | 'DIGITAL_MARKETING_INTEREST'
  | 'SEO_INTEREST'
  | 'HIGH_BUDGET'
  | 'DECISION_MAKER'
  | 'OPT_OUT'
  | 'APPOINTMENT_REQUESTED'
  | 'NEEDS_FOLLOW_UP'
  | 'ENTERPRISE'
  | 'COLD_LEAD'
  | 'WARM_LEAD'
  | 'HUMAN_HANDOFF'
  | 'PACKAGE_LAUNCH'
  | 'PACKAGE_GROWTH'
  | 'PACKAGE_AI_SALES'
  | 'PACKAGE_CUSTOM';

// ─── Tag evaluation input ─────────────────────────────────────────────────────

export interface TagInput {
  ai_score: number;
  ai_budget: boolean;
  service?: string;
  budget_range?: string;
  is_decision_maker?: boolean;
  opt_out?: boolean;
  appointment_requested?: boolean;
  team_size?: string;
  recommended_package?: string;
  lead_stage?: string;
  human_handoff?: boolean;
}

// ─── Tag assignment rules ─────────────────────────────────────────────────────

export function evaluateTags(input: TagInput): LeadTag[] {
  const tags: LeadTag[] = [];
  const svc = (input.service || '').toLowerCase();
  const budget = (input.budget_range || '').toLowerCase();

  // Score-based tags
  if (input.ai_score >= 85)       tags.push('FIRE_LEAD');
  else if (input.ai_score >= 70)  tags.push('HOT_LEAD');
  else if (input.ai_score >= 40)  tags.push('WARM_LEAD');
  else                             tags.push('COLD_LEAD');

  // Budget confirmed
  if (input.ai_budget) tags.push('BUDGET_CONFIRMED');

  // Service interest tags
  if (/website|web site|landing|portfolio|ecommerce/.test(svc))    tags.push('WEBSITE_INTEREST');
  if (/crm|lead management|sales pipeline/.test(svc))               tags.push('CRM_INTEREST');
  if (/ai|chatbot|automation|whatsapp bot|sales system/.test(svc))  tags.push('AI_SYSTEM_INTEREST');
  if (/digital marketing|social media|ads|campaign/.test(svc))      tags.push('DIGITAL_MARKETING_INTEREST');
  if (/seo|search engine|google ranking/.test(svc))                  tags.push('SEO_INTEREST');

  // Budget range
  if (/75k|75,000|lakh|1,00,000/.test(budget))  tags.push('HIGH_BUDGET');

  // Decision maker
  if (input.is_decision_maker === true) tags.push('DECISION_MAKER');

  // Opt-out
  if (input.opt_out) tags.push('OPT_OUT');

  // Appointment requested
  if (input.appointment_requested) tags.push('APPOINTMENT_REQUESTED');

  // Enterprise (team size 100+)
  if (input.team_size && /100\+|200\+|500\+/.test(input.team_size)) tags.push('ENTERPRISE');

  // Package recommendation tags
  if (input.recommended_package === 'launch')   tags.push('PACKAGE_LAUNCH');
  if (input.recommended_package === 'growth')   tags.push('PACKAGE_GROWTH');
  if (input.recommended_package === 'ai_sales') tags.push('PACKAGE_AI_SALES');
  if (input.recommended_package === 'custom')   tags.push('PACKAGE_CUSTOM');

  // Human handoff
  if (input.human_handoff) tags.push('HUMAN_HANDOFF');

  // Needs follow-up
  if (input.lead_stage === 'qualifying' && !input.human_handoff) tags.push('NEEDS_FOLLOW_UP');

  return [...new Set(tags)]; // Deduplicate
}

// ─── Apply tags to lead in database ──────────────────────────────────────────

export async function applyLeadTags(leadId: string, newTags: LeadTag[]): Promise<void> {
  if (!newTags.length) return;

  try {
    const db = getDb();

    // Load existing tags
    const lead = await db.get<{ lead_tags: string }>('SELECT lead_tags FROM leads WHERE id = ?', [leadId]);
    let existingTags: string[] = [];
    try {
      existingTags = JSON.parse(lead?.lead_tags || '[]');
    } catch {
      existingTags = [];
    }

    // Merge and deduplicate
    const allTags = [...new Set([...existingTags, ...newTags])];

    // Update lead tags
    await db.run(
      'UPDATE leads SET lead_tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [JSON.stringify(allTags), leadId]
    );

    // Log new tags individually for audit trail
    const addedTags = newTags.filter(t => !existingTags.includes(t));
    for (const tag of addedTags) {
      const logId = `tag-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await db.run(
        'INSERT INTO lead_tags_log (id, lead_id, tag) VALUES (?, ?, ?)',
        [logId, leadId, tag]
      );
    }

    if (addedTags.length > 0) {
      console.log(`🏷️ [TAGGER] Applied ${addedTags.length} new tag(s) to lead ${leadId}: ${addedTags.join(', ')}`);
      await logAuditAction('LEAD_TAGGED', `Lead ${leadId}: Added tags [${addedTags.join(', ')}]`);
    }

  } catch (err) {
    console.error('❌ [TAGGER] Failed to apply tags:', err);
  }
}

// ─── Get all tags for a lead ──────────────────────────────────────────────────

export async function getLeadTags(leadId: string): Promise<string[]> {
  try {
    const db = getDb();
    const lead = await db.get<{ lead_tags: string }>('SELECT lead_tags FROM leads WHERE id = ?', [leadId]);
    return JSON.parse(lead?.lead_tags || '[]');
  } catch {
    return [];
  }
}
