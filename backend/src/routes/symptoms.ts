import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { extractSymptomsFromText } from '../controllers/symptomExtractionController';

const router = Router();

router.post('/extract', authenticate, extractSymptomsFromText);

export default router;
