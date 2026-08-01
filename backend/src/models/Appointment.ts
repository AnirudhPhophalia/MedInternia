import mongoose, { Document, Schema } from 'mongoose';

export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  RESCHEDULED = 'rescheduled'
}

export interface IAppointment extends Document {
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  scheduledDate: Date;
  scheduledTime: string;
  status: AppointmentStatus;
  reason?: string;
  notes?: string;
  cancellationReason?: string;
  cancelledBy?: 'patient' | 'doctor';
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema = new Schema<IAppointment>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient ID is required'],
      index: true
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Doctor ID is required'],
      index: true
    },
    scheduledDate: {
      type: Date,
      required: [true, 'Appointment date is required'],
      validate: {
        validator: function (date: Date) {
          return date > new Date();
        },
        message: 'Appointment date must be in the future'
      }
    },
    scheduledTime: {
      type: String,
      required: [true, 'Appointment time is required'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide a valid time in HH:mm format']
    },
    status: {
      type: String,
      enum: Object.values(AppointmentStatus),
      default: AppointmentStatus.SCHEDULED,
      index: true
    },
    reason: {
      type: String,
      maxlength: [500, 'Reason cannot exceed 500 characters']
    },
    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters']
    },
    cancellationReason: {
      type: String,
      maxlength: [500, 'Cancellation reason cannot exceed 500 characters']
    },
    cancelledBy: {
      type: String,
      enum: ['patient', 'doctor'],
      sparse: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index for efficient querying of patient and doctor appointments
AppointmentSchema.index({ patientId: 1, scheduledDate: 1 });
AppointmentSchema.index({ doctorId: 1, scheduledDate: 1 });

// Unique compound index to prevent double-booking (Issue #999)
// Prevents the same doctor from having multiple appointments at the same time slot
// Only applies to scheduled appointments (cancelled appointments don't block slots)
AppointmentSchema.index(
  { doctorId: 1, scheduledDate: 1, scheduledTime: 1, status: 1 },
  {
    unique: true,
    sparse: true,
    // Partial index: only enforce uniqueness for scheduled appointments
    partialFilterExpression: {
      status: { $in: [AppointmentStatus.SCHEDULED, AppointmentStatus.RESCHEDULED] }
    }
  }
);

export default mongoose.model<IAppointment>('Appointment', AppointmentSchema);
