import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import { AnalyticsController } from '../controllers/analytics.controller';

const router = Router();

router.get('/',                    authenticateJWT, AnalyticsController.getMetrics);
router.get('/audit',               authenticateJWT, AnalyticsController.getAuditLogs);
router.get('/lead-funnel',         authenticateJWT, AnalyticsController.getLeadFunnel);
router.get('/package-distribution',authenticateJWT, AnalyticsController.getPackageDistribution);
router.get('/handoff-stats',       authenticateJWT, AnalyticsController.getHandoffStats);
router.get('/cost-daily',          authenticateJWT, AnalyticsController.getCostDaily);
router.get('/opt-out-rate',        authenticateJWT, AnalyticsController.getOptOutRate);

export default router;
