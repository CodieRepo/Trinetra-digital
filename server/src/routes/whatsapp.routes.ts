import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import { WhatsAppController } from '../controllers/whatsapp.controller';

const router = Router();

router.get('/status', authenticateJWT, WhatsAppController.getStatus);
router.get('/qr', authenticateJWT, WhatsAppController.getQr);
router.post('/restart', authenticateJWT, WhatsAppController.restart);
router.get('/backups', authenticateJWT, WhatsAppController.listBackups);
router.post('/rollback', authenticateJWT, WhatsAppController.rollbackBackup);

export default router;
