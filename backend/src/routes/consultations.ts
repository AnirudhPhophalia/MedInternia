import express from 'express';
import {
  requestConsultation,
  getConsultationRequests,
  acceptConsultation,
  addConsultationMessage,
  resolveConsultation
} from '../controllers/consultationController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticate, getConsultationRequests);
router.post('/', authenticate, requestConsultation);
router.patch('/:requestId/accept', authenticate, acceptConsultation);
router.post('/:requestId/messages', authenticate, addConsultationMessage);
router.patch('/:requestId/resolve', authenticate, resolveConsultation);

export default router;
