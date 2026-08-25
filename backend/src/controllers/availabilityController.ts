import { Response } from 'express';
import DoctorAvailability from '../models/DoctorAvailability';
import Appointment, { AppointmentStatus } from '../models/Appointment';
import User, { IUser } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { generateSlots, timeToMinutes } from '../services/slotService';

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

interface WeeklyInput {
  weekday: number;
  start: string;
  end: string;
}

/** Validate + normalize the weekly windows from a request body. */
function parseWeekly(raw: unknown): WeeklyInput[] {
  if (!Array.isArray(raw)) {
    throw new AppError('weekly must be an array of { weekday, start, end }', 400);
  }
  return raw.map((w: any, i) => {
    if (!w || typeof w !== 'object') {
      throw new AppError(`weekly[${i}] must be an object`, 400);
    }
    const weekday = Number(w.weekday);
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
      throw new AppError(`weekly[${i}].weekday must be an integer 0-6`, 400);
    }
    if (!TIME_RE.test(w.start) || !TIME_RE.test(w.end)) {
      throw new AppError(`weekly[${i}] start/end must be "HH:mm"`, 400);
    }
    if ((timeToMinutes(w.start) as number) >= (timeToMinutes(w.end) as number)) {
      throw new AppError(`weekly[${i}] start must be before end`, 400);
    }
    return { weekday, start: w.start, end: w.end };
  });
}

/**
 * Create or replace the authenticated doctor's availability.
 * @route PUT /api/doctors/me/availability
 */
export const setAvailability = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user as IUser;
  if (!user) throw new AppError('User not authenticated', 401);
  if (user.userType !== 'doctor') {
    throw new AppError('Only doctors can set availability', 403);
  }

  const weekly = parseWeekly(req.body?.weekly);

  const slotDurationMinutes = Number(req.body?.slotDurationMinutes ?? 30);
  if (!Number.isFinite(slotDurationMinutes) || slotDurationMinutes < 5 || slotDurationMinutes > 480) {
    throw new AppError('slotDurationMinutes must be between 5 and 480', 400);
  }

  const rawBlocked = req.body?.blockedDates ?? [];
  if (!Array.isArray(rawBlocked)) {
    throw new AppError('blockedDates must be an array of dates', 400);
  }
  const blockedDates = rawBlocked.map((d: any, i) => {
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) {
      throw new AppError(`blockedDates[${i}] is not a valid date`, 400);
    }
    return date;
  });

  const availability = await DoctorAvailability.findOneAndUpdate(
    { doctor: user._id },
    { doctor: user._id, weekly, slotDurationMinutes, blockedDates },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
  );

  res.status(200).json({
    success: true,
    message: 'Availability saved',
    data: { availability },
  });
});

/**
 * Get the authenticated doctor's own availability.
 * @route GET /api/doctors/me/availability
 */
export const getMyAvailability = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user as IUser;
  if (!user) throw new AppError('User not authenticated', 401);
  if (user.userType !== 'doctor') {
    throw new AppError('Only doctors have availability', 403);
  }

  const availability = await DoctorAvailability.findOne({ doctor: user._id });
  res.status(200).json({ success: true, data: { availability } });
});

/**
 * Get a doctor's open slots for a given date.
 * @route GET /api/doctors/:id/available-slots?date=YYYY-MM-DD
 */
export const getAvailableSlots = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const dateStr = req.query.date as string | undefined;
  if (!dateStr) {
    throw new AppError('A date query parameter (YYYY-MM-DD) is required', 400);
  }
  const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(dayStart.getTime())) {
    throw new AppError('date must be a valid YYYY-MM-DD value', 400);
  }
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const doctor = await User.findOne({ _id: id, userType: 'doctor', isActive: true }).select('_id');
  if (!doctor) throw new AppError('Doctor not found or is not available', 404);

  const availability = await DoctorAvailability.findOne({ doctor: id });
  if (!availability) {
    // A doctor who hasn't published a schedule simply has no bookable slots yet.
    return res.status(200).json({
      success: true,
      data: { date: dateStr, slots: [], hasAvailability: false },
    });
  }

  const bookedAppointments = await Appointment.find({
    doctorId: id,
    scheduledDate: { $gte: dayStart, $lt: dayEnd },
    status: { $in: [AppointmentStatus.SCHEDULED, AppointmentStatus.RESCHEDULED] },
  }).select('scheduledTime');

  const bookedTimes = bookedAppointments.map((a) => a.scheduledTime);
  const slots = generateSlots(availability, dayStart, bookedTimes);

  res.status(200).json({
    success: true,
    data: { date: dateStr, slots, hasAvailability: true },
  });
});
