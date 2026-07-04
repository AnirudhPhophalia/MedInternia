import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getChatbotResponse } from '../services/chatbotService';

const router = Router();

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { message } = req.body;

  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ error: 'Message is required.' });
  }

  try {
    const reply = await getChatbotResponse(message.trim());
    return res.status(200).json({ reply });
  } catch (err) {
    console.error('Chatbot error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;