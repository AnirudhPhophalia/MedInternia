import { Response } from 'express';
import Appointment, { AppointmentStatus } from '../models/Appointment';
import User, { IUser } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';

/**
 * Create a new appointment
 * SECURITY: patientId is ALWAYS derived from req.user._id, never from request body
 * This prevents users from creating appointments for other patients
 */
export const createAppointment = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user as IUser;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    if (user.userType !== 'patient') {
      throw new AppError('Only patients can create appointments', 403);
    }

    const { doctorId, scheduledDate, scheduledTime, reason } = req.body;

    if (!doctorId || !scheduledDate || !scheduledTime) {
      throw new AppError('Doctor ID, scheduled date, and time are required', 400);
    }

    // Verify doctor exists and is active
    const doctor = await User.findOne({
      _id: doctorId,
      userType: 'doctor',
      isActive: true
    });

    if (!doctor) {
      throw new AppError('Doctor not found or is not available', 404);
    }

    // Validate date is in the future
    const appointmentDate = new Date(scheduledDate);
    if (appointmentDate < new Date()) {
      throw new AppError('Appointment date must be in the future', 400);
    }

    // SECURITY: Use req.user._id for patientId, NEVER accept from request body
    const appointment = new Appointment({
      patientId: user._id, // ← Always from authenticated user
      doctorId,
      scheduledDate: appointmentDate,
      scheduledTime,
      reason,
      status: AppointmentStatus.SCHEDULED
    });

    await appointment.save();
    await appointment.populate('patientId', 'firstName lastName email');
    await appointment.populate('doctorId', 'firstName lastName specialization');

    res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      data: {
        appointment
      }
    });
  }
);

/**
 * Get appointments for current user
 * SECURITY: Patients only see their own appointments, doctors see appointments with them
 */
export const getAppointments = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user as IUser;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    const { page = 1, limit = 10, status } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 10));
    const skip = (pageNum - 1) * limitNum;

    let filter: any = {};

    // Build filter based on user type
    if (user.userType === 'patient') {
      filter.patientId = user._id;
    } else if (user.userType === 'doctor') {
      filter.doctorId = user._id;
    } else {
      throw new AppError('Only patients and doctors can view appointments', 403);
    }

    // Optional status filter
    if (status && Object.values(AppointmentStatus).includes(status as AppointmentStatus)) {
      filter.status = status;
    }

    const [appointments, total] = await Promise.all([
      Appointment.find(filter)
        .populate('patientId', 'firstName lastName email phone')
        .populate('doctorId', 'firstName lastName specialization')
        .sort({ scheduledDate: 1 })
        .skip(skip)
        .limit(limitNum),
      Appointment.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        appointments,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  }
);

/**
 * Get single appointment by ID
 * SECURITY: Users can only view their own appointments
 */
export const getAppointmentById = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user as IUser;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    const { id } = req.params;
    const appointment = await Appointment.findById(id)
      .populate('patientId', 'firstName lastName email phone')
      .populate('doctorId', 'firstName lastName specialization');

    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    // Verify user has access to this appointment
    const canView =
      user.userType === 'admin' ||
      (user.userType === 'patient' && appointment.patientId._id.toString() === user._id.toString()) ||
      (user.userType === 'doctor' && appointment.doctorId._id.toString() === user._id.toString());

    if (!canView) {
      throw new AppError('You do not have permission to view this appointment', 403);
    }

    res.json({
      success: true,
      data: {
        appointment
      }
    });
  }
);

/**
 * Reschedule an appointment
 * SECURITY: Only the original patient can reschedule their appointment
 */
export const rescheduleAppointment = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user as IUser;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    const { id } = req.params;
    const { scheduledDate, scheduledTime } = req.body;

    if (!scheduledDate || !scheduledTime) {
      throw new AppError('New date and time are required', 400);
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    // SECURITY: Only the patient who owns this appointment can reschedule
    if (appointment.patientId.toString() !== user._id.toString()) {
      throw new AppError('You can only reschedule your own appointments', 403);
    }

    if (appointment.status !== AppointmentStatus.SCHEDULED) {
      throw new AppError('Only scheduled appointments can be rescheduled', 400);
    }

    const newDate = new Date(scheduledDate);
    if (newDate < new Date()) {
      throw new AppError('Appointment date must be in the future', 400);
    }

    appointment.scheduledDate = newDate;
    appointment.scheduledTime = scheduledTime;
    appointment.status = AppointmentStatus.RESCHEDULED;
    await appointment.save();

    await appointment.populate('patientId', 'firstName lastName email');
    await appointment.populate('doctorId', 'firstName lastName specialization');

    res.json({
      success: true,
      message: 'Appointment rescheduled successfully',
      data: {
        appointment
      }
    });
  }
);

/**
 * Cancel an appointment
 * SECURITY: Patient or doctor can cancel their own appointments
 */
export const cancelAppointment = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user as IUser;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    const { id } = req.params;
    const { reason } = req.body;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    // SECURITY: Only patient or doctor associated with the appointment can cancel
    const canCancel =
      user.userType === 'admin' ||
      (user.userType === 'patient' && appointment.patientId.toString() === user._id.toString()) ||
      (user.userType === 'doctor' && appointment.doctorId.toString() === user._id.toString());

    if (!canCancel) {
      throw new AppError('You do not have permission to cancel this appointment', 403);
    }

    if (appointment.status !== AppointmentStatus.SCHEDULED && appointment.status !== AppointmentStatus.RESCHEDULED) {
      throw new AppError('Only scheduled or rescheduled appointments can be cancelled', 400);
    }

    appointment.status = AppointmentStatus.CANCELLED;
    appointment.cancellationReason = reason;
    appointment.cancelledBy = user.userType === 'patient' ? 'patient' : 'doctor';
    await appointment.save();

    await appointment.populate('patientId', 'firstName lastName email');
    await appointment.populate('doctorId', 'firstName lastName specialization');

    res.json({
      success: true,
      message: 'Appointment cancelled successfully',
      data: {
        appointment
      }
    });
  }
);

/**
 * Complete an appointment
 * SECURITY: Only doctors can mark their own appointments as completed
 */
export const completeAppointment = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user as IUser;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    if (user.userType !== 'doctor' && user.userType !== 'admin') {
      throw new AppError('Only doctors can mark appointments as completed', 403);
    }

    const { id } = req.params;
    const { notes } = req.body;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    // SECURITY: Doctor can only mark their own appointments as completed
    if (user.userType === 'doctor' && appointment.doctorId.toString() !== user._id.toString()) {
      throw new AppError('You can only complete your own appointments', 403);
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new AppError('Cancelled appointments cannot be completed', 400);
    }

    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new AppError('This appointment is already marked as completed', 400);
    }

    if (appointment.scheduledDate > new Date()) {
      throw new AppError('Future appointments cannot be completed', 400);
    }

    appointment.status = AppointmentStatus.COMPLETED;
    if (notes) {
      appointment.notes = notes;
    }
    await appointment.save();

    await appointment.populate('patientId', 'firstName lastName email');
    await appointment.populate('doctorId', 'firstName lastName specialization');

    res.json({
      success: true,
      message: 'Appointment marked as completed',
      data: {
        appointment
      }
    });
  }
);
