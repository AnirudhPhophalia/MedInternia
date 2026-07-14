import express from 'express';
import { authenticate } from '../middleware/auth';
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
router.post('/', sendMessage);

export default router;
