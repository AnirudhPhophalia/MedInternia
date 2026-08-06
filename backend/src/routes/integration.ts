import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';
import { exportBadges } from '../controllers/integrationController';

const router = Router();

router.post(
  '/:provider/export',
  authenticate,
  requirePermission('import:run'),
  exportBadges,
);

export default router;
