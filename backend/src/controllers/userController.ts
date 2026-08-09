import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest, blacklistToken } from '../middleware/auth';
import User from '../models/User';
import UserBadge from '../models/UserBadge';
import Case from '../models/Case';
import Certificate from '../models/Certificate';
import Diary from '../models/Diary';
import Flashcard from '../models/Flashcard';
import Collection from '../models/Collection';
import UserLearningPath from '../models/UserLearningPath';
import Notification from '../models/Notification';
import Rating from '../models/Rating';
import PeerReview from '../models/PeerReview';
import Mentorship from '../models/Mentorship';
import Webinar from '../models/Webinar';
import JobOpportunity from '../models/JobOpportunity';
import Conversation from '../models/Conversation';
import ResearchPaper from '../models/ResearchPaper';
import AICasePostSchedule from '../models/AICasePostSchedule';
import RoleUpgradeRequest from '../models/RoleUpgradeRequest';
import { checkAndAwardAutoBadges } from './badgeController';
import { createAndEmitNotification } from './notificationController';
import { extractTextFromBuffer, parseResumeText } from '../services/resumeParserService';
import { resolveProfilePictureUrl, resolveProfilePictureUrls } from '../utils/signedUrlResolver';
import jwt from 'jsonwebtoken';

// Define CaseSummary type for recentCases
interface CaseSummary {
  _id: string;
  title: string;
  createdAt: Date;
  difficulty: string;
  specialization: string;
}

interface MentorStats {
  mentorScore: number;
  casesPosted: number;
  internsMentored: number;
  certificatesIssued: number;
  casesReviewed: number;
  discussionCount: number;
  likesReceived: number;
  followUpsPosted: number;
  averageRating: number;
  mentoringCredits: number;
  scoreBreakdown: {
    casesPosted: number;
    internsMentored: number;
    certificatesIssued: number;
    casesReviewed: number;
    discussionEngagement: number;
    likesReceived: number;
    followUpsPosted: number;
    ratingQuality: number;
    mentoringCredits: number;
  };
  resumeSummary: string;
}

const toObjectId = (id: unknown) => {
  return typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
};

const buildMentorResumeSummary = (doctor: any, stats: Omit<MentorStats, 'resumeSummary'>) => {
  const name = `${doctor.firstName} ${doctor.lastName}`.trim();
  const specialization = doctor.specialization ? ` in ${doctor.specialization}` : '';
  return [
    `${name} is a ${doctor.isVerifiedDoctor ? 'verified ' : ''}doctor${specialization}.`,
    `Mentorship score: ${stats.mentorScore}.`,
    `Posted ${stats.casesPosted} case(s), mentored ${stats.internsMentored} intern(s), reviewed ${stats.casesReviewed} case(s), and issued ${stats.certificatesIssued} certificate(s).`,
    `Discussion engagement includes ${stats.discussionCount} comment(s), ${stats.likesReceived} like(s), and ${stats.followUpsPosted} follow-up update(s).`
  ].join(' ');
};

const calculateMentorStats = async (doctor: any): Promise<MentorStats> => {
  const doctorId = toObjectId(doctor._id);

  const [
    casesPosted,
    internsMentored,
    certificateStats,
    engagementStats
  ] = await Promise.all([
    Case.countDocuments({ doctor: doctorId, isActive: true }),
    User.countDocuments({ userType: 'intern', mentorDoctor: doctorId, isActive: true }),
    Certificate.aggregate([
      { $match: { doctor: doctorId } },
      {
        $group: {
          _id: null,
          certificatesIssued: { $sum: 1 },
          casesReviewed: { $sum: '$casesReviewed' }
        }
      }
    ]),
    Case.aggregate([
      { $match: { doctor: doctorId, isActive: true } },
      {
        $project: {
          commentCount: { $size: { $ifNull: ['$comments', []] } },
          likeCount: { $size: { $ifNull: ['$likes', []] } },
          followUpCount: { $size: { $ifNull: ['$followUps', []] } }
        }
      },
      {
        $group: {
          _id: null,
          discussionCount: { $sum: '$commentCount' },
          likesReceived: { $sum: '$likeCount' },
          followUpsPosted: { $sum: '$followUpCount' }
        }
      }
    ])
  ]);

  const certificatesIssued = certificateStats[0]?.certificatesIssued || 0;
  const casesReviewed = certificateStats[0]?.casesReviewed || 0;
  const discussionCount = engagementStats[0]?.discussionCount || 0;
  const likesReceived = engagementStats[0]?.likesReceived || 0;
  const followUpsPosted = engagementStats[0]?.followUpsPosted || 0;
  const averageRating = Number(doctor.averageRating || 0);
  const mentoringCredits = Number(doctor.mentoringCredits || 0);

  const scoreBreakdown = {
    casesPosted: casesPosted * 8,
    internsMentored: internsMentored * 20,
    certificatesIssued: certificatesIssued * 15,
    casesReviewed: casesReviewed * 6,
    discussionEngagement: discussionCount * 2,
    likesReceived,
    followUpsPosted: followUpsPosted * 5,
    ratingQuality: Math.round(averageRating * 12),
    mentoringCredits: mentoringCredits * 2
  };

  const mentorScore = Object.values(scoreBreakdown).reduce((sum, value) => sum + value, 0);
  const baseStats = {
    mentorScore,
    casesPosted,
    internsMentored,
    certificatesIssued,
    casesReviewed,
    discussionCount,
    likesReceived,
    followUpsPosted,
    averageRating,
    mentoringCredits,
    scoreBreakdown
  };

  return {
    ...baseStats,
    resumeSummary: buildMentorResumeSummary(doctor, baseStats)
  };
};

