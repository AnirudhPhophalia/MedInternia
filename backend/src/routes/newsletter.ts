import { Router } from 'express';
import { subscribeNewsletter, unsubscribeNewsletter } from '../controllers/newsletterController';

const router = Router();

// POST /api/newsletter/subscribe
// Body: { email: string }
router.post('/subscribe', subscribeNewsletter);

// PATCH /api/newsletter/unsubscribe
// Body: { token: string }  — signed JWT from the confirmation email (no login required)
//   or { email: string }   — direct email for authenticated API clients
router.patch('/unsubscribe', unsubscribeNewsletter);

export default router;
