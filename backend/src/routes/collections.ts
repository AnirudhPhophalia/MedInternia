import { Router } from 'express';
import {
  createCollection,
  getUserCollections,
  getCollectionById,
  addCaseToCollection,
  removeCaseFromCollection
} from '../controllers/collectionController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Protect all collection routes
router.use(authenticate);

router.post('/', createCollection);
router.get('/me', getUserCollections);
router.get('/:id', getCollectionById);
router.post('/:id/cases', addCaseToCollection);
router.delete('/:id/cases/:caseId', removeCaseFromCollection);

export default router;