// Get user profile
export const getUserProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    if (!req.user || (String(req.user._id) !== userId && req.user.userType !== 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: cannot view other users\'profiles'
      });
     
    }

    const user = await User.findById(userId)
      .select('-password')
      .populate('mentorDoctor', 'firstName lastName specialization');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Define all profile fields you want to check for completeness
    const allFields = [
      'firstName',
      'lastName',
      'email',
      'medicalSchool',
      'specialization',
      'profilePicturePublicId',
      'bio'
      // Add other fields as needed
    ];
    // Count fields that are completed (not null/undefined/empty)
    const completedFields = allFields.filter(field => {
      const value = (user as any)[field];
      return value !== undefined && value !== null && value !== '';
    });
    const profileScore = Math.round((completedFields.length / allFields.length) * 100);

    // Update profile score if changed
    if (user.profileScore !== profileScore) {
      await User.findByIdAndUpdate(userId, { profileScore });
    }

    // Fetch badges for the user
    const badges = await UserBadge.find({ user: userId, isVisible: true })
      .populate('badge')
      .sort({ earnedAt: -1 });

    // Fetch recent cases for the user
    const recentCases = (await Case.find({ doctor: userId })
      .select('_id title createdAt difficulty specialization')
      .sort({ createdAt: -1 })
      .limit(5))
      .map((c: any) => ({
        _id: c._id.toString(),
        title: c.title,
        createdAt: c.createdAt,
        difficulty: c.difficulty,
        specialization: c.specialization
      })) as CaseSummary[];

    const mentorStats = user.userType === 'doctor' ? await calculateMentorStats(user) : null;

    res.json({
      success: true,
      data: {
        user: { ...resolveProfilePictureUrl(user), profileScore },
        badges,
        recentCases,
        mentorStats,
        stats: {
          casesAnalyzed: user.casesAnalyzed,
          upvotesReceived: user.upvotesReceived,
          averageRating: user.averageRating,
          points: user.points,
          streak: user.streak,
          certificatesEarned: user.certificatesEarned
        }
      }
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
 export const getCurrentUserProfile = async (req: AuthRequest, res: Response) => {
  req.params.userId = String(req.user!._id);
  return getUserProfile(req, res);
};
const ALLOWED_UPDATE_FIELDS = [
  'firstName', 'lastName', 'phone', 'dateOfBirth', 'gender', 'address',
  'bio', 'linkedInProfile', 'githubProfile',
  'specialization', 'experience', 'qualifications',
  'medicalSchool', 'yearOfStudy', 'interests', 'skills',
  'academicAchievements', 'careerGoals',
  'emergencyContact', 'medicalHistory', 'allergies'
];

// Update user profile
export const updateUserProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = (req.user!._id as any).toString();

    // Users can only update their own profile
    if (userId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own profile'
      });
    }

    const updateData: Record<string, any> = {};
    for (const field of ALLOWED_UPDATE_FIELDS) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get intern scorecard
