import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';
import {
  createJobOpportunity,
  getJobOpportunities,
  getJobOpportunityById,
  updateJobOpportunity,
  deleteJobOpportunity,
  checkJobEligibility,
  applyToJob,
  getMyJobOpportunities
} from '../controllers/jobController';

const router = Router();

// Create job opportunity
router.post('/', authenticate, requirePermission('job:manage'), createJobOpportunity);

// Get all job opportunities
router.get('/', getJobOpportunities);

// Get my job opportunities
router.get('/my', authenticate, requirePermission('job:manage'), getMyJobOpportunities);

// Get job opportunity by ID
router.get('/:id', getJobOpportunityById);

// Update job opportunity
router.put('/:id', authenticate, requirePermission('job:manage'), updateJobOpportunity);

// Delete job opportunity
router.delete('/:id', authenticate, requirePermission('job:manage'), deleteJobOpportunity);

// Check job eligibility
router.get('/:id/eligibility', authenticate, checkJobEligibility);

// Apply to job
router.post('/:id/apply', authenticate, applyToJob);

export default router;
