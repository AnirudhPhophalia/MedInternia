import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';
import {
  createBadge,
  getAllBadges,
  awardBadge,
  getUserBadges,
  toggleBadgeVisibility
} from '../controllers/badgeController';

const router = Router();

// Create badge
router.post('/', authenticate, requirePermission('badge:manage'), createBadge);

// Get all badges
router.get('/', getAllBadges);

// Award badge to user
router.post('/award', authenticate, requirePermission('badge:manage'), awardBadge);

// Get user badges
router.get('/user/:userId', authenticate, getUserBadges);

// Toggle badge visibility
router.patch('/:userBadgeId/visibility', authenticate, toggleBadgeVisibility);

export default router;
