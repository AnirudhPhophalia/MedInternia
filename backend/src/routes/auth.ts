import express from 'express';
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
  uploadProfilePicture,
  googleLogin // ✨ Naya function yahan import ho gaya
} from '../controllers/authController';
import { authenticate as auth } from '../middleware/auth';

const router = express.Router();

// --- Public Routes ---
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin); // ✨ Ye raha tumhara naya raasta (route)!

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// --- Protected Routes ---
router.get('/profile', auth, getProfile);
router.put('/profile', auth, updateProfile);
router.put('/change-password', auth, changePassword);

// (Note: Agar profile picture upload ke liye pehle koi aur route tha, toh usko as it is rakhna. Abhi main isko comment kar rahi hu taaki koi error na aaye)
// router.post('/profile-picture', auth, uploadProfilePicture);

export default router;