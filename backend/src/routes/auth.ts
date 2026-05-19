import { Router } from 'express';
import {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  sendOtp,
  verifyOtp,
  forgotPassword,
  resetPassword,
  uploadProfilePicture
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import multer from 'multer';
import passport from 'passport';
import { generateToken } from '../utils/jwt';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'));
      return;
    }
    cb(null, true);
  }
});

const router = Router();

// ==========================================
// GOOGLE AUTHENTICATION ROUTES
// ==========================================

// 1. Initiate Google OAuth Flow
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// 2. Google Callback URL after successful login
router.get(
  '/google/callback',
  passport.authenticate('google', { 
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/login`, 
    session: false 
  }),
  (req: any, res: any) => {
    const user = req.user; 

    // Generate token matching exact app standards (userId, email, userType)
    const token = generateToken(user._id.toString(), user.email, user.userType || 'patient');

    const isProduction = process.env.NODE_ENV === 'production';

    // Store the JWT in an HttpOnly cookie instead of exposing it in the URL
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    // Dynamic environmental fallback configuration redirect
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth-success`);
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
router.get('/profile', authenticate, getProfile);

// Profile image upload
router.post(
  '/profile/upload-picture',
  authenticate,
  upload.single('profilePicture'),
  uploadProfilePicture
);

router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);

export default router;