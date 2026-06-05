import { Router } from 'express';
import { QuotationsController } from '../controllers/quotations.controller';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// ─── Public (unprotected) ──────────────────────────────────────────────────────
// Public link tracking & direct PDF inline view
router.get('/public/:id/view', QuotationsController.publicTrackAndView);

// ─── Protected (JWT required) ──────────────────────────────────────────────────
router.get('/', authenticateJWT, QuotationsController.getQuotations);
router.get('/conversion-stats', authenticateJWT, QuotationsController.getStats);
router.get('/:id/versions', authenticateJWT, QuotationsController.getVersionChain);
router.get('/:id/pdf', authenticateJWT, QuotationsController.downloadPdf);
router.get('/:id', authenticateJWT, QuotationsController.getQuotationById);
router.post('/', authenticateJWT, QuotationsController.createQuotation);
router.post('/:id/revise', authenticateJWT, QuotationsController.reviseQuotation);
router.post('/:id/send', authenticateJWT, QuotationsController.sendQuotation);
router.post('/:id/accept', authenticateJWT, QuotationsController.acceptQuotation);
router.post('/:id/reject', authenticateJWT, QuotationsController.rejectQuotation);

export default router;
