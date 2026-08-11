import { Router } from 'express';
import { authenticate, authorize, optionalAuthenticate } from '../middleware/auth';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';
import { createSafeRegexFilter } from '../utils/searchUtils';

const router = Router();

// Explicit allowlist of fields safe to expose publicly on doctor listing/detail
// endpoints. Intentionally excludes PII such as phone, address, dateOfBirth,
// emergencyContact, medicalHistory, allergies, loginAttempts, lockoutUntil,
// and passwordChangedAt which have no business being visible to anonymous callers.
const DOCTOR_PUBLIC_SELECT =
  'firstName lastName specialization experience qualifications isVerifiedDoctor profilePicture bio createdAt';

// Get all doctors
router.get('/', optionalAuthenticate, async (req: AuthRequest, res) => {
  try {
    const { specialization } = req.query;

    const filter: any = { userType: 'doctor', isActive: true };

    // Bug fix: escape and length-validate specialization input via
    // createSafeRegexFilter to prevent ReDoS via catastrophically
    // backtracking patterns (e.g. ((a+)+)$).
    if (specialization) {
      const safeFilter = createSafeRegexFilter(specialization, 100);
      if (safeFilter) {
        filter.specialization = safeFilter;
      }
    }

    // Bug fix: paginate results — loading the entire doctors collection into
    // memory on every request does not scale.
    const { page, limit, skip } = parsePagination(req.query as Record<string, any>);

    const [doctors, total] = await Promise.all([
      User.find(filter)
        // Bug fix: use an explicit allowlist instead of .select('-password').
        // The exclusion approach still exposes phone, address, dateOfBirth,
        // loginAttempts, lockoutUntil etc. to unauthenticated callers.
        .select(DOCTOR_PUBLIC_SELECT)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        doctors,
        ...buildPaginationMeta(page, limit, total),
      },
    });
  } catch (error) {
    console.error('Get doctors error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get specializations list
router.get('/meta/specializations', authenticate, async (req: AuthRequest, res) => {
  try {
    const specializations = await User.distinct('specialization', {
      userType: 'doctor',
      isActive: true,
      specialization: { $exists: true, $ne: null }
    });

    res.json({
      success: true,
      data: {
        specializations
      }
    });
  } catch (error) {
    console.error('Get specializations error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get doctor by ID
router.get('/:id', optionalAuthenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const doctor = await User.findOne({
      _id: id,
      userType: 'doctor',
      isActive: true
    }).select(DOCTOR_PUBLIC_SELECT);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    res.json({
      success: true,
      data: {
        doctor
      }
    });
  } catch (error) {
    console.error('Get doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update doctor professional information (only the doctor themselves)
router.put('/:id/professional-info', authenticate, authorize('doctor'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user!;
    const { specialization, experience, qualifications } = req.body;

    // Doctors can only update their own profile
    if ((currentUser._id as any).toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const updateData: any = {};
    if (specialization !== undefined) updateData.specialization = specialization;
    if (experience !== undefined) updateData.experience = experience;
    if (qualifications !== undefined) updateData.qualifications = qualifications;

    const doctor = await User.findOneAndUpdate(
      { _id: id, userType: 'doctor' },
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    res.json({
      success: true,
      message: 'Professional information updated successfully',
      data: {
        doctor
      }
    });
  } catch (error) {
    console.error('Update doctor professional info error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get mentees of a doctor
router.get('/:id/mentees', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user!;
    const canViewMentees =
      currentUser.userType === 'admin' ||
      (currentUser.userType === 'doctor' && (currentUser._id as any).toString() === id);

    if (!canViewMentees) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const mentees = await User.find({ userType: 'intern', mentorDoctor: id, isActive: true })
      .select('firstName lastName email medicalSchool yearOfStudy points averageRating streak');
    res.json({
      success: true,
      data: {
        mentees
      }
    });
  } catch (error) {
    console.error('Get mentees error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
