import mongoose, { Document, Schema } from 'mongoose';

export interface IScoreHistory extends Document {
  doctor: mongoose.Types.ObjectId; // Doctor who awarded the score
  intern: mongoose.Types.ObjectId; // Intern who received the score
  rubric: {
    diagnosticReasoning: number;
    completeness: number;
    evidenceSupport: number;
    riskAwareness: number;
    communicationClarity: number;
  };
  pointsAwarded: number; // Calculated total points
  createdAt: Date;
}

const ScoreHistorySchema = new Schema<IScoreHistory>({
  doctor: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  intern: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rubric: {
    diagnosticReasoning: { type: Number, required: true, min: 1, max: 5 },
    completeness: { type: Number, required: true, min: 1, max: 5 },
    evidenceSupport: { type: Number, required: true, min: 1, max: 5 },
    riskAwareness: { type: Number, required: true, min: 1, max: 5 },
    communicationClarity: { type: Number, required: true, min: 1, max: 5 }
  },
  pointsAwarded: {
    type: Number,
    required: true,
    min: 0
  }
}, {
  timestamps: { createdAt: true, updatedAt: false } // Immutable, so only createdAt
});

// Indexes for fast querying of an intern's performance trends
ScoreHistorySchema.index({ intern: 1, createdAt: -1 });

export default mongoose.model<IScoreHistory>('ScoreHistory', ScoreHistorySchema);
