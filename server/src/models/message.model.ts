import { getDb } from '../database/connection';

export interface MessageDTO {
  id: string;
  lead_id: string;
  direction: 'inbound' | 'outbound';
  body: string;
  status: string;
  timestamp?: string;
}

export interface ConversationDTO {
  id: string;
  lead_id: string;
  phone: string;
  unread_count: number;
  last_message: string | null;
  last_activity?: string;
  created_at?: string;
  // Joined fields from leads table
  lead_name?: string;
  lead_status?: string;
  ai_score?: number;
  company?: string | null;
}

export const MessageModel = {
  async findAll(): Promise<MessageDTO[]> {
    const db = getDb();
    return db.all<MessageDTO[]>('SELECT * FROM whatsapp_chats ORDER BY timestamp DESC');
  },

  async findById(id: string): Promise<MessageDTO | undefined> {
    const db = getDb();
    return db.get<MessageDTO>('SELECT * FROM whatsapp_chats WHERE id = ?', [id]);
  },

  async findByLeadId(leadId: string): Promise<MessageDTO[]> {
    const db = getDb();
    return db.all<MessageDTO[]>(
      'SELECT * FROM whatsapp_chats WHERE lead_id = ? ORDER BY timestamp ASC',
      [leadId]
    );
  },

  async create(message: MessageDTO): Promise<void> {
    const db = getDb();
    await db.run(
      `INSERT INTO whatsapp_chats (id, lead_id, direction, body, status) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        message.id,
        message.lead_id,
        message.direction,
        message.body,
        message.status || 'sent'
      ]
    );
  },

  async updateStatus(id: string, status: string): Promise<void> {
    const db = getDb();
    await db.run(
      'UPDATE whatsapp_chats SET status = ? WHERE id = ?',
      [status, id]
    );
  }
};

export const ConversationModel = {
  async findAll(): Promise<ConversationDTO[]> {
    const db = getDb();
    return db.all<ConversationDTO[]>(
      `SELECT c.*, l.name as lead_name, l.status as lead_status, l.ai_score, l.company 
       FROM conversations c 
       JOIN leads l ON c.lead_id = l.id 
       ORDER BY c.last_activity DESC`
    );
  },

  async findByLeadId(leadId: string): Promise<ConversationDTO | undefined> {
    const db = getDb();
    return db.get<ConversationDTO>('SELECT * FROM conversations WHERE lead_id = ?', [leadId]);
  },

  async findByPhone(phone: string): Promise<ConversationDTO | undefined> {
    const db = getDb();
    const cleanPhone = phone.replace(/\D/g, '');
    return db.get<ConversationDTO>(
      `SELECT * FROM conversations WHERE replace(phone, '+', '') LIKE ? OR ? LIKE '%' || replace(phone, '+', '')`,
      [`%${cleanPhone}%`, cleanPhone]
    );
  },

  async create(conv: ConversationDTO): Promise<void> {
    const db = getDb();
    await db.run(
      `INSERT INTO conversations (id, lead_id, phone, unread_count, last_message, last_activity) 
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [conv.id, conv.lead_id, conv.phone, conv.unread_count || 0, conv.last_message || null]
    );
  },

  async updateThread(leadId: string, lastMessage: string, isIncoming: boolean): Promise<void> {
    const db = getDb();
    if (isIncoming) {
      await db.run(
        `UPDATE conversations 
         SET last_message = ?, unread_count = unread_count + 1, last_activity = CURRENT_TIMESTAMP 
         WHERE lead_id = ?`,
        [lastMessage, leadId]
      );
    } else {
      await db.run(
        `UPDATE conversations 
         SET last_message = ?, unread_count = 0, last_activity = CURRENT_TIMESTAMP 
         WHERE lead_id = ?`,
        [lastMessage, leadId]
      );
    }
  },

  async resetUnread(leadId: string): Promise<void> {
    const db = getDb();
    await db.run(
      'UPDATE conversations SET unread_count = 0 WHERE lead_id = ?',
      [leadId]
    );
  }
};
