import { getDb } from '../database/connection';

export interface LeadDTO {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  company: string | null;
  service: string | null;
  source: string;
  status: string;
  ai_score: number;
  ai_budget: boolean;
  ai_summary: string | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export const LeadModel = {
  async findAll(): Promise<LeadDTO[]> {
    const db = getDb();
    return db.all<LeadDTO[]>('SELECT * FROM leads ORDER BY created_at DESC');
  },

  async findById(id: string): Promise<LeadDTO | undefined> {
    const db = getDb();
    return db.get<LeadDTO>('SELECT * FROM leads WHERE id = ?', [id]);
  },

  async findByPhone(phone: string): Promise<LeadDTO | undefined> {
    const db = getDb();
    const cleanPhone = phone.replace(/\D/g, '');
    return db.get<LeadDTO>(
      `SELECT * FROM leads WHERE replace(phone, '+', '') LIKE ? OR ? LIKE '%' || replace(phone, '+', '')`,
      [`%${cleanPhone}%`, cleanPhone]
    );
  },

  async create(lead: LeadDTO): Promise<void> {
    const db = getDb();
    await db.run(
      `INSERT INTO leads (id, name, email, phone, company, service, source, status, ai_score, ai_budget, ai_summary, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        lead.id, lead.name, lead.email, lead.phone, lead.company,
        lead.service, lead.source, lead.status, lead.ai_score,
        lead.ai_budget ? 1 : 0, lead.ai_summary, lead.notes
      ]
    );
  },

  async update(id: string, updates: Partial<LeadDTO>): Promise<void> {
    const db = getDb();
    const fields: string[] = [];
    const values: unknown[] = [];

    Object.entries(updates).forEach(([key, val]) => {
      // Map JS boolean to SQL integer
      let finalVal = val;
      if (key === 'ai_budget') {
        finalVal = val ? 1 : 0;
      }
      fields.push(`${key} = ?`);
      values.push(finalVal);
    });

    if (fields.length === 0) return;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id); // For WHERE clause

    await db.run(
      `UPDATE leads SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }
};
