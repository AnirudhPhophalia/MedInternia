import mongoose, { Document, Schema } from 'mongoose';

/**
 * A doctor's bookable schedule (Issue: doctor availability & bookable slots).
 *
 * Before this, a patient could book an appointment at any arbitrary date/time.
 * This model lets a doctor declare recurring weekly working windows, a slot
 * length, and one-off blocked dates; slotService turns it into concrete open
 * slots, and appointment booking is constrained to those slots.
 */

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export interface IWeeklyWindow {
  weekday: number; // 0 = Sunday … 6 = Saturday
  start: string; // "HH:mm"
  end: string; // "HH:mm"
}

export interface IDoctorAvailability extends Document {
  doctor: mongoose.Types.ObjectId;
  weekly: IWeeklyWindow[];
  slotDurationMinutes: number;
  blockedDates: Date[];
  createdAt: Date;
  updatedAt: Date;
}

const WeeklyWindowSchema = new Schema<IWeeklyWindow>(
  {
    weekday: {
      type: Number,
      required: true,
      min: [0, 'weekday must be between 0 (Sunday) and 6 (Saturday)'],
      max: [6, 'weekday must be between 0 (Sunday) and 6 (Saturday)'],
    },
    start: {
      type: String,
      required: true,
      validate: { validator: (v: string) => TIME_RE.test(v), message: 'start must be "HH:mm"' },
    },
    end: {
      type: String,
      required: true,
      validate: { validator: (v: string) => TIME_RE.test(v), message: 'end must be "HH:mm"' },
    },
  },
  { _id: false },
);

const DoctorAvailabilitySchema = new Schema<IDoctorAvailability>(
  {
    doctor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    weekly: { type: [WeeklyWindowSchema], default: [] },
    slotDurationMinutes: {
      type: Number,
      required: true,
      default: 30,
      min: [5, 'slotDurationMinutes must be at least 5'],
      max: [480, 'slotDurationMinutes must be at most 480'],
    },
    blockedDates: { type: [Date], default: [] },
  },
  { timestamps: true },
);

const DoctorAvailability = mongoose.model<IDoctorAvailability>(
  'DoctorAvailability',
  DoctorAvailabilitySchema,
);

export default DoctorAvailability;