export const getInternScorecard = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    if (!req.user || (String(req.user._id) !== userId && req.user.userType !== 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: cannot view other users\' scorecards'
      });
    }

    const user = await User.findOne({ _id: userId, userType: 'intern' })
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Intern not found'
      });
    }

    // Get badges
    const badges = await UserBadge.find({ user: userId, isVisible: true })
      .populate('badge')
      .sort({ earnedAt: -1 });

    // Get case participation
    const casesParticipated = await Case.find({
      'comments.author': userId
    }).select('title createdAt difficulty specialization');

    // Calculate performance metrics
    const performanceMetrics = {
      totalPoints: user.points,
      casesAnalyzed: user.casesAnalyzed,
      upvotesReceived: user.upvotesReceived,
      peerReviewsGiven: user.peerReviewsGiven,
      peerReviewsReceived: user.peerReviewsReceived,
      averageRating: user.averageRating,
      currentStreak: user.streak,
      longestStreak: user.longestStreak,
      certificatesEarned: user.certificatesEarned,
      profileCompleteness: user.profileScore
    };

    // Calculate rank among all interns
    const totalInterns = await User.countDocuments({ userType: 'intern' });
    const higherRankedInterns = await User.countDocuments({
      userType: 'intern',
      points: { $gt: user.points }
    });
    const rank = higherRankedInterns + 1;

    res.json({
      success: true,
      data: {
        user,
        badges,
        casesParticipated,
        performanceMetrics,
        ranking: {
          current: rank,
          total: totalInterns,
          percentile: Math.round(((totalInterns - rank) / totalInterns) * 100)
        }
      }
    });
  } catch (error) {
    console.error('Get intern scorecard error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update streak
export const updateUserStreak = async (userId: string) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if user has activity today (comments, case posts, etc.)
    const todayActivity = await Case.findOne({
      $or: [
        { doctor: userId, createdAt: { $gte: today } },
        { 'comments.author': userId, 'comments.createdAt': { $gte: today } }
      ]
    });

    if (!todayActivity) {
      // No activity today - reset streak
      await User.findByIdAndUpdate(userId, { $set: { streak: 0 } });
      return;
    }

    // Check if user was already active today (streak already incremented)
    const user = await User.findById(userId).select('streak longestStreak lastActivityDate');
    if (!user) return;

    const lastActive = user.lastActivityDate ? new Date(user.lastActivityDate) : null;
    const lastActiveDate = lastActive ? new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate()) : null;
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (lastActiveDate && lastActiveDate.getTime() === todayDate.getTime()) {
      // Already counted activity today - just update lastActivityDate, don't double increment
      await User.findByIdAndUpdate(userId, { $set: { lastActivityDate: new Date() } });
      return;
    }

    if (lastActiveDate && lastActiveDate.getTime() === yesterday.getTime()) {
      // Consecutive day - increment streak
      await User.findByIdAndUpdate(userId, {
        $inc: { streak: 1 },
        $max: { longestStreak: user.streak + 1 },
        $set: { lastActivityDate: new Date() }
      });
    } else {
      // First activity in a while - start new streak
      await User.findByIdAndUpdate(userId, {
        $set: { streak: 1, lastActivityDate: new Date() },
        $max: { longestStreak: 1 }
      });
    }

    // Check for auto-badges
    await checkAndAwardAutoBadges(userId);
  } catch (error) {
    console.error('Update user streak error:', error);
  }
};

