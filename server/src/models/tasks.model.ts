import { getDb } from '../database/connection';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TaskType =
  | 'HUMAN_HANDOFF_TASK'
  | 'QUOTATION_TASK'
  | 'APPOINTMENT_TASK'
  | 'FOLLOWUP_REMINDER';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface TaskDTO {
  id: string;
  lead_id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  type: TaskType;
  due_at?: string | null;
  created_at?: string;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function genId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

// ─── Model ────────────────────────────────────────────────────────────────────

export const TaskModel = {

  async findByLead(leadId: string): Promise<TaskDTO[]> {
    const db = getDb();
    return db.all<TaskDTO[]>(
      'SELECT * FROM tasks WHERE lead_id = ? ORDER BY created_at DESC',
      [leadId]
    );
  },

  async findById(id: string): Promise<TaskDTO | undefined> {
    const db = getDb();
    return db.get<TaskDTO>('SELECT * FROM tasks WHERE id = ?', [id]);
  },

  async create(data: Omit<TaskDTO, 'id' | 'created_at'>): Promise<TaskDTO> {
    const db = getDb();
    const id = genId();
    await db.run(
      `INSERT INTO tasks (id, lead_id, title, description, status, type, due_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, data.lead_id, data.title, data.description ?? null, data.status, data.type, data.due_at ?? null]
    );
    console.log(`📋 [TASKS] Created task "${data.title}" (${data.type}) for lead ${data.lead_id}`);
    return { id, ...data };
  },

  async updateStatus(id: string, status: TaskStatus): Promise<void> {
    const db = getDb();
    await db.run('UPDATE tasks SET status = ? WHERE id = ?', [status, id]);
    console.log(`📋 [TASKS] Task ${id} status → ${status}`);
  },

  async existsForLead(leadId: string, type: TaskType): Promise<boolean> {
    const db = getDb();
    const row = await db.get<{ count: number }>(
      "SELECT COUNT(*) as count FROM tasks WHERE lead_id = ? AND type = ? AND status = 'pending'",
      [leadId, type]
    );
    return (row?.count ?? 0) > 0;
  },

  // ── Auto-task spawners ──────────────────────────────────────────────────────

  async spawnHandoffTask(leadId: string, leadName: string, reason: string): Promise<void> {
    const alreadyExists = await TaskModel.existsForLead(leadId, 'HUMAN_HANDOFF_TASK');
    if (alreadyExists) {
      console.log(`📋 [TASKS] Handoff task already exists for lead ${leadId}. Skipping.`);
      return;
    }
    const dueAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours
    await TaskModel.create({
      lead_id: leadId,
      title: `Follow up with ${leadName} — Human Handoff Required`,
      description: `AI handed off this lead. Reason: ${reason}. Please contact the lead within 2 hours.`,
      status: 'pending',
      type: 'HUMAN_HANDOFF_TASK',
      due_at: dueAt,
    });
  },

  async spawnQuotationTask(leadId: string, leadName: string, serviceInterest?: string): Promise<void> {
    const alreadyExists = await TaskModel.existsForLead(leadId, 'QUOTATION_TASK');
    if (alreadyExists) {
      console.log(`📋 [TASKS] Quotation task already exists for lead ${leadId}. Skipping.`);
      return;
    }
    const dueAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
    await TaskModel.create({
      lead_id: leadId,
      title: `Prepare Quotation for ${leadName}`,
      description: `Lead requested pricing/quotation details${serviceInterest ? ` for: ${serviceInterest}` : ''}. Prepare and send a tailored quote.`,
      status: 'pending',
      type: 'QUOTATION_TASK',
      due_at: dueAt,
    });
  },

  async spawnAppointmentTask(leadId: string, leadName: string): Promise<void> {
    const alreadyExists = await TaskModel.existsForLead(leadId, 'APPOINTMENT_TASK');
    if (alreadyExists) {
      console.log(`📋 [TASKS] Appointment task already exists for lead ${leadId}. Skipping.`);
      return;
    }
    const dueAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(); // 4 hours
    await TaskModel.create({
      lead_id: leadId,
      title: `Schedule Demo / Consultation with ${leadName}`,
      description: `Lead requested an appointment or consultation call. Book a slot and confirm with the lead.`,
      status: 'pending',
      type: 'APPOINTMENT_TASK',
      due_at: dueAt,
    });
  },
};
