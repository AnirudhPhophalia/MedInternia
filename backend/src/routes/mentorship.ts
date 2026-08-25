import { Router } from 'express';
import {
  requestMentorship,
  getMyMentorships,
  getMentorshipById,
  updateMentorshipStatus,
  addGoal,
  toggleGoal,
  addMeeting,
  completeMeeting
} from '../controllers/mentorshipController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', requestMentorship);
router.get('/me', getMyMentorships);
router.get('/:id', getMentorshipById);
router.patch('/:id/status', updateMentorshipStatus);
router.post('/:id/goals', addGoal);
router.patch('/:id/goals/:goalId/toggle', toggleGoal);
router.post('/:id/meetings', addMeeting);
router.patch('/:id/meetings/:meetingId/complete', completeMeeting);

export default router;
