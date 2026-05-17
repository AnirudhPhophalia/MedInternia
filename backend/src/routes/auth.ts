import { sendOtp, verifyOtp, forgotPassword, resetPassword, uploadProfilePicture } from '../controllers/authController';
import { Router } from 'express';
import {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import multer from 'multer';
import path from 'path';

// --- NEW IMPORTS FOR GOOGLE AUTH ---
// @ts-ignore
import passport from 'passport';
import jwt from 'jsonwebtoken';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads/profiles'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

const router = Router();

// ==========================================
// GOOGLE AUTHENTICATION ROUTES
// ==========================================

// 1. Initiate Google OAuth Flow
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// 2. Google Callback URL after successful login
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
(req: any, res: any) => {
    // Authentication successful, generate JWT Token
    const user: any = req.user; 

  const token = jwt.sign(
  { id: user._id, role: user.userType || 'intern' }, // Agar role khali hai toh 'intern' bana do
  process.env.JWT_SECRET as string,
  { expiresIn: '30d' }
);

    // Redirect back to frontend dashboard with the token
    // (Assuming React/Next.js frontend runs on localhost:3000)
    res.redirect(`http://localhost:3000/auth-success?token=${token}`);
  }
);

// ==========================================

// Forgot password routes
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// OTP routes
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes (require authentication)
router.get('/profile', authenticate as any, getProfile as any);

// Profile image upload
router.post('/profile/upload-picture', authenticate as any, upload.single('profilePicture'), uploadProfilePicture as any);
router.put('/profile', authenticate as any, updateProfile as any);
router.put('/change-password', authenticate as any, changePassword as any);

export default router;