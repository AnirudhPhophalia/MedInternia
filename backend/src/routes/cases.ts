import express from 'express';
import {
  createCase,
  getCases,
  getCaseById,
  updateCase,
  deleteCase,
  addComment,
  toggleLike,
  getMyCases,
  addFollowUp,
  getCaseFollowUps,
  generateAISuggestions,
  getCaseAISuggestions,
  pinComment,
  unpinComment,
  getPinnedComments,
  toggleRepostPermission,
  repostCase,
  replyToComment,
  likeComment,
  rateComment
} from '../controllers/caseController';
import {
  approveAutomatedCaseDraft,
  createAutomatedCaseDraft,
  getAutomatedCaseDrafts,
  publishDueAutomatedCases,
  rejectAutomatedCaseDraft
} from '../controllers/automatedCaseController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Public routes (with authentication)
router.get('/', authenticate, getCases);
router.post('/automated/drafts', authenticate, createAutomatedCaseDraft);
router.get('/automated/drafts', authenticate, getAutomatedCaseDrafts);
router.post('/automated/drafts/:id/approve', authenticate, approveAutomatedCaseDraft);
router.post('/automated/drafts/:id/reject', authenticate, rejectAutomatedCaseDraft);
router.post('/automated/run-due', authenticate, publishDueAutomatedCases);
router.get('/:id', authenticate, getCaseById);

// Doctor only routes
router.post('/', authenticate, createCase);
router.get('/my/cases', authenticate, getMyCases);
router.put('/:id', authenticate, updateCase);
router.delete('/:id', authenticate, deleteCase);

// Interactive routes (all authenticated users)
router.post('/:id/comments', authenticate, addComment);
router.post('/:caseId/comments/:commentId/reply', authenticate, replyToComment);
router.post('/:caseId/comments/:commentId/like', authenticate, likeComment);
router.post('/:caseId/comments/:commentId/rate', authenticate, rateComment);
router.post('/:id/like', authenticate, toggleLike);

// Follow-up routes
router.post('/:id/follow-ups', authenticate, addFollowUp);
router.get('/:id/follow-ups', authenticate, getCaseFollowUps);

// AI suggestion routes
router.post('/:id/ai-suggestions', authenticate, generateAISuggestions);
router.get('/:id/ai-suggestions', authenticate, getCaseAISuggestions);

// Pin/unpin comments (doctor only)
router.post('/:caseId/comments/:commentId/pin', authenticate, pinComment);
router.post('/:caseId/comments/:commentId/unpin', authenticate, unpinComment);
// Get all pinned comments for a case
router.get('/:caseId/pinned-comments', getPinnedComments);
// Toggle repost permission (case owner only)
router.patch('/:id/repost-permission', authenticate, toggleRepostPermission);
// Repost a case (if allowed)
router.post('/:id/repost', authenticate, repostCase);
export default router;
