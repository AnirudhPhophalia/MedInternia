import mongoose, { Document, Schema } from 'mongoose';

export interface IRating extends Document {
  rater: mongoose.Types.ObjectId; // Doctor who gave the rating
  ratee: mongoose.Types.ObjectId; // Intern who received the rating
  caseId: mongoose.Types.ObjectId; // Case where the rating was given
  commentId: mongoose.Types.ObjectId; // Specific comment that was rated
  rating: number; // 1-5 stars
  feedback?: string; // Optional feedback message
  pointsAwarded: number; // Points given to the intern
  createdAt: Date;
}

const RatingSchema = new Schema<IRating>({
  rater: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ratee: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  caseId: {
    type: Schema.Types.ObjectId,
    ref: 'Case',
    required: true
  },
  commentId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  feedback: {
    type: String,
    trim: true,
    maxlength: [500, 'Feedback cannot be more than 500 characters']
  },
  pointsAwarded: {
    type: Number,
    default: 0,
    min: [0, 'Points awarded cannot be negative'],
    max: [10, 'Points awarded cannot exceed 10']
  }
}, {
  timestamps: true
});

// Ensure one rating per comment by same doctor
RatingSchema.index({ rater: 1, commentId: 1 }, { unique: true });

// Indexes for better performance
RatingSchema.index({ ratee: 1 });
RatingSchema.index({ caseId: 1 });
RatingSchema.index({ createdAt: -1 });

export default mongoose.model<IRating>('Rating', RatingSchema);
