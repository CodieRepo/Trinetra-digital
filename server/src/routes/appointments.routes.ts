/**
 * appointments.routes.ts
 * REST endpoints for appointment management in Trinetra CRM
 */

import { Router, Request, Response } from 'express';
import { getDb, logAuditAction } from '../database/connection';
import { authenticateJWT } from '../middleware/auth';


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
    console.error('âŒ [APPOINTMENTS] DELETE failed:', err);
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
});

// â”€â”€â”€ GET /api/appointments/pending-count â€” Quick count for dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

export default router;

