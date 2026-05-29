import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import { WhatsAppController } from '../controllers/whatsapp.controller';

const router = Router();

router.get('/status', authenticateJWT, WhatsAppController.getStatus);
router.get('/qr', authenticateJWT, WhatsAppController.getQr);

export default router;
