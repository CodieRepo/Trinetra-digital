import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import { leadRateLimiter } from '../middleware/rateLimiter.middleware';
import { LeadsController } from '../controllers/leads.controller';
import { PipelineController } from '../controllers/pipeline.controller';

const router = Router();

// PUBLIC: Capture lead with rate limits
router.post('/', leadRateLimiter, LeadsController.captureLead);

// ── Pipeline endpoints (must come BEFORE /:id to avoid param conflict) ────────
router.get('/pipeline', authenticateJWT, PipelineController.getPipeline);
router.get('/pipeline/forecast', authenticateJWT, PipelineController.getForecast);

// PROTECTED: List, details, update, backup, and manual messages
router.get('/', authenticateJWT, LeadsController.listLeads);
router.post('/backup', authenticateJWT, LeadsController.createBackup);

// ── Handoff management (must come BEFORE /:id to avoid param conflict)
router.get('/handoffs', authenticateJWT, LeadsController.listHandoffs);

router.get('/:id', authenticateJWT, LeadsController.getLeadDetails);
router.patch('/:id', authenticateJWT, LeadsController.updateLead);
router.post('/:id/message', authenticateJWT, LeadsController.sendManualMessage);

// ── Handoff resolution + AI toggle
router.post('/:id/resolve-handoff', authenticateJWT, LeadsController.resolveHandoff);
router.patch('/:id/toggle-ai', authenticateJWT, LeadsController.toggleAI);

// ── Phase 3A: Lead Timeline
router.get('/:id/timeline', authenticateJWT, LeadsController.getTimeline);

// ── Phase 3B: Tasks — per-lead list + create; task update uses top-level /tasks/:taskId
router.get('/:id/tasks', authenticateJWT, LeadsController.listTasks);
router.post('/:id/tasks', authenticateJWT, LeadsController.createTask);
router.patch('/tasks/:taskId', authenticateJWT, LeadsController.updateTask);

// ── Phase 4B: Pipeline stage movement + revenue forecasting
router.patch('/:id/stage', authenticateJWT, PipelineController.moveStage);
router.patch('/:id/probability', authenticateJWT, PipelineController.updateProbability);
router.patch('/:id/deal-values', authenticateJWT, PipelineController.updateDealValues);
router.post('/:id/sync-deal-values', authenticateJWT, PipelineController.syncDealValues);
router.get('/:id/pipeline-audit', authenticateJWT, PipelineController.getAuditTrail);

export default router;
