import { Router } from 'express';
import { optionalAuthenticate } from '../middleware/auth';
import { smartSearch } from '../controllers/searchController';

const router = Router();

// AI-powered smart search across job/internship listings and profiles
router.get('/', optionalAuthenticate, smartSearch);

export default router;
