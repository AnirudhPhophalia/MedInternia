import mongoose, { Document, Schema } from 'mongoose';

export interface IFlashcard extends Document {
  user: mongoose.Types.ObjectId;
  caseId?: mongoose.Types.ObjectId;
  question: string;       // Front: case title / clinical scenario
  answer: string;         // Back: diagnosis / key pearl
  tags: string[];
  // Spaced repetition (SM-2 algorithm)
  interval: number;       // Days until next review
  repetitions: number;    // Number of successful reviews
  easeFactor: number;     // Difficulty multiplier (default 2.5)
  nextReview: Date;       // When to review again
  createdAt: Date;
  updatedAt: Date;
}

const FlashcardSchema = new Schema<IFlashcard>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  caseId: { type: Schema.Types.ObjectId, ref: 'Case' },
  question: { type: String, required: true },
  answer: { type: String, required: true },
  tags: [{ type: String }],
  // SM-2 spaced repetition fields
  interval: { type: Number, default: 1 },
  repetitions: { type: Number, default: 0 },
  easeFactor: { type: Number, default: 2.5 },
  nextReview: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.models.Flashcard || mongoose.model<IFlashcard>('Flashcard', FlashcardSchema);
