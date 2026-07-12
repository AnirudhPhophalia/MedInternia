import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  getConversations,
  getMessages,
  sendMessage
} from '../controllers/messageController';

import { messageRateLimiter } from '../middleware/otpRateLimiter';

const router = express.Router();

router.use(authenticate);

router.get('/conversations', getConversations);
router.get('/:conversationId', getMessages);
router.post('/', messageRateLimiter, sendMessage);

export default router;
