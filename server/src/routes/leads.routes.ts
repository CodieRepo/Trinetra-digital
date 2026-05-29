import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import { leadRateLimiter } from '../middleware/rateLimiter.middleware';
import { LeadsController } from '../controllers/leads.controller';

const router = Router();

// PUBLIC: Capture lead with rate limits
router.post('/', leadRateLimiter, LeadsController.captureLead);

// PROTECTED: List, details, update, backup, and manual messages
router.get('/', authenticateJWT, LeadsController.listLeads);
router.post('/backup', authenticateJWT, LeadsController.createBackup);
router.get('/:id', authenticateJWT, LeadsController.getLeadDetails);
router.patch('/:id', authenticateJWT, LeadsController.updateLead);
router.post('/:id/message', authenticateJWT, LeadsController.sendManualMessage);

export default router;
