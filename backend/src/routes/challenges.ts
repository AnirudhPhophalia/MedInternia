import express from 'express';
import {
  createChallenge,
  getChallenges,
  getChallengeById,
  submitAttempt
} from '../controllers/challengeController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticate, getChallenges);
router.post('/', authenticate, createChallenge);
router.get('/:challengeId', authenticate, getChallengeById);
router.post('/:challengeId/submit', authenticate, submitAttempt);

export default router;
