import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { extractSymptomsFromText } from '../controllers/symptomExtractionController';
import { aiRateLimiter } from '../middleware/otpRateLimiter';

const router = Router();

router.post('/extract', authenticate, aiRateLimiter, extractSymptomsFromText);

export default router;
