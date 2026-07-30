import express from 'express';
import { authenticate } from '../middleware/auth';
import { messageLimiter } from '../middleware/otpRateLimiter';
import {
  getConversations,
  getMessages,
  sendMessage,
  markAsRead
} from '../controllers/messageController';

const router = express.Router();

router.use(authenticate);

router.get('/conversations', getConversations);
router.patch('/:conversationId/read', markAsRead);
router.get('/:conversationId', getMessages);
// messageLimiter runs after authenticate so keyGenerator has access to req.user.
router.post('/', messageLimiter, sendMessage);

export default router;