// Get user leaderboard
export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    const { userType = 'intern', metric = 'points', limit = 50 } = req.query;

    const validMetrics = ['points', 'casesAnalyzed', 'upvotesReceived', 'averageRating', 'streak', 'mentorScore'];
    const sortMetric = validMetrics.includes(metric as string) ? metric as string : 'points';
    const limitNum = Math.max(1, Math.min(Number(limit) || 50, 100));

    const filter: any = { userType, isActive: true };

    if (userType === 'doctor' && sortMetric === 'mentorScore') {
      const doctors = await User.find(filter)
        .select('firstName lastName profilePicture points casesAnalyzed upvotesReceived averageRating streak specialization experience mentoringCredits isVerifiedDoctor');

      const doctorsWithMentorStats = await Promise.all(
        doctors.map(async (doctor) => ({
          ...doctor.toObject(),
          mentorStats: await calculateMentorStats(doctor)
        }))
      );

      const leaderboardWithRanks = doctorsWithMentorStats
        .sort((a, b) => b.mentorStats.mentorScore - a.mentorStats.mentorScore)
        .slice(0, limitNum)
        .map((doctor, index) => ({
          ...doctor,
          rank: index + 1
        }));

      return res.json({
        success: true,
        data: {
          leaderboard: leaderboardWithRanks,
          metric: sortMetric,
          total: leaderboardWithRanks.length
        }
      });
    }

    const sort: any = {};
    sort[sortMetric] = -1;

    const leaderboard = await User.find(filter)
      .select('firstName lastName profilePicture points casesAnalyzed upvotesReceived averageRating streak medicalSchool specialization')
      .sort(sort)
      .limit(limitNum);

    // Add rank to each user
    const leaderboardWithRanks = leaderboard.map((user, index) => ({
      ...user.toObject(),
      rank: index + 1
    }));

    res.json({
      success: true,
      data: {
        leaderboard: leaderboardWithRanks,
        metric: sortMetric,
        total: leaderboardWithRanks.length
      }
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get doctor mentor reputation summary
export const getDoctorMentorSummary = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const doctor = await User.findOne({ _id: userId, userType: 'doctor', isActive: true })
      .select('-password');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    const mentorStats = await calculateMentorStats(doctor);

    res.json({
      success: true,
      data: {
        doctor: {
          _id: doctor._id,
          firstName: doctor.firstName,
          lastName: doctor.lastName,
          specialization: doctor.specialization,
          isVerifiedDoctor: doctor.isVerifiedDoctor
        },
        mentorStats
      }
    });
  } catch (error) {
    console.error('Get doctor mentor summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Verify doctor (KYC process)
export const verifyDoctor = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { isVerified, verificationDocuments } = req.body;

    // Only admins can verify doctors (KYC requires documented administrative approval).
    if (req.user!.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can verify doctors'
      });
    }

    const doctor = await User.findOneAndUpdate(
      { _id: userId, userType: 'doctor' },
      { 
        isVerifiedDoctor: isVerified,
        verificationDocuments: verificationDocuments || []
      },
      { new: true }
    ).select('-password');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    res.json({
      success: true,
      message: `Doctor ${isVerified ? 'verified' : 'unverified'} successfully`,
      data: { doctor }
    });
  } catch (error) {
    console.error('Verify doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getUsers = (req: Request, res: Response) => {
  // Sample data - replace with database queries
  const users = [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
  ];
  
  res.json({
    success: true,
    data: users
  });
};

export const createUser = (req: Request, res: Response) => {
  const { name, email } = req.body;
  
  // Validate input
  if (!name || !email) {
    return res.status(400).json({
      success: false,
      message: 'Name and email are required'
    });
  }
  
  // Sample response - replace with database creation
  const newUser = {
    id: Date.now(),
    name,
    email
  };
  
  res.status(201).json({
    success: true,
    data: newUser
  });
};

// Grant contributor badge if points or recommended by doctor
export const grantContributorBadge = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.badges && user.badges.includes('CONTRIBUTOR')) {
      return res.status(400).json({ success: false, message: 'Already has badge' });
    }
    const recommendedByDoctor = req.body.recommendedByDoctor;
    if (user.points >= 50 || recommendedByDoctor) {
      user.badges = user.badges || [];
      user.badges.push('CONTRIBUTOR');
      await user.save();
      res.json({ success: true, badges: user.badges });
    } else {
      res.status(403).json({ success: false, message: 'Insufficient points or recommendation' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ---------------------------------------------------------------------------
// Role Upgrade Request flow (intern → doctor)
//
// Replacing the old self-service upgradeProfile endpoint which allowed any
// intern to change their own userType to 'doctor' by accumulating 100
// credits — bypassing KYC entirely (issue #1116).
//
// New flow:
//   1. Intern calls requestRoleUpgrade  → creates a pending request record
//   2. Admin calls approveRoleUpgrade   → atomically sets userType = 'doctor'
//      OR rejectRoleUpgrade             → closes request with a reason
// ---------------------------------------------------------------------------

/**
 * POST /api/users/role-upgrade/request
 *
 * Submit a request to be promoted from intern to doctor. Creates a single
 * pending request per intern — duplicates are rejected with 409.
 * Does NOT change userType. Notifies all admins via the notification system.
 */
export const requestRoleUpgrade = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const internId = (req.user._id as any).toString();
    const user = await User.findById(internId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.userType !== 'intern') {
      return res.status(400).json({
        success: false,
        message: 'Only interns can request a role upgrade to doctor',
      });
    }

    // Block duplicate pending requests
    const existing = await RoleUpgradeRequest.findOne({ intern: internId, status: 'pending' });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'You already have a pending role upgrade request. Please wait for admin review.',
        data: { requestId: existing._id },
      });
    }

    const { licenseNumber, specialization, notes } = req.body;

    const upgradeRequest = await RoleUpgradeRequest.create({
      intern: internId,
      requestedRole: 'doctor',
      status: 'pending',
      licenseNumber: typeof licenseNumber === 'string' ? licenseNumber.trim() : undefined,
      specialization: typeof specialization === 'string' ? specialization.trim() : undefined,
      notes: typeof notes === 'string' ? notes.trim() : undefined,
    });

    // Notify all admin users so they can action the request
    const admins = await User.find({ userType: 'admin', isActive: true }).select('_id').lean();
    await Promise.all(
      admins.map((admin) =>
        createAndEmitNotification({
          recipientId: String(admin._id),
          type: 'badge', // closest available type for an admin action notification
          message: `Intern ${user.firstName} ${user.lastName} has requested a role upgrade to doctor.`,
          link: `/admin/role-upgrades/${String(upgradeRequest._id)}`,
          payload: {
            requestId: String(upgradeRequest._id),
            internId,
            internName: `${user.firstName} ${user.lastName}`,
          },
        }),
      ),
    );

    return res.status(201).json({
      success: true,
      message: 'Role upgrade request submitted. An admin will review your request.',
      data: { requestId: upgradeRequest._id, status: upgradeRequest.status },
    });
  } catch (error) {
    console.error('requestRoleUpgrade error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * PATCH /api/users/role-upgrade/:requestId/approve
 * Admin only (requirePermission('profile:upgrade_request')).
 *
 * Atomically sets userType = 'doctor' on the intern's account and marks the
 * request approved. Uses a MongoDB session so both writes are all-or-nothing.
 */
export const approveRoleUpgrade = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { requestId } = req.params;
    const adminId = (req.user._id as any).toString();

    const upgradeRequest = await RoleUpgradeRequest.findById(requestId).populate(
      'intern',
      'firstName lastName userType isActive',
    );

    if (!upgradeRequest) {
      return res.status(404).json({ success: false, message: 'Role upgrade request not found' });
    }

    if (upgradeRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Request is already ${upgradeRequest.status}`,
      });
    }

    const intern = upgradeRequest.intern as any;

    if (!intern || intern.userType !== 'intern') {
      return res.status(400).json({
        success: false,
        message: 'The associated user is no longer an intern',
      });
    }

    // Use a session to keep the two writes atomic
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      await User.findByIdAndUpdate(
        intern._id,
        { $set: { userType: 'doctor' } },
        { session },
      );

      upgradeRequest.status = 'approved';
      upgradeRequest.reviewedBy = new mongoose.Types.ObjectId(adminId);
      upgradeRequest.reviewedAt = new Date();
      await upgradeRequest.save({ session });

      await session.commitTransaction();
    } catch (txErr) {
      await session.abortTransaction();
      throw txErr;
    } finally {
      session.endSession();
    }

    // Notify the intern
    await createAndEmitNotification({
      recipientId: String(intern._id),
      type: 'badge',
      message: 'Congratulations! Your role upgrade request to Doctor has been approved.',
      link: '/profile',
      payload: { requestId: String(upgradeRequest._id) },
    });

    return res.status(200).json({
      success: true,
      message: 'Role upgrade approved. User is now a doctor.',
      data: { requestId: upgradeRequest._id, internId: String(intern._id) },
    });
  } catch (error) {
    console.error('approveRoleUpgrade error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * PATCH /api/users/role-upgrade/:requestId/reject
 * Admin only (requirePermission('profile:upgrade_request')).
 *
 * Closes the request as rejected. The intern is notified and can submit a
 * new request after addressing the reason.
 */
export const rejectRoleUpgrade = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { requestId } = req.params;
    const adminId = (req.user._id as any).toString();
    const { reason } = req.body;

    const upgradeRequest = await RoleUpgradeRequest.findById(requestId).populate(
      'intern',
      'firstName lastName _id',
    );

    if (!upgradeRequest) {
      return res.status(404).json({ success: false, message: 'Role upgrade request not found' });
    }

    if (upgradeRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Request is already ${upgradeRequest.status}`,
      });
    }

    upgradeRequest.status = 'rejected';
    upgradeRequest.reviewedBy = new mongoose.Types.ObjectId(adminId);
    upgradeRequest.reviewedAt = new Date();
    if (typeof reason === 'string' && reason.trim()) {
      upgradeRequest.rejectionReason = reason.trim();
    }
    await upgradeRequest.save();

    const intern = upgradeRequest.intern as any;
    if (intern) {
      const reasonMsg = upgradeRequest.rejectionReason
        ? ` Reason: ${upgradeRequest.rejectionReason}`
        : '';
      await createAndEmitNotification({
        recipientId: String(intern._id),
        type: 'badge',
        message: `Your role upgrade request has been reviewed and was not approved.${reasonMsg}`,
        link: '/profile',
        payload: { requestId: String(upgradeRequest._id) },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Role upgrade request rejected.',
      data: { requestId: upgradeRequest._id },
    });
  } catch (error) {
    console.error('rejectRoleUpgrade error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /api/users/role-upgrade/pending
 * Admin only (requirePermission('profile:upgrade_request')).
 *
 * Returns all pending role upgrade requests for the admin dashboard.
 */
export const getPendingRoleUpgrades = async (req: AuthRequest, res: Response) => {
  try {
    const requests = await RoleUpgradeRequest.find({ status: 'pending' })
      .populate('intern', 'firstName lastName email medicalSchool yearOfStudy credits specialization')
      .sort({ createdAt: 1 }) // oldest first so admins action in FIFO order
      .lean();

    return res.status(200).json({
      success: true,
      data: { requests, total: requests.length },
    });
  } catch (error) {
    console.error('getPendingRoleUpgrades error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Admin awards points to intern (e.g. for verified contributions).
// Awarding is admin-only and strictly bounded per call so that a single
// request cannot inflate an intern's points (and thus leaderboard rank,
// badges, or upgrade thresholds) beyond control.
const MAX_AWARD_POINTS_PER_CALL = 100;
export const awardPointsToIntern = async (req: AuthRequest, res: Response) => {
  try {
    const admin = req.user;
    const { internId } = req.params;
    const { points } = req.body;
    if (!admin || admin.userType !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can award points.' });
    }
    if (typeof points !== 'number' || !Number.isInteger(points) || points <= 0) {
      return res.status(400).json({ success: false, message: 'Points must be a positive integer.' });
    }
    if (points > MAX_AWARD_POINTS_PER_CALL) {
      return res.status(400).json({
        success: false,
        message: `Points cannot exceed ${MAX_AWARD_POINTS_PER_CALL} per request.`
      });
    }
    const intern = await User.findById(internId);
    if (!intern || intern.userType !== 'intern') {
      return res.status(404).json({ success: false, message: 'Intern not found.' });
    }
    const updatedIntern = await User.findByIdAndUpdate(
    internId,
    { $inc: { points } },
    { new: true }
  );
  res.json({ success: true, points: updatedIntern?.points ?? 0 });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Follow a user
export const followUser = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized: user not found in request" });
    }
    const myId = req.user._id;
    const { userId } = req.body;
    if (myId.toString() === userId) return res.status(400).json({ success: false, message: "Cannot follow yourself" });

    const [me, other] = await Promise.all([
      User.findById(myId).select('following'),
      User.findById(userId).select('followers')
    ]);
    if (!me || !other) return res.status(404).json({ success: false, message: "User not found" });

    // Check if already following using $addToSet check to avoid duplicates
    if ((me.following ?? []).some((id: any) => id.toString() === userId)) {
      return res.status(400).json({ success: false, message: "Already following" });
    }

    await Promise.all([
      User.findByIdAndUpdate(myId, { $addToSet: { following: userId } }),
      User.findByIdAndUpdate(userId, { $addToSet: { followers: myId } })
    ]);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error following user" });
  }
};

// Unfollow a user
export const unfollowUser = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized: user not found in request" });
    }
    const myId = req.user._id;
    const { userId } = req.body;

    await Promise.all([
      User.findByIdAndUpdate(myId, { $pull: { following: userId } }),
      User.findByIdAndUpdate(userId, { $pull: { followers: myId } })
    ]);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error unfollowing user" });
  }
};

// Get connections (following and followers)
export const getConnections = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized: user not found in request" });
    }
    const requesterId = (req.user._id as any).toString();
    const targetUserId = req.params.userId ? String(req.params.userId) : requesterId;

    // Privacy: users may only view their own social connections. Admins may
    // view any user's connections for administrative purposes. This prevents
    // scraping the platform's social graph (e.g. mapping which patients follow
    // which doctors).
    const isOwnConnections = targetUserId === requesterId;
    const isAdmin = req.user.userType === 'admin';
    if (!isOwnConnections && !isAdmin) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const me = await User.findById(targetUserId)
      .populate('following', 'firstName lastName profilePicture specialization userType')
      .populate('followers', 'firstName lastName profilePicture specialization userType');
    if (!me) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, following: me.following, followers: me.followers });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching connections" });
  }
};

