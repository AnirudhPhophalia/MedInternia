import mongoose, { Document, Schema } from 'mongoose';

export interface IChallengeQuestion {
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  points: number;
}

export interface IClinicalChallenge extends Document {
  title: string;
  description: string;
  specialty: string;
  timeLimit: number; // in minutes
  questions: IChallengeQuestion[];
  passingScore: number; // minimum points to pass
  badgeName: string;
  createdAt: Date;
  updatedAt: Date;
}

const ChallengeQuestionSchema = new Schema<IChallengeQuestion>({
  questionText: {
    type: String,
    required: true,
    trim: true
  },
  options: [{
    type: String,
    required: true,
    trim: true
  }],
  correctOptionIndex: {
    type: Number,
    required: true,
    min: 0
  },
  points: {
    type: Number,
    required: true,
    default: 10
  }
}, { _id: false });

const ClinicalChallengeSchema = new Schema<IClinicalChallenge>({
  title: {
    type: String,
    required: [true, 'Challenge title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Challenge description is required'],
    trim: true
  },
  specialty: {
    type: String,
    required: true,
    trim: true
  },
  timeLimit: {
    type: Number,
    required: true,
    default: 15 // minutes
  },
  questions: [ChallengeQuestionSchema],
  passingScore: {
    type: Number,
    required: true,
    default: 30
  },
  badgeName: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true
});

ClinicalChallengeSchema.index({ specialty: 1 });

export default mongoose.model<IClinicalChallenge>('ClinicalChallenge', ClinicalChallengeSchema);
