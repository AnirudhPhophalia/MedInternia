import express from 'express';
import {
  rateComment,
  replyToComment,
  likeComment,
  getLeaderboard,
  advancedSearch
} from '../controllers/enhancedController';
import { smartSearch } from '../controllers/smartSearchController';
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

// Smart search (accessible to all authenticated users)
router.get('/search/smart', authenticate, smartSearch);

export default router;