// Get basic public information of any user
export const getPublicProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select(
      'firstName lastName profilePicturePublicId userType specialization experience qualifications averageRating profileScore followers following'
    );
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Determine whether the requesting user is a verified doctor so we can
    // decide whether to include verifiedDoctorsOnly cases in the results.
    const requester = req.user as any;
    const requesterIsVerifiedDoctor =
      requester?.userType === 'doctor' && requester?.isVerifiedDoctor === true;

    const caseFilter: Record<string, any> = {
      doctor: userId,
      isActive: { $ne: false },
      $or: [
        { moderationStatus: 'approved' },
        { moderationStatus: { $exists: false } },
      ],
    };

    // Cases flagged verifiedDoctorsOnly must not appear for non-verified users
    // on a public profile page.
    if (!requesterIsVerifiedDoctor) {
      caseFilter.verifiedDoctorsOnly = { $ne: true };
    }

    const [badges, caseCount, cases] = await Promise.all([
      UserBadge.find({ user: userId, isVisible: true })
        .populate('badge')
        .sort({ earnedAt: -1 }),
      Case.countDocuments(caseFilter),
      // SECURITY: only return safe summary fields.
      // - 'content' does not exist on the Case schema (no-op but removed for clarity).
      // - 'comments' contains full clinical discussion threads with potential
      //   patient-identifiable detail — must not be returned on a public page.
      // - 'likes' is an array of user ObjectIds, leaking the social graph.
      // - 'patientInfo' embeds age, gender, medical history and medications.
      // None of these belong on a public profile card.
      Case.find(caseFilter)
        .select('_id title description specialization difficulty tags createdAt views')
        .sort({ createdAt: -1 })
        .limit(50),
    ]);

    const resolved = resolveProfilePictureUrl(user) as any;
    const { followers, following, ...publicUser } = resolved;

    res.json({
      success: true,
      data: {
        user: {
          ...publicUser,
          followersCount: Array.isArray(followers) ? followers.length : 0,
          followingCount: Array.isArray(following) ? following.length : 0,
        },
        badges,
        cases,
        stats: {
          caseCount,
          averageRating: Number(user.averageRating || 0),
          profileScore: Number(user.profileScore || 0),
          badgesEarned: badges.length,
        },
      },
    });
  } catch (error) {
    console.error('Get public profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Delete user account permanently
export const deleteAccount = async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const requestingUserId = (req.user!._id as any).toString();

  if (userId !== requestingUserId) {
    return res.status(403).json({
      success: false,
      message: 'You can only delete your own account'
    });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Blacklist the current JWT so it cannot be reused after deletion
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.decode(token) as { exp?: number } | null;
      const expiresAt = decoded?.exp
        ? new Date(decoded.exp * 1000)
        : new Date(Date.now() + 24 * 60 * 60 * 1000);
      await blacklistToken(token, expiresAt);
    } catch {
      // Non-fatal — proceed with deletion even if blacklisting fails
    }
  }

  const session = await mongoose.startSession();
  let committed = false;
  try {
    session.startTransaction();

    const userIdObj = new mongoose.Types.ObjectId(userId as string);

    // 1. Clean up User-to-User cross-references
    await User.updateMany(
      { following: userIdObj },
      { $pull: { following: userIdObj } },
      { session }
    );
    await User.updateMany(
      { followers: userIdObj },
      { $pull: { followers: userIdObj } },
      { session }
    );
    await User.updateMany(
      { mentorDoctor: userIdObj },
      { $set: { mentorDoctor: null } },
      { session }
    );

    // 2. Delete owned records (user's private data)
    await Diary.deleteMany({ user: userIdObj }, { session });
    await Flashcard.deleteMany({ user: userIdObj }, { session });
    await Collection.deleteMany({ user: userIdObj }, { session });
    await UserLearningPath.deleteMany({ user: userIdObj }, { session });
    await UserBadge.deleteMany({ user: userIdObj }, { session });
    await Notification.deleteMany({ recipient: userIdObj }, { session });
    await AICasePostSchedule.deleteMany({ author: userIdObj }, { session });

    // 3. Delete ratings and peer reviews (useless without either party)
    await Rating.deleteMany(
      { $or: [{ rater: userIdObj }, { ratee: userIdObj }] },
      { session }
    );
    await PeerReview.deleteMany(
      { $or: [{ reviewer: userIdObj }, { reviewee: userIdObj }] },
      { session }
    );

    // 4. Nullify optional reviewer references
    await Case.updateMany(
      { reviewedBy: userIdObj },
      { $set: { reviewedBy: null } },
      { session }
    );
    await UserBadge.updateMany(
      { verifiedBy: userIdObj },
      { $set: { verifiedBy: null } },
      { session }
    );
    await AICasePostSchedule.updateMany(
      { reviewedBy: userIdObj },
      { $set: { reviewedBy: null } },
      { session }
    );

    // 5. Soft-delete community content (consistent with existing isActive pattern)
    await Case.updateMany(
      { doctor: userIdObj, isActive: true },
      { $set: { isActive: false } },
      { session }
    );
    await Webinar.updateMany(
      { host: userIdObj, isActive: true },
      { $set: { isActive: false, status: 'cancelled' } },
      { session }
    );
    await JobOpportunity.updateMany(
      { postedBy: userIdObj, isActive: true },
      { $set: { isActive: false } },
      { session }
    );

    // 6. Set mentorship to completed if user was mentor or mentee
    await Mentorship.updateMany(
      { $or: [{ mentor: userIdObj }, { mentee: userIdObj }], status: { $ne: 'completed' } },
      { $set: { status: 'completed' } },
      { session }
    );

    // 7. Pull user from array references in shared content
    await Case.updateMany(
      { likes: userIdObj },
      { $pull: { likes: userIdObj } },
      { session }
    );
    await Case.updateMany(
      { starredBy: userIdObj },
      { $pull: { starredBy: userIdObj } },
      { session }
    );
    await Webinar.updateMany(
      { 'participants.user': userIdObj },
      { $pull: { participants: { user: userIdObj } } },
      { session }
    );
    await Webinar.updateMany(
      {},
      { $pull: { 'qna.$[].upvotes': userIdObj } },
      { session }
    );
    await JobOpportunity.updateMany(
      { 'applicants.user': userIdObj },
      { $pull: { applicants: { user: userIdObj } } },
      { session }
    );
    await Conversation.updateMany(
      { participants: userIdObj },
      { $pull: { participants: userIdObj } },
      { session }
    );
    await ResearchPaper.updateMany(
      {},
      { $pull: { 'comments.$[].likes': userIdObj } },
      { session }
    );

    // 8. Delete the user document
    await User.findByIdAndDelete(userIdObj, { session });

    await session.commitTransaction();
    committed = true;

    return res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    if (!committed) await session.abortTransaction();
    session.endSession();
  }
};

