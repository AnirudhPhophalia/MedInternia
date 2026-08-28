import { Router } from 'express';
import {
  createFlashcard,
  getMyFlashcards,
  getDueFlashcards,
  getFlashcardStats,
  reviewFlashcard,
  deleteFlashcard
} from '../controllers/flashcardController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', createFlashcard);
router.get('/me', getMyFlashcards);
router.get('/due', getDueFlashcards);
router.get('/stats', getFlashcardStats);
router.post('/:id/review', reviewFlashcard);
router.delete('/:id', deleteFlashcard);

export default router;
