import { Router, Request, Response } from 'express';
import { getChatbotResponse } from '../services/chatbotService';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
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