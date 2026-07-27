import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';

const PATIENT_LIST_SELECT = '_id firstName lastName email';

export const getPatients = async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.max(1, Math.min(parseInt(String(req.query.limit ?? '20'), 10) || 20, 100));
    const skip = (page - 1) * limit;

    const filter = { userType: 'patient' as const, isActive: true };

    const [patients, total] = await Promise.all([
      User.find(filter)
        .select(PATIENT_LIST_SELECT)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        patients,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const getPatientById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUser = req.user!;
    const isOwnPatientProfile =
      currentUser.userType === 'patient' && (currentUser._id as any).toString() === id;
    const canReadPatient = ['doctor', 'admin'].includes(currentUser.userType);

    if (!isOwnPatientProfile && !canReadPatient) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const patient = await User.findOne({
      _id: id,
      userType: 'patient',
      isActive: true,
    }).select('-password');

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    res.json({
      success: true,
      data: {
        patient,
      },
    });
  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const updatePatientMedicalInfo = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUser = req.user!;
    const { medicalHistory, allergies, emergencyContact } = req.body;
    const isOwnPatientProfile =
      currentUser.userType === 'patient' && (currentUser._id as any).toString() === id;
    const canUpdatePatient = ['doctor', 'admin'].includes(currentUser.userType);

    if (!isOwnPatientProfile && !canUpdatePatient) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
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
        message: 'Patient not found',
      });
    }

    res.json({
      success: true,
      message: 'Medical information updated successfully',
      data: {
        patient,
      },
    });
  } catch (error) {
    console.error('Update patient medical info error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
