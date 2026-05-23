import express from 'express';
import {
  rateComment,
  replyToComment,
  likeComment,
  getLeaderboard,
  advancedSearch
} from '../controllers/enhancedController';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';

const router = express.Router();

// Comment interactions
router.post('/cases/:caseId/comments/:commentId/rate', authenticate, requirePermission('user:award_points'), rateComment);
router.post('/cases/:caseId/comments/:commentId/reply', authenticate, requirePermission('comment:create'), replyToComment);
router.post('/cases/:caseId/comments/:commentId/like', authenticate, likeComment);

// Leaderboard
router.get('/leaderboard', authenticate, requirePermission('analytics:read'), getLeaderboard);

// Advanced search
router.get('/search', authenticate, requirePermission('analytics:read'), advancedSearch);

export default router;
