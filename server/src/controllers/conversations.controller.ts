import { Request, Response } from 'express';
import { ConversationModel, MessageModel } from '../models/message.model';
import { LeadModel } from '../models/lead.model';
import { sendWhatsAppMessage } from '../whatsapp/gateway';
import { logAuditAction } from '../database/connection';

export const ConversationsController = {
  // GET /api/conversations
  async getConversations(req: Request, res: Response) {
    try {
      const conversations = await ConversationModel.findAll();
      return res.json(conversations);
    } catch (error) {
      console.error('Failed to retrieve conversations:', error);
      return res.status(500).json({ error: 'Internal server error fetching conversations' });
    }
  },

  // GET /api/conversations/:phone
  async getConversationByPhone(req: Request, res: Response) {
    const { phone } = req.params;

    try {
      const lead = await LeadModel.findByPhone(phone);
      if (!lead) {
        return res.status(404).json({ error: 'Conversation thread not found for this phone number' });
      }

      // Reset unread count for this thread
      await ConversationModel.resetUnread(lead.id);

      // Retrieve all chat history
      const chats = await MessageModel.findByLeadId(lead.id);

      return res.json({ lead, chats });
    } catch (error) {
      console.error('Failed to retrieve conversation details:', error);
      return res.status(500).json({ error: 'Internal server error fetching conversation details' });
    }
  },

  // POST /api/send-message
  async sendGeneralMessage(req: Request, res: Response) {
    const { phone, body } = req.body;

    if (!phone || !body) {
      return res.status(400).json({ error: 'Phone number and message body are required' });
    }

    try {
      console.log(`✉️ Outbound request to send general WhatsApp message to ${phone}: "${body}"`);
      const sent = await sendWhatsAppMessage(phone, body);

      if (sent) {
        await logAuditAction('WHATSAPP_SEND', `Sent general WhatsApp message to ${phone}`);
        return res.json({ success: true, message: 'WhatsApp message sent successfully' });
      } else {
        return res.status(502).json({ error: 'Failed to send WhatsApp message. Gateway client is offline.' });
      }
    } catch (error) {
      console.error('General message sending failure:', error);
      return res.status(500).json({ error: 'Internal server error dispatching message' });
    }
  }
};
