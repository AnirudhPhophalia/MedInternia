import nodemailer from 'nodemailer';
const otpStore: Record<string, string> = {};
import { Request, Response } from 'express';
import User, { IUser } from '../models/User';
import { generateToken } from '../utils/jwt';
import { AuthRequest } from '../middleware/auth';
import { uploadProfileImage } from '../utils/cloudinary';

// Upload profile picture
export const uploadProfilePicture = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const uploadResult = await uploadProfileImage(req.file, String(req.user._id));

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { profilePicture: uploadResult.secure_url },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      message: 'Profile picture updated successfully',
      data: {
        user: updatedUser,
        profilePicture: {
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id
        }
      }
    });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};

// Register a new user (patient or doctor)
export const register = async (req: Request, res: Response) => {
  try {
    const {
      firstName, lastName, email, password, userType, phone, dateOfBirth, gender, address,
      specialization, licenseNumber, experience, qualifications,
      medicalSchool, yearOfStudy, interests, mentorDoctor,
      emergencyContact, medicalHistory, allergies
    } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    if (userType === 'doctor') {
      if (!specialization || !licenseNumber) {
        return res.status(400).json({ success: false, message: 'Specialization and license number are required for doctors' });
      }
      const existingLicense = await User.findOne({ licenseNumber });
      if (existingLicense) {
        return res.status(400).json({ success: false, message: 'Doctor with this license number already exists' });
      }
    }

    if (userType === 'intern') {
      if (!medicalSchool || !yearOfStudy) {
        return res.status(400).json({ success: false, message: 'Medical school and year of study are required for interns' });
      }
    }

    const userData: Partial<IUser> = {
      firstName, lastName, email, password, userType, phone, dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined, gender, address
    };

    if (userType === 'doctor') {
      userData.specialization = specialization; userData.licenseNumber = licenseNumber; userData.experience = experience; userData.qualifications = qualifications;
    }
    if (userType === 'intern') {
      userData.medicalSchool = medicalSchool; userData.yearOfStudy = yearOfStudy; userData.interests = interests; userData.mentorDoctor = mentorDoctor;
    }
    if (userType === 'patient') {
      userData.emergencyContact = emergencyContact; userData.medicalHistory = medicalHistory; userData.allergies = allergies;
    }

    const user = new User(userData);
    await user.save();

    const token = generateToken({ userId: (user._id as any).toString(), email: user.email, userType: user.userType });

    const userResponse = user.toObject() as any;
    delete userResponse.password;
    
    if (user.userType === 'intern') {
      const Webinar = require('../models/Webinar').default;
      const Notification = require('../models/Notification').default;
      const webinars = await Webinar.find({});
      const notifications = [];
      for (const webinar of webinars) {
        await webinar.populate('host', 'firstName lastName');
        const host = webinar.host as any;
        notifications.push({
          recipient: user._id,
          message: `New webinar scheduled: ${webinar.title} by Dr. ${host.firstName} ${host.lastName}`,
          type: 'webinar',
          link: webinar.meetingLink
        });
      }
      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
    }

    res.status(201).json({ success: true, message: 'User registered successfully', data: { user: userResponse, token } });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      return res.status(400).json({ success: false, message: 'Validation error', errors });
    }
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ success: false, message: `${field} already exists` });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const sendOtp = async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email required' });
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[email] = otp;
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
      port: Number(process.env.EMAIL_PORT) || 587,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'MedInternia Email Verification OTP',
      text: `Your OTP is: ${otp}`
    });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
};

export const verifyOtp = (req: Request, res: Response) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP required' });
  if (otpStore[email] === otp) {
    delete otpStore[email];
    return res.json({ success: true });
  }
  return res.json({ success: false, message: 'Invalid OTP' });
};

// Login user
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required' });

    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' });

    if (!user.isActive) return res.status(401).json({ success: false, message: 'Account is deactivated. Please contact support.' });

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) return res.status(401).json({ success: false, message: 'Invalid email or password' });

    const token = generateToken({ userId: (user._id as any).toString(), email: user.email, userType: user.userType });

    const userResponse = user.toObject() as any;
    delete userResponse.password;

    res.json({ success: true, message: 'Login successful', data: { user: userResponse, token } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'User not authenticated' });
    res.json({ success: true, data: { user } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const updates = req.body;
    if (!user) return res.status(401).json({ success: false, message: 'User not authenticated' });

    delete updates.password; delete updates.email; delete updates.userType; delete updates.isActive; delete updates.isVerified;

    const updatedUser = await User.findByIdAndUpdate(user._id, updates, { new: true, runValidators: true }).select('-password');
    if (!updatedUser) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, message: 'Profile updated successfully', data: { user: updatedUser } });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      return res.status(400).json({ success: false, message: 'Validation error', errors });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { currentPassword, newPassword } = req.body;
    if (!user) return res.status(401).json({ success: false, message: 'User not authenticated' });
    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Current password and new password are required' });
    if (newPassword.length < 6) return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });

    const userWithPassword = await User.findById(user._id).select('+password');
    if (!userWithPassword) return res.status(404).json({ success: false, message: 'User not found' });

    const isCurrentPasswordValid = await userWithPassword.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    userWithPassword.password = newPassword;
    await userWithPassword.save();
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email required' });
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[email + '_reset'] = otp;
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
      port: Number(process.env.EMAIL_PORT) || 587,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'MedInternia Password Reset OTP',
      text: `Your password reset OTP is: ${otp}`
    });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) return res.status(400).json({ success: false, message: 'All fields required' });
  if (newPassword.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
  if (otpStore[email + '_reset'] !== otp) return res.status(400).json({ success: false, message: 'Invalid OTP' });
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  user.password = newPassword;
  await user.save();
  delete otpStore[email + '_reset'];
  return res.json({ success: true, message: 'Password reset successfully' });
};

// --- GOOGLE LOGIN (NAYA FUNCTION) ---
export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { email, firstName, lastName, profilePicture } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required from Google' });
    }

    let user = await User.findOne({ email });

    if (!user) {
      const randomPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
      user = new User({
        email,
        firstName: firstName || 'Google User',
        lastName: lastName || '',
        password: randomPassword,
        userType: 'patient', 
        profilePicture: profilePicture || '',
      });
      await user.save();
    }

    const token = generateToken({
      userId: (user._id as any).toString(),
      email: user.email,
      userType: user.userType
    });

    const userResponse = user.toObject() as any;
    delete userResponse.password;

    res.json({
      success: true,
      message: 'Google Login successful',
      data: {
        user: userResponse,
        token
      }
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};