import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import { AnalyticsController } from '../controllers/analytics.controller';

const router = Router();

router.get('/', authenticateJWT, AnalyticsController.getMetrics);

export default router;
