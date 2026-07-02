import mongoose, { Document, Schema } from 'mongoose';

export interface IChallengeAttempt extends Document {
  challenge: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  score: number;
  status: 'passed' | 'failed';
  timeTaken: number; // in seconds
  createdAt: Date;
  updatedAt: Date;
}

const ChallengeAttemptSchema = new Schema<IChallengeAttempt>({
  challenge: {
    type: Schema.Types.ObjectId,
    ref: 'ClinicalChallenge',
    required: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['passed', 'failed'],
    required: true
  },
  timeTaken: {
    type: Number, // in seconds
    required: true
  }
}, {
  timestamps: true
});

ChallengeAttemptSchema.index({ user: 1, challenge: 1 });

export default mongoose.model<IChallengeAttempt>('ChallengeAttempt', ChallengeAttemptSchema);
