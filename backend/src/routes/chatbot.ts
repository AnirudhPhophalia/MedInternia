import { Router, Request, Response } from 'express';
import { getChatbotResponse } from '../services/chatbotService';
import { optionalAuthenticate } from '../middleware/auth';
import { chatbotLimiter } from '../middleware/otpRateLimiter';

const router = Router();

router.post('/', optionalAuthenticate, chatbotLimiter, async (req: Request, res: Response) => {
  const { message } = req.body;

  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ error: 'Message is required.' });
  }

  if (message.length > 500) {
    return res.status(400).json({ error: 'Message is too long. Maximum 500 characters allowed.' });
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