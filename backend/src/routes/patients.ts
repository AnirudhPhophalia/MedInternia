import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// Get all patients (only doctors can access)
router.get('/', authenticate as any, authorize('doctor')as any, async (req: any, res:any) => {
  try {
    const patients = await User.find({ userType: 'patient', isActive: true })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        patients,
        total: patients.length
      }
    });
  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get patient by ID (doctors can access, patients can only access their own)
router.get('/:id', authenticate as any, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const currentUser = req.user!;

    // Patients can only access their own profile
    if (currentUser.userType === 'patient' && (currentUser._id as any).toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const patient = await User.findOne({
      _id: id,
      userType: 'patient',
      isActive: true
    }).select('-password');

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    res.json({
      success: true,
      data: {
        patient
      }
    });
  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update patient medical information (doctors can update, patients can update their own)
router.put('/:id/medical-info', authenticate as any, async (req: any, res:any) => {
  try {
    const { id } = req.params;
    const currentUser = req.user!;
    const { medicalHistory, allergies, emergencyContact } = req.body;

    // Patients can only update their own profile
    if (currentUser.userType === 'patient' && (currentUser._id as any).toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const updateData: any = {};
    if (medicalHistory !== undefined) updateData.medicalHistory = medicalHistory;
    if (allergies !== undefined) updateData.allergies = allergies;
    if (emergencyContact !== undefined) updateData.emergencyContact = emergencyContact;

    const patient = await User.findOneAndUpdate(
      { _id: id, userType: 'patient' },
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    res.json({
      success: true,
      message: 'Medical information updated successfully',
      data: {
        patient
      }
    });
  } catch (error) {
    console.error('Update patient medical info error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
