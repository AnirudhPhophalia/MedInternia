import mongoose, { Document, Schema } from "mongoose";

export type AutomatedCaseDraftStatus =
  | "draft"
  | "review"
  | "approved"
  | "rejected"
  | "published";

export interface IAutomatedCaseDraft extends Document {
  title: string;
  description: string;
  symptoms: string[];
  patientInfo: {
    age?: number;
    gender?: "male" | "female" | "other";
    medicalHistory?: string[];
    currentMedications?: string[];
  };
  diagnosis?: string;
  treatment?: string;
  tags: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  specialization: string;
  generatedSummary: string;
  learningObjectives: string[];
  anonymizationNotes: string[];
  sourceCase?: mongoose.Types.ObjectId;
  scheduledFor: Date;
  intervalDays: number;
  status: AutomatedCaseDraftStatus;
  reviewNotes?: string;
  reviewedAt?: Date;
  publishedCase?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AutomatedCaseDraftSchema = new Schema<IAutomatedCaseDraft>(
  {
    title: {
      type: String,
      required: [true, "Draft title is required"],
      trim: true,
      maxlength: [200, "Title cannot be more than 200 characters"],
    },
    description: {
      type: String,
      required: [true, "Draft description is required"],
      trim: true,
      maxlength: [5000, "Description cannot be more than 5000 characters"],
    },
    symptoms: [
      {
        type: String,
        trim: true,
      },
    ],
    patientInfo: {
      age: {
        type: Number,
        min: [0, "Age cannot be negative"],
        max: [150, "Age cannot be more than 150"],
      },
      gender: {
        type: String,
        enum: ["male", "female", "other"],
      },
      medicalHistory: [
        {
          type: String,
          trim: true,
        },
      ],
      currentMedications: [
        {
          type: String,
          trim: true,
        },
      ],
    },
    diagnosis: {
      type: String,
      trim: true,
      maxlength: [1000, "Diagnosis cannot be more than 1000 characters"],
    },
    treatment: {
      type: String,
      trim: true,
      maxlength: [1000, "Treatment cannot be more than 1000 characters"],
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    difficulty: {
      type: String,
      required: [true, "Difficulty level is required"],
      enum: ["beginner", "intermediate", "advanced"],
    },
    specialization: {
      type: String,
      required: [true, "Specialization is required"],
      trim: true,
    },
    generatedSummary: {
      type: String,
      required: [true, "Generated summary is required"],
      trim: true,
      maxlength: [2000, "Generated summary cannot exceed 2000 characters"],
    },
    learningObjectives: [
      {
        type: String,
        trim: true,
      },
    ],
    anonymizationNotes: [
      {
        type: String,
        trim: true,
      },
    ],
    sourceCase: {
      type: Schema.Types.ObjectId,
      ref: "Case",
    },
    scheduledFor: {
      type: Date,
      required: [true, "Scheduled publish time is required"],
    },
    intervalDays: {
      type: Number,
      required: [true, "Case interval is required"],
      min: [1, "Interval must be at least 1 day"],
      max: [365, "Interval cannot exceed 365 days"],
    },
    status: {
      type: String,
      enum: ["draft", "review", "approved", "rejected", "published"],
      default: "review",
    },
    reviewNotes: {
      type: String,
      trim: true,
      maxlength: [1000, "Review notes cannot exceed 1000 characters"],
    },
    reviewedAt: {
      type: Date,
    },
    publishedCase: {
      type: Schema.Types.ObjectId,
      ref: "Case",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

AutomatedCaseDraftSchema.index({ createdBy: 1, createdAt: -1 });
AutomatedCaseDraftSchema.index({ status: 1, scheduledFor: 1 });
AutomatedCaseDraftSchema.index({ specialization: 1, difficulty: 1 });

export default mongoose.model<IAutomatedCaseDraft>(
  "AutomatedCaseDraft",
  AutomatedCaseDraftSchema,
);
