/**
 * appointments.routes.ts
 * REST endpoints for appointment management in Trinetra CRM
 */

import { Router, Request, Response } from 'express';
import { getDb, logAuditAction } from '../database/connection';
import { authenticateJWT } from '../middleware/auth';
import { sendWhatsAppMessage } from '../whatsapp/gateway';
import { logTimelineEvent } from '../services/timeline.service';

const router = Router();

// â”€â”€â”€ GET /api/appointments â€” List all appointments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

router.get('/', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { status, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT a.*, l.name as lead_name, l.phone as lead_phone, l.company as lead_company,
             l.service as lead_service, l.ai_score as lead_score
      FROM appointments a
      JOIN leads l ON a.lead_id = l.id
    `;
    const params: any[] = [];

    if (status) {
      query += ' WHERE a.status = ?';
      params.push(status);
    }

    query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const appointments = await db.all(query, params);
    const total = await db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM appointments${status ? ' WHERE status = ?' : ''}`,
      status ? [status] : []
    );

    res.json({ appointments, total: total?.count || 0 });
  } catch (err) {
    console.error('âŒ [APPOINTMENTS] GET failed:', err);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// â”€â”€â”€ POST /api/appointments â€” Create appointment â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

router.post('/', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { lead_id, preferred_date, preferred_time, call_type = 'call', notes } = req.body;

    if (!lead_id) {
      return res.status(400).json({ error: 'lead_id is required' });
    }

    // Verify lead exists
    const lead = await db.get('SELECT id FROM leads WHERE id = ?', [lead_id]);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const id = 'appt-' + Date.now();
    await db.run(
      `INSERT INTO appointments (id, lead_id, preferred_date, preferred_time, call_type, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [id, lead_id, preferred_date || null, preferred_time || null, call_type, notes || null]
    );

    // Mark lead as appointment_requested
    await db.run(
      'UPDATE leads SET appointment_requested = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [lead_id]
    );

    await logAuditAction('APPOINTMENT_CREATED',
      `Appointment created for lead ${lead_id}. Date: ${preferred_date}, Time: ${preferred_time}`
    );

    res.status(201).json({ id, message: 'Appointment created successfully' });
  } catch (err) {
    console.error('âŒ [APPOINTMENTS] POST failed:', err);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// â”€â”€â”€ PATCH /api/appointments/:id â€” Update appointment status â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

router.patch('/:id', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { status, admin_notes, preferred_date, preferred_time, call_type } = req.body;

    const appt = await db.get('SELECT id FROM appointments WHERE id = ?', [id]);
    if (!appt) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const updates: Record<string, any> = {};
    if (status) updates.status = status;
    if (admin_notes) updates.admin_notes = admin_notes;
    if (preferred_date) updates.preferred_date = preferred_date;
    if (preferred_time) updates.preferred_time = preferred_time;
    if (call_type) updates.call_type = call_type;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    await db.run(
      `UPDATE appointments SET ${setClauses} WHERE id = ?`,
      [...Object.values(updates), id]
    );

    await logAuditAction('APPOINTMENT_UPDATED', `Appointment ${id} updated: ${JSON.stringify(updates)}`);
    res.json({ message: 'Appointment updated successfully' });
  } catch (err) {
    console.error('âŒ [APPOINTMENTS] PATCH failed:', err);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// â”€â”€â”€ DELETE /api/appointments/:id â€” Cancel appointment â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

router.delete('/:id', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const appt = await db.get('SELECT id FROM appointments WHERE id = ?', [id]);
    if (!appt) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    await db.run("UPDATE appointments SET status = 'cancelled' WHERE id = ?", [id]);
    await logAuditAction('APPOINTMENT_CANCELLED', `Appointment ${id} cancelled.`);

    res.json({ message: 'Appointment cancelled successfully' });
  } catch (err) {
    console.error('❌ [APPOINTMENTS] DELETE failed:', err);
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
});

// ——————————————————————————————————————————————————————————————

router.get('/pending-count', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const result = await db.get<{ count: number }>(
      "SELECT COUNT(*) as count FROM appointments WHERE status = 'pending'"
    );
    res.json({ count: result?.count || 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get count' });
  }
});

// ─── GET /api/appointments/slots — List available slots ───
router.get('/slots', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const slots = await db.all('SELECT * FROM appointment_slots ORDER BY slot_date ASC, slot_time ASC');
    res.json(slots);
  } catch (err) {
    console.error('❌ [SLOTS] GET failed:', err);
    res.status(500).json({ error: 'Failed to fetch slots' });
  }
});

// ─── POST /api/appointments/slots — Create slot ───
router.post('/slots', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { slot_date, slot_time, duration_mins = 30 } = req.body;

    if (!slot_date || !slot_time) {
      return res.status(400).json({ error: 'slot_date and slot_time are required' });
    }

    const id = 'slot-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5);
    await db.run(
      `INSERT INTO appointment_slots (id, slot_date, slot_time, duration_mins, is_available)
       VALUES (?, ?, ?, ?, 1)`,
      [id, slot_date, slot_time, duration_mins]
    );

    await logAuditAction('SLOT_CREATED', `Slot created at ${slot_date} ${slot_time}`);
    res.status(201).json({ id, message: 'Slot created successfully' });
  } catch (err) {
    console.error('❌ [SLOTS] POST failed:', err);
    res.status(500).json({ error: 'Failed to create slot' });
  }
});

// ─── DELETE /api/appointments/slots/:id — Remove slot ───
router.delete('/slots/:id', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const slot = await db.get('SELECT id FROM appointment_slots WHERE id = ?', [id]);
    if (!slot) {
      return res.status(404).json({ error: 'Slot not found' });
    }

    await db.run('DELETE FROM appointment_slots WHERE id = ?', [id]);
    await logAuditAction('SLOT_DELETED', `Slot ${id} deleted.`);
    res.json({ message: 'Slot deleted successfully' });
  } catch (err) {
    console.error('❌ [SLOTS] DELETE failed:', err);
    res.status(500).json({ error: 'Failed to delete slot' });
  }
});

// ─── POST /api/appointments/:id/confirm — Confirm appointment + Send WhatsApp ───
router.post('/:id/confirm', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { meeting_link, admin_notes } = req.body;

    const appt = await db.get('SELECT * FROM appointments WHERE id = ?', [id]);
    if (!appt) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const lead = await db.get('SELECT * FROM leads WHERE id = ?', [appt.lead_id]);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const nowStr = new Date().toISOString();
    await db.run(
      `UPDATE appointments 
       SET status = 'confirmed', confirmed_at = ?, meeting_link = ?, admin_notes = ?, reminder_sent = 0 
       WHERE id = ?`,
      [nowStr, meeting_link || null, admin_notes || null, id]
    );

    // If slot exists for the same date/time, mark it booked
    if (appt.preferred_date && appt.preferred_time) {
      await db.run(
        `UPDATE appointment_slots 
         SET is_available = 0, booked_by_lead_id = ? 
         WHERE slot_date = ? AND slot_time = ?`,
        [appt.lead_id, appt.preferred_date, appt.preferred_time]
      );
    }

    // Format & send WhatsApp confirmation alert to lead
    const confirmMessage = `Namaste ${lead.name} ji! 🙏

Aapka demo session successfully schedule aur confirm ho gaya hai!

📅 Date: ${new Date(appt.preferred_date).toLocaleDateString('en-IN')}
⏰ Time: ${appt.preferred_time}
💻 Zoom / Google Meet Link: ${meeting_link || 'Hum aapse directly audio call par connect karenge.'}

Agar aapko time change karna ho, toh please reply karke batayein.

Trinetra Digital Solution
Gorakhpur, UP`.trim();

    await sendWhatsAppMessage(lead.phone, confirmMessage);
    await logTimelineEvent(appt.lead_id, 'outbound', `Sent appointment confirmation alert via WhatsApp. Link: ${meeting_link || 'N/A'}`);
    await logTimelineEvent(appt.lead_id, 'stage_change', `Appointment stage: CONFIRMED`);
    await logAuditAction('APPOINTMENT_CONFIRMED', `Appointment ${id} confirmed. Lead JID: ${lead.phone}`);

    res.json({ message: 'Appointment confirmed successfully and WhatsApp sent' });
  } catch (err) {
    console.error('❌ [APPOINTMENTS] Confirm failed:', err);
    res.status(500).json({ error: 'Failed to confirm appointment' });
  }
});

// ─── POST /api/appointments/:id/complete — Complete appointment + Convert ───
router.post('/:id/complete', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { deal_value } = req.body;

    const appt = await db.get('SELECT * FROM appointments WHERE id = ?', [id]);
    if (!appt) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    await db.run(
      `UPDATE appointments 
       SET status = 'completed', deal_value = ? 
       WHERE id = ?`,
      [deal_value ? Number(deal_value) : null, id]
    );

    await logTimelineEvent(appt.lead_id, 'human_action', `Demo / Consultation call completed successfully.${deal_value ? ` Deal value recorded: ₹${deal_value}` : ''}`);
    await logTimelineEvent(appt.lead_id, 'stage_change', `Appointment stage: COMPLETED`);
    await logAuditAction('APPOINTMENT_COMPLETED', `Appointment ${id} completed. Deal: ₹${deal_value || 0}`);

    res.json({ message: 'Appointment marked completed successfully' });
  } catch (err) {
    console.error('❌ [APPOINTMENTS] Complete failed:', err);
    res.status(500).json({ error: 'Failed to complete appointment' });
  }
});

// ─── GET /api/appointments/calendar — Calendar week data ───
router.get('/calendar', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    
    // Fetch all bookings
    const appointments = await db.all(`
      SELECT a.*, l.name as lead_name, l.phone as lead_phone 
      FROM appointments a
      JOIN leads l ON a.lead_id = l.id
      ORDER BY a.preferred_date ASC, a.preferred_time ASC
    `);

    // Fetch all slot configurations
    const slots = await db.all(`
      SELECT s.*, l.name as booked_by_lead_name
      FROM appointment_slots s
      LEFT JOIN leads l ON s.booked_by_lead_id = l.id
      ORDER BY s.slot_date ASC, s.slot_time ASC
    `);

    res.json({ appointments, slots });
  } catch (err) {
    console.error('❌ [APPOINTMENTS] Calendar data failed:', err);
    res.status(500).json({ error: 'Failed to fetch calendar data' });
  }
});

// ─── GET /api/appointments/conversion-stats — Conversion funnel stats ───
router.get('/conversion-stats', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    
    const totals = await db.get<{ booked: number; completed: number; converted_val: number }>(`
      SELECT 
        COUNT(*) as booked,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(COALESCE(deal_value, 0)) as converted_val
      FROM appointments
    `);

    res.json({
      booked: totals?.booked || 0,
      completed: totals?.completed || 0,
      revenueValue: totals?.converted_val || 0
    });
  } catch (err) {
    console.error('❌ [APPOINTMENTS] Stats failed:', err);
    res.status(500).json({ error: 'Failed to fetch conversion stats' });
  }
});

export default router;
