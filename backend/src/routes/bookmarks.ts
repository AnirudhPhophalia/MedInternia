import express from 'express';
import {
  createCollection,
  getMyCollections,
  addBookmark,
  removeBookmark,
  updateBookmarkNote,
  deleteCollection
} from '../controllers/bookmarkController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticate, getMyCollections);
router.post('/', authenticate, createCollection);
router.delete('/:collectionId', authenticate, deleteCollection);
router.post('/:collectionId/cases', authenticate, addBookmark);
router.delete('/:collectionId/cases/:caseId', authenticate, removeBookmark);
router.patch('/:collectionId/cases/:caseId/note', authenticate, updateBookmarkNote);

export default router;
