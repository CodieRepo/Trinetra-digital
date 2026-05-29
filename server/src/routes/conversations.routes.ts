import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import { ConversationsController } from '../controllers/conversations.controller';

const router = Router();

router.get('/', authenticateJWT, ConversationsController.getConversations);
router.get('/:phone', authenticateJWT, ConversationsController.getConversationByPhone);

export default router;
