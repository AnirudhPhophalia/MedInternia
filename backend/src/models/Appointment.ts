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
        // Bug fix (#1051): Use this.isNew so the future-date check only runs
        // on document creation. Without this guard, every save() call on an
        // existing appointment (e.g. completing or cancelling a past appointment)
        // throws "Appointment date must be in the future", making it impossible
        // to complete any appointment whose scheduledDate has already passed.
        validator: function (this: any, date: Date) {
          if (!this.isNew) return true;
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

// Unique compound index to prevent double-booking (Issue #999 / #1229)
// status must NOT be part of the key — SCHEDULED and RESCHEDULED would otherwise
// both be allowed on the same doctor/date/time slot.
AppointmentSchema.index(
  { doctorId: 1, scheduledDate: 1, scheduledTime: 1 },
  {
    unique: true,
    // Partial index: only enforce uniqueness for active appointments
    partialFilterExpression: {
      status: { $in: [AppointmentStatus.SCHEDULED, AppointmentStatus.RESCHEDULED] }
    }
  }
);

export default mongoose.model<IAppointment>('Appointment', AppointmentSchema);
