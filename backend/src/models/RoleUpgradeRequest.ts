import mongoose, { Schema, Document } from 'mongoose';

export type RoleUpgradeStatus = 'pending' | 'approved' | 'rejected';

export interface IRoleUpgradeRequest extends Document {
  intern: mongoose.Types.ObjectId;        // User submitting the request
  requestedRole: 'doctor';                // Only intern → doctor is supported
  status: RoleUpgradeStatus;
  // Optional fields the intern supplies to help admin KYC review
  licenseNumber?: string;
  specialization?: string;
  notes?: string;
  // Set by admin on resolution
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RoleUpgradeRequestSchema = new Schema<IRoleUpgradeRequest>(
  {
    intern: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    requestedRole: {
      type: String,
      enum: ['doctor'],
      required: true,
      default: 'doctor',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    licenseNumber: {
      type: String,
      trim: true,
    },
    specialization: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Rejection reason cannot exceed 500 characters'],
    },
  },
  { timestamps: true },
);

// One active (pending) request per intern at a time
RoleUpgradeRequestSchema.index(
  { intern: 1, status: 1 },
  { unique: true },
);

// Fast admin query for pending requests
RoleUpgradeRequestSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model<IRoleUpgradeRequest>(
  'RoleUpgradeRequest',
  RoleUpgradeRequestSchema,
);
