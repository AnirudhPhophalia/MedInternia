import express from 'express';
import { predictDiseaseInsightsHandler } from '../controllers/diseaseInsightController';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';

const router = express.Router();

router.post('/predict', authenticate, requirePermission('analytics:read'), predictDiseaseInsightsHandler);

export default router;
