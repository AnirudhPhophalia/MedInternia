import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';
import {
  createWebinar,
  getWebinars,
  getWebinarById,
  registerForWebinar,
  unregisterFromWebinar,
  updateWebinar,
  markAttendance,
  submitFeedback,
  getUserWebinars,
  generateMeetingLink
} from '../controllers/webinarController';

const router = Router();

// Create webinar
router.post('/', authenticate, requirePermission('webinar:manage'), createWebinar);

// Get all webinars
router.get('/', getWebinars);

// Get user's webinars
router.get('/my', authenticate, getUserWebinars);

// Get webinar by ID
router.get('/:id', getWebinarById);

// Register for webinar
router.post('/:id/register', authenticate, requirePermission('webinar:attend'), registerForWebinar);

// Unregister from webinar
router.delete('/:id/register', authenticate, requirePermission('webinar:attend'), unregisterFromWebinar);

// Update webinar
router.put('/:id', authenticate, requirePermission('webinar:manage'), updateWebinar);

// Mark attendance
router.patch('/:id/attendance', authenticate, requirePermission('webinar:manage'), markAttendance);

// Submit feedback
router.post('/:id/feedback', authenticate, requirePermission('webinar:feedback'), submitFeedback);

// Generate meeting link
router.post('/:id/meeting-link', authenticate, requirePermission('webinar:manage'), generateMeetingLink);

export default router;
