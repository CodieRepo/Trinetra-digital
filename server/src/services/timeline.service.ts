import { getDb } from '../database/connection';

export async function logTimelineEvent(
  leadId: string,
  eventType: 'inbound' | 'outbound' | 'ai_action' | 'human_action' | 'stage_change',
  description: string
): Promise<void> {
  try {
    const db = getDb();
    const id = `time-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    await db.run(
      'INSERT INTO lead_timeline (id, lead_id, event_type, description) VALUES (?, ?, ?, ?)',
      [id, leadId, eventType, description]
    );
    console.log(`📌 [TIMELINE] Lead ${leadId} | ${eventType.toUpperCase()} | ${description}`);
  } catch (err) {
    console.error('❌ [TIMELINE] Error writing timeline event:', err);
  }
}

export async function getLeadTimeline(leadId: string) {
  try {
    const db = getDb();
    return await db.all(
      'SELECT * FROM lead_timeline WHERE lead_id = ? ORDER BY timestamp DESC',
      [leadId]
    );
  } catch (err) {
    console.error('❌ [TIMELINE] Error reading timeline:', err);
    return [];
  }
}
