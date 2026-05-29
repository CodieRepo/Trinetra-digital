import { Request, Response } from 'express';
import { performance } from 'perf_hooks';
import path from 'path';
import fs from 'fs';
import { getDb, logAuditAction, resolvedDbPath } from '../database/connection';
import { AuthenticatedRequest } from '../middleware/auth';
import { qualifyLead } from '../services/ai.service';
import { sendWhatsAppMessage } from '../whatsapp/gateway';
import { scheduleNurtureSequence } from '../services/cron.service';
import { LeadModel, LeadDTO } from '../models/lead.model';
import { MessageModel, ConversationModel } from '../models/message.model';

// UUID v4 generator helper
function generateUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const LeadsController = {
  // Capture a public lead (unauthenticated, rate-limited)
  async captureLead(req: Request, res: Response) {
    const apiStart = performance.now();
    console.log(`[${new Date().toISOString()}] POST /api/leads - Request received.`);
    console.log('Payload body:', req.body);

    const { name, phone, email, company, service, source } = req.body;

    if (!name || !phone) {
      console.warn('⚠️ Rejected lead capture: missing required name or phone field.');
      const apiDuration = (performance.now() - apiStart).toFixed(2);
      console.log(`⏱️ API POST /api/leads response completed in: ${apiDuration}ms`);
      return res.status(400).json({ error: 'Name and Phone number are required fields' });
    }

    try {
      const leadId = generateUuid();
      
      // Normalize phone number to include prefix if not already present
      let formattedPhone = phone.trim();
      if (!formattedPhone.startsWith('+') && !formattedPhone.startsWith('0')) {
        if (formattedPhone.replace(/\D/g, '').length === 10) {
          formattedPhone = `+91${formattedPhone}`;
        }
      }

      console.log(`💾 Attempting to insert lead ${name} (${formattedPhone}) into SQLite DB...`);

      const insertStart = performance.now();
      
      await LeadModel.create({
        id: leadId,
        name: name.trim(),
        phone: formattedPhone,
        email: email ? email.trim() : null,
        company: company ? company.trim() : null,
        service: service ? service.trim() : 'AI Automation Solutions',
        source: source || 'website',
        status: 'new',
        ai_score: 0,
        ai_budget: false,
        ai_summary: null,
        notes: null
      });

      const insertDuration = (performance.now() - insertStart).toFixed(2);
      console.log(`✅ SQLite insertion successful in: ${insertDuration}ms for lead ID: ${leadId}`);

      // Audit Logging
      await logAuditAction('LEAD_CREATION', `Captured lead "${name}" (${formattedPhone}) from ${source || 'website'}`);

      // Trigger asynchronous AI processing
      setImmediate(async () => {
        try {
          const aiStart = performance.now();
          console.log(`🤖 Triggering Gemini AI qualification loop for lead: ${name}...`);
          
          const aiResult = await qualifyLead(name, service || 'AI Automation', source || 'website', []);
          const aiDuration = (performance.now() - aiStart).toFixed(2);
          console.log(`🤖 AI Qualification completed in: ${aiDuration}ms. Score: ${aiResult.ai_score}`);

          // Update database with AI insights
          await LeadModel.update(leadId, {
            ai_score: aiResult.ai_score,
            ai_budget: aiResult.ai_budget,
            ai_summary: aiResult.ai_summary,
            status: 'ai_qualifying'
          });

          // Send Initial WhatsApp Touchpoint
          console.log(`📤 Sending initial WhatsApp message to ${name} (${formattedPhone})...`);
          const sent = await sendWhatsAppMessage(formattedPhone, aiResult.suggested_reply);
          if (sent) {
            await LeadModel.update(leadId, {
              status: 'qualified'
            });
            
            await logAuditAction('WHATSAPP_SEND', `Sent automated initial qualification response to ${name}`);
            
            // Schedule background follow-up nurture sequence
            await scheduleNurtureSequence(leadId);
          }
        } catch (err) {
          console.error(`❌ Background lead processor error for ${name}:`, err);
        }
      });

      const apiDuration = (performance.now() - apiStart).toFixed(2);
      console.log(`⏱️ API POST /api/leads response completed in: ${apiDuration}ms`);

      return res.status(201).json({
        success: true,
        message: 'Lead captured and queued for AI qualification successfully.',
        leadId
      });

    } catch (error) {
      console.error('Lead capture error:', error);
      const apiDuration = (performance.now() - apiStart).toFixed(2);
      console.log(`⏱️ API POST /api/leads response completed in: ${apiDuration}ms`);
      return res.status(500).json({ error: 'Internal server error processing lead' });
    }
  },

  // Protected: List all leads
  async listLeads(req: AuthenticatedRequest, res: Response) {
    try {
      const leads = await LeadModel.findAll();
      return res.json(leads);
    } catch (error) {
      console.error('List leads error:', error);
      return res.status(500).json({ error: 'Internal server error fetching leads' });
    }
  },

  // Protected: Create rolling database backup
  async createBackup(req: AuthenticatedRequest, res: Response) {
    try {
      const backupDir = path.resolve(process.cwd(), './data/backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `trinetra-backup-${timestamp}.db`;
      const backupFile = path.join(backupDir, backupFileName);
      
      // Copy the active SQLite database safely
      fs.copyFileSync(resolvedDbPath, backupFile);
      console.log(`📦 Created database backup: ${backupFile}`);

      // Clean up old backups: keep only the latest 7 files to preserve VPS storage
      const files = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('trinetra-backup-') && f.endsWith('.db'))
        .map(f => ({
          name: f,
          path: path.join(backupDir, f),
          time: fs.statSync(path.join(backupDir, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time); // Newest first

      if (files.length > 7) {
        const filesToDelete = files.slice(7);
        for (const file of filesToDelete) {
          fs.unlinkSync(file.path);
          console.log(`🗑️ Deleted old rolling backup file to save VPS disk space: ${file.name}`);
        }
      }

      await logAuditAction('BACKUP_CREATION', `Created database backup: ${backupFileName}`);

      return res.json({
        success: true,
        message: 'Database backup created successfully',
        filename: backupFileName
      });
    } catch (err) {
      console.error('Database backup failed:', err);
      return res.status(500).json({ error: 'Database backup failed' });
    }
  },

  // Protected: Get single lead details + chats history
  async getLeadDetails(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;

    try {
      const lead = await LeadModel.findById(id);

      if (!lead) {
        return res.status(404).json({ error: 'Lead not found' });
      }

      // Reset unread count for this thread in database
      try {
        await ConversationModel.resetUnread(id);
      } catch (err) {
        console.warn('⚠️ Failed to reset unread badge counters:', err);
      }

      const chats = await MessageModel.findByLeadId(id);

      return res.json({ lead, chats });
    } catch (error) {
      console.error('Get lead details error:', error);
      return res.status(500).json({ error: 'Internal server error fetching lead details' });
    }
  },

  // Protected: Modify lead
  async updateLead(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const { status, ai_score, notes, name, email, company } = req.body;

    try {
      const lead = await LeadModel.findById(id);

      if (!lead) {
        return res.status(404).json({ error: 'Lead not found' });
      }

      const updates: Partial<LeadDTO> = {};

      if (status !== undefined) updates.status = status;
      if (ai_score !== undefined) updates.ai_score = ai_score;
      if (notes !== undefined) updates.notes = notes;
      if (name !== undefined) updates.name = name;
      if (email !== undefined) updates.email = email;
      if (company !== undefined) updates.company = company;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No fields provided for modification' });
      }

      await LeadModel.update(id, updates);

      return res.json({ success: true, message: 'Lead updated successfully' });
    } catch (error) {
      console.error('Modify lead error:', error);
      return res.status(500).json({ error: 'Internal server error modifying lead' });
    }
  },

  // Protected: Dispatch manual message
  async sendManualMessage(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const { body } = req.body;

    if (!body) {
      return res.status(400).json({ error: 'Message body cannot be blank' });
    }

    try {
      const lead = await LeadModel.findById(id);

      if (!lead) {
        return res.status(404).json({ error: 'Lead not found' });
      }

      console.log(`✉️ Sending manual WhatsApp to ${lead.name}: "${body}"`);
      const sent = await sendWhatsAppMessage(lead.phone, body);

      if (sent) {
        await logAuditAction('WHATSAPP_SEND', `Sent manual WhatsApp response to ${lead.name}`);
        return res.json({ success: true, message: 'WhatsApp message sent successfully' });
      } else {
        return res.status(502).json({ error: 'Failed to send WhatsApp message. Client is disconnected.' });
      }
    } catch (error) {
      console.error('Manual message error:', error);
      return res.status(500).json({ error: 'Internal server error dispatching message' });
    }
  }
};
