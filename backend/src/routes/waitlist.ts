import { Router } from 'express';
import { addToWaitlist } from '../controllers/waitlistController';

const router = Router();

router.post('/', addToWaitlist);

export default router;
