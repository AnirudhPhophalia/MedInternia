import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';
import {
  submitPeerReview,
  getCommentReviews,
  getUserReviews,
  getReviewsByUser,
  markReviewHelpful,
  getPeerReviewAnalytics
} from '../controllers/peerReviewController';

const router = Router();

// Submit peer review
router.post('/', authenticate, authorize('intern'), submitPeerReview);

// Get peer reviews for a comment
router.get('/comment/:commentId', authenticate, getCommentReviews);

// Get peer reviews received by user
router.get('/user/:userId/received', authenticate, getUserReviews);

// Get peer reviews given by user
router.get('/user/:userId/given', authenticate, getReviewsByUser);

// Mark review as helpful
router.patch('/:reviewId/helpful', authenticate, markReviewHelpful);

// Get peer review analytics for user
router.get('/user/:userId/analytics', authenticate, requirePermission('analytics:read'), getPeerReviewAnalytics);

export default router;
