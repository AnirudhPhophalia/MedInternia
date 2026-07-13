import { Router, Request } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';
import {
  getUserProfile,
  updateUserProfile,
  getInternScorecard,
  getDoctorMentorSummary,
  getLeaderboard,
  verifyDoctor,
  grantContributorBadge,
  upgradeProfile,
  awardPointsToIntern,
  followUser,
  unfollowUser,
  getConnections
} from '../controllers/userController';
import { toggleBookmark, getSavedItems } from '../controllers/userBookmarksController';

const router = Router();

// Get user profile by ID
router.get('/:userId/profile', authenticate, getUserProfile);

// Update user profile
router.put('/:userId/profile', authenticate, updateUserProfile);

// Get intern scorecard
router.get('/:userId/scorecard', authenticate, getInternScorecard);

// Get doctor mentorship score and resume-style summary
router.get('/:userId/mentor-summary', getDoctorMentorSummary);

// Get leaderboard
router.get('/leaderboard', getLeaderboard);

// Verify doctor (admin/verified doctor only)
router.patch('/:userId/verify', authenticate, requirePermission('profile:verify'), verifyDoctor);

// Grant contributor badge
router.post('/:userId/grant-contributor', authenticate, requirePermission('badge:manage'), grantContributorBadge);

// Upgrade intern profile to doctor
router.patch('/upgrade-profile', authenticate, upgradeProfile);

// Doctor awards points to intern as recommendation
router.post('/:internId/award-points', authenticate, requirePermission('user:award_points'), awardPointsToIntern);

// Follow a user
router.post('/follow', authenticate, followUser);

// Unfollow a user
router.delete('/:userId/following/:followId', authenticate, unfollowUser);

// Get user connections (followers/following)
router.get('/:userId/connections', getConnections);

// Get saved items for user profile
router.get('/:userId/saved', authenticate, getSavedItems);

// Toggle bookmark for case, job, or webinar
router.post('/:userId/save/:itemType/:itemId', authenticate, toggleBookmark);

export default router;
