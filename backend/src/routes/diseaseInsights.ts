import express from 'express';
import { predictDiseaseInsightsHandler } from '../controllers/diseaseInsightController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

router.post('/predict', authenticate, authorize('intern'), predictDiseaseInsightsHandler);

export default router;
