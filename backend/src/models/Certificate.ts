import mongoose, { Schema, Document } from "mongoose";

export interface ICertificate extends Document {
  intern: mongoose.Types.ObjectId;
  doctor: mongoose.Types.ObjectId;
  title: string;
  description: string;
  casesReviewed: number;
  pointsEarned: number;
  duration: {
    startDate: Date;
    endDate: Date;
  };
  skills: string[];
  certificateId: string; // Unique certificate identifier
  isVerified: boolean;
  verificationHash: string; // For blockchain-like verification
  downloadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const CertificateSchema = new Schema(
  {
    intern: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Intern reference is required"],
    },
    doctor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Doctor reference is required"],
    },
    title: {
      type: String,
      required: [true, "Certificate title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      required: [true, "Certificate description is required"],
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    casesReviewed: {
      type: Number,
      required: [true, "Number of cases reviewed is required"],
      min: [1, "Must have reviewed at least 1 case"],
    },
    pointsEarned: {
      type: Number,
      required: [true, "Points earned is required"],
      min: [0, "Points cannot be negative"],
    },
    duration: {
      startDate: {
        type: Date,
        required: [true, "Start date is required"],
      },
      endDate: {
        type: Date,
        required: [true, "End date is required"],
      },
    },
    skills: [
      {
        type: String,
      },
    ],
    certificateId: {
      type: String,
      required: [true, "Certificate ID is required"],
      unique: true,
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
    verificationHash: {
      type: String,
      required: [true, "Verification hash is required"],
    },
    downloadCount: {
      type: Number,
      default: 0,
      min: [0, "Download count cannot be negative"],
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for performance
CertificateSchema.index({ intern: 1, createdAt: -1 });
CertificateSchema.index({ doctor: 1 });
CertificateSchema.index({ certificateId: 1 }, { unique: true });
CertificateSchema.index({ isVerified: 1 });

export default mongoose.model<ICertificate>("Certificate", CertificateSchema);
