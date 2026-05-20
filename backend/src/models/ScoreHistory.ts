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
    required: true,
    immutable: true
  },
  intern: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    immutable: true
  },
  rubric: {
    diagnosticReasoning: { type: Number, required: true, min: 1, max: 5, immutable: true },
    completeness: { type: Number, required: true, min: 1, max: 5, immutable: true },
    evidenceSupport: { type: Number, required: true, min: 1, max: 5, immutable: true },
    riskAwareness: { type: Number, required: true, min: 1, max: 5, immutable: true },
    communicationClarity: { type: Number, required: true, min: 1, max: 5, immutable: true }
  },
  pointsAwarded: {
    type: Number,
    required: true,
    min: 0,
    immutable: true
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Indexes for fast querying of an intern's performance trends
ScoreHistorySchema.index({ intern: 1, createdAt: -1 });

export default mongoose.model<IScoreHistory>('ScoreHistory', ScoreHistorySchema);
