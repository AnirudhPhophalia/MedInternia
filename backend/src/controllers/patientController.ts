import mongoose from 'mongoose';
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import Appointment, { AppointmentStatus } from '../models/Appointment';

const PATIENT_LIST_SELECT = '_id firstName lastName email';

// A doctor may only access a patient they actually treat. The relationship is
// established by a non-cancelled Appointment record linking the two accounts.
const hasDoctorPatientRelationship = async (doctorId: string, patientId: string): Promise<boolean> => {
  if (!mongoose.isValidObjectId(patientId)) return false;
  return !!(await Appointment.exists({
    doctorId,
    patientId,
    status: { $ne: AppointmentStatus.CANCELLED },
  }));
};

// Only the patient themself, their treating doctor(s), and admins may access a
// patient's sensitive profile (medical history, allergies, emergency contact).
const canAccessPatient = async (currentUser: AuthRequest['user'], patientId: string): Promise<boolean> => {
  const currentUserId = (currentUser!._id as any).toString();

  if (currentUser!.userType === 'patient') {
    return currentUserId === patientId;
  }
  if (currentUser!.userType === 'admin') {
    return true;
  }
  if (currentUser!.userType === 'doctor') {
    return hasDoctorPatientRelationship(currentUserId, patientId);
  }
  return false;
};

export const getPatients = async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.max(1, Math.min(parseInt(String(req.query.limit ?? '20'), 10) || 20, 100));
    const skip = (page - 1) * limit;
    const currentUser = req.user!;

    // authorize('doctor') also admits admins. Doctors only see patients they
    // treat (non-cancelled appointments); admins retain the full directory.
    const filter: Record<string, unknown> = { userType: 'patient', isActive: true };
    if (currentUser.userType !== 'admin') {
      const doctorId = (currentUser._id as any).toString();
      const relatedPatientIds = await Appointment.distinct('patientId', {
        doctorId,
        status: { $ne: AppointmentStatus.CANCELLED },
      });
      filter._id = { $in: relatedPatientIds };
    }

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
    const id = String(req.params.id ?? '');
    const currentUser = req.user!;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    // Access is limited to the patient themself, doctors with an existing
    // treatment relationship (via appointment records), and admins.
    const canAccess = await canAccessPatient(currentUser, id);
    if (!canAccess) {
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
    const id = String(req.params.id ?? '');
    const currentUser = req.user!;
    const { medicalHistory, allergies, emergencyContact } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    // Same access rules as reading: only the patient themself, their treating
    // doctor(s), and admins may modify sensitive medical information.
    const canAccess = await canAccessPatient(currentUser, id);
    if (!canAccess) {
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