// Parse uploaded resume and update user profile
export const parseResume = async (req: AuthRequest, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No resume file uploaded'
      });
    }

    // 1. Extract raw text
    const text = await extractTextFromBuffer(file.buffer, file.mimetype, file.originalname);
    
    // 2. Parse details
    const parsedData = parseResumeText(text);

    // 3. Update the logged-in user profile in DB directly
    const user = await User.findById(req.user!._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Auto-populate / merge fields
    if (parsedData.skills && parsedData.skills.length > 0) {
      user.skills = Array.from(new Set([...(user.skills || []), ...parsedData.skills]));
    }
    if (parsedData.medicalSchool && !user.medicalSchool) {
      user.medicalSchool = parsedData.medicalSchool;
    }
    if (parsedData.experience > 0 && !user.experience) {
      user.experience = parsedData.experience;
    }
    if (parsedData.bio && (!user.bio || user.bio.length < 50)) {
      user.bio = parsedData.bio;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Resume parsed and profile updated successfully',
      data: {
        extracted: parsedData,
        user: {
          skills: user.skills,
          medicalSchool: user.medicalSchool,
          experience: user.experience,
          bio: user.bio
        }
      }
    });

  } catch (error: any) {
    console.error('Resume parsing error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error during resume parsing'
    });
  }
};
