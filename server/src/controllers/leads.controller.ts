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

      // Enforce strict duplicate phone lead prevention
      let existingLead = await LeadModel.findByPhone(formattedPhone);
      if (existingLead) {
        console.log(`👤 Lead already exists with phone: ${formattedPhone} (ID: ${existingLead.id}). Updating details instead of creating a duplicate!`);
        await LeadModel.update(existingLead.id, {
          name: name.trim(),
          email: email ? email.trim() : existingLead.email,
          company: company ? company.trim() : existingLead.company,
          service: service ? service.trim() : existingLead.service,
          source: source || existingLead.source,
          ai_enabled: 1 // Re-enable AI
        });
        
        // Audit Logging
        await logAuditAction('LEAD_UPDATE', `Merged/Updated existing lead "${name}" (${formattedPhone}) from ${source || 'website'}`);

        // Trigger AI Re-qualification asynchronously
        setImmediate(async () => {
          try {
            const aiStart = performance.now();
            console.log(`🤖 Triggering Gemini AI qualification loop for existing lead: ${name}...`);
            
            let aiResult;
            try {
              aiResult = await qualifyLead(name, service || 'AI Automation', source || 'website', []);
            } catch (err) {
              console.error(`❌ AI qualification error for existing lead ${name}:`, err);
              aiResult = {
                ai_score: 50,
                ai_budget: false,
                ai_summary: "Intake evaluation in progress. Awaiting further customer responses.",
                suggested_reply: `Thank you for contacting Trinetra Digital Solution.\n\nWe've received your inquiry and our team will review it shortly.\n\nPlease share:\n• Business Name\n• Industry\n• Approximate monthly leads\n\nWe will get back to you as soon as possible.`
              };
            }
            const aiDuration = (performance.now() - aiStart).toFixed(2);
            console.log(`🤖 AI Qualification completed in: ${aiDuration}ms. Score: ${aiResult.ai_score}`);

            await LeadModel.update(existingLead!.id, {
              ai_score: aiResult.ai_score,
              ai_budget: aiResult.ai_budget,
              ai_summary: aiResult.ai_summary,
              status: 'ai_qualifying'
            });

            console.log(`📤 Sending initial WhatsApp message to ${name} (${formattedPhone})...`);
            const sent = await sendWhatsAppMessage(formattedPhone, aiResult.suggested_reply);
            if (sent) {
              await LeadModel.update(existingLead!.id, { status: 'qualified' });
              await logAuditAction('WHATSAPP_SEND', `Sent automated initial qualification response to ${name}`);
              await scheduleNurtureSequence(existingLead!.id);
            }
          } catch (err) {
            console.error(`❌ Background existing lead processor error for ${name}:`, err);
          }
        });

        const apiDuration = (performance.now() - apiStart).toFixed(2);
        console.log(`⏱️ API POST /api/leads response completed in: ${apiDuration}ms`);
        return res.status(200).json({
          success: true,
          message: 'Lead already exists. Details merged and queued for qualification.',
          leadId: existingLead.id
        });
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

      // Notify admin team about new lead
      import('../services/notification.service').then(({ notifyNewLead }) => {
        notifyNewLead({
          name: name.trim(),
          phone: formattedPhone,
          source: source || 'website',
          service: service ? service.trim() : 'AI Automation Solutions',
          company: company ? company.trim() : undefined,
        }).catch(err => console.warn('⚠️ [NOTIFY] New lead notification failed:', err));
      }).catch(err => console.warn('⚠️ [NOTIFY] Failed to import notification service:', err));

      // Trigger asynchronous AI processing
      setImmediate(async () => {
        try {
          const aiStart = performance.now();
          console.log(`🤖 Triggering Gemini AI qualification loop for lead: ${name}...`);
          
          let aiResult;
          try {
            aiResult = await qualifyLead(name, service || 'AI Automation', source || 'website', []);
          } catch (err) {
            console.error(`❌ AI qualification error for lead ${name}:`, err);
            aiResult = {
              ai_score: 50,
              ai_budget: false,
              ai_summary: "Intake evaluation in progress. Awaiting further customer responses.",
              suggested_reply: `Thank you for contacting Trinetra Digital Solution.\n\nWe've received your inquiry and our team will review it shortly.\n\nPlease share:\n• Business Name\n• Industry\n• Approximate monthly leads\n\nWe will get back to you as soon as possible.`
            };
          }
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

      const db = getDb();
      const followup = await db.get(
        'SELECT * FROM followup_sequences WHERE lead_id = ? ORDER BY created_at DESC LIMIT 1',
        [id]
      );

      return res.json({ lead, chats, followup: followup || null });
    } catch (error) {
      console.error('Get lead details error:', error);
      return res.status(500).json({ error: 'Internal server error fetching lead details' });
    }
  },

  // Protected: Modify lead
  async updateLead(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const { status, ai_score, notes, name, email, company, ai_enabled } = req.body;

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
      if (ai_enabled !== undefined) updates.ai_enabled = ai_enabled;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No fields provided for modification' });
      }

      await LeadModel.update(id, updates);

      // Audit Log for AI pause/resume
      if (ai_enabled !== undefined) {
        await logAuditAction(
          ai_enabled === 1 ? 'AI_RESUME' : 'AI_PAUSE',
          `AI automation status updated to ${ai_enabled === 1 ? 'ENABLED' : 'PAUSED'} for lead "${lead.name}"`
        );
      }

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
        // Automatic human takeover logic:
        await LeadModel.update(id, { ai_enabled: 0 });
        const db = getDb();
        await db.run(
          "UPDATE followup_sequences SET status = 'paused' WHERE lead_id = ? AND status = 'active'",
          [id]
        );

        // Create a handoff alert so the CRM shows it
        const alertId = `alert-${Date.now()}`;
        await db.run(
          "INSERT OR IGNORE INTO handoff_alerts (id, lead_id, reason, status) VALUES (?, ?, ?, 'pending')",
          [alertId, id, 'Manual operator message sent — AI auto-paused']
        );

        await logAuditAction('WHATSAPP_SEND', `Sent manual WhatsApp response to ${lead.name}`);
        await logAuditAction('HUMAN_TAKEOVER', `AI paused for ${lead.name} after manual message.`);
        
        return res.json({ success: true, message: 'WhatsApp message sent successfully' });
      } else {
        return res.status(502).json({ error: 'Failed to send WhatsApp message. Client is disconnected.' });
      }
    } catch (error) {
      console.error('Manual message error:', error);
      return res.status(500).json({ error: 'Internal server error dispatching message' });
    }
  },

  // ── GET /api/leads/handoffs — List all handoff alerts (pending + recent resolved)
  async listHandoffs(req: Request, res: Response) {
    try {
      const db = getDb();
      const rows = await db.all(`
        SELECT 
          h.id, h.lead_id, h.reason, h.status, h.created_at,
          l.name AS lead_name, l.phone AS lead_phone,
          l.ai_enabled, l.ai_score, l.company
        FROM handoff_alerts h
        LEFT JOIN leads l ON l.id = h.lead_id
        ORDER BY h.created_at DESC
        LIMIT 50
      `);
      return res.json({ success: true, data: rows });
    } catch (err: any) {
      console.error('listHandoffs error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  // ── POST /api/leads/:id/resolve-handoff — Resolve alert + re-enable AI
  async resolveHandoff(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const db = getDb();
      const lead = await db.get('SELECT id, name FROM leads WHERE id = ?', [id]);
      if (!lead) return res.status(404).json({ error: 'Lead not found' });

      // Resolve all pending handoff alerts for this lead
      await db.run(
        "UPDATE handoff_alerts SET status = 'resolved' WHERE lead_id = ? AND status = 'pending'",
        [id]
      );

      // Re-enable AI auto-reply
      await db.run(
        'UPDATE leads SET ai_enabled = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );

      // Resume any paused follow-up sequences
      await db.run(
        "UPDATE followup_sequences SET status = 'active' WHERE lead_id = ? AND status = 'paused'",
        [id]
      );

      await logAuditAction('HANDOFF_RESOLVED',
        `Handoff resolved for ${lead.name} (${id}). AI re-enabled by operator.`
      );

      console.log(`✅ [HANDOFF] AI re-enabled for lead ${lead.name} (${id})`);
      return res.json({
        success: true,
        message: `AI re-enabled for ${lead.name}. Conversation will resume automatically.`,
      });
    } catch (err: any) {
      console.error('resolveHandoff error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  // ── PATCH /api/leads/:id/toggle-ai — Manually enable or disable AI for a lead
  async toggleAI(req: Request, res: Response) {
    const { id } = req.params;
    const { ai_enabled } = req.body;

    if (ai_enabled === undefined) {
      return res.status(400).json({ error: 'ai_enabled (true/false) is required in request body' });
    }

    try {
      const db = getDb();
      const lead = await db.get('SELECT id, name FROM leads WHERE id = ?', [id]);
      if (!lead) return res.status(404).json({ error: 'Lead not found' });

      const value = ai_enabled ? 1 : 0;
      await db.run(
        'UPDATE leads SET ai_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [value, id]
      );

      if (ai_enabled) {
        // Also resolve any pending handoffs when manually enabling
        await db.run(
          "UPDATE handoff_alerts SET status = 'resolved' WHERE lead_id = ? AND status = 'pending'",
          [id]
        );
      }

      await logAuditAction('AI_TOGGLE',
        `AI ${ai_enabled ? 'enabled' : 'disabled'} manually for ${lead.name} (${id})`
      );

      return res.json({
        success: true,
        ai_enabled: value,
        message: `AI ${ai_enabled ? 'enabled' : 'disabled'} for ${lead.name}`,
      });
    } catch (err: any) {
      console.error('toggleAI error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  },
};

