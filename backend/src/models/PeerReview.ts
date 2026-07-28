import mongoose, { Schema, Document } from "mongoose";

export interface IPeerReview extends Document {
  reviewer: mongoose.Types.ObjectId;
  reviewee: mongoose.Types.ObjectId;
  caseId: mongoose.Types.ObjectId;
  commentId: mongoose.Types.ObjectId;
  rating: number; // 1-5 scale
  feedback: {
    accuracy: number; // 1-5
    clarity: number; // 1-5
    completeness: number; // 1-5
    reasoning: number; // 1-5
  };
  comments: string;
  isHelpful: boolean;
  tags: string[]; // e.g., ['thorough', 'innovative', 'needs-improvement']
  createdAt: Date;
  updatedAt: Date;
}

const PeerReviewSchema = new Schema(
  {
    reviewer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Reviewer reference is required"],
    },
    reviewee: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Reviewee reference is required"],
    },
    caseId: {
      type: Schema.Types.ObjectId,
      ref: "Case",
      required: [true, "Case reference is required"],
    },
    commentId: {
      type: Schema.Types.ObjectId,
      required: [true, "Comment reference is required"],
    },
    rating: {
      type: Number,
      required: [true, "Overall rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    feedback: {
      accuracy: {
        type: Number,
        required: [true, "Accuracy rating is required"],
        min: [1, "Accuracy rating must be at least 1"],
        max: [5, "Accuracy rating cannot exceed 5"],
      },
      clarity: {
        type: Number,
        required: [true, "Clarity rating is required"],
        min: [1, "Clarity rating must be at least 1"],
        max: [5, "Clarity rating cannot exceed 5"],
      },
      completeness: {
        type: Number,
        required: [true, "Completeness rating is required"],
        min: [1, "Completeness rating must be at least 1"],
        max: [5, "Completeness rating cannot exceed 5"],
      },
      reasoning: {
        type: Number,
        required: [true, "Reasoning rating is required"],
        min: [1, "Reasoning rating must be at least 1"],
        max: [5, "Reasoning rating cannot exceed 5"],
      },
    },
    comments: {
      type: String,
      required: [true, "Review comments are required"],
      minlength: [10, "Comments must be at least 10 characters"],
      maxlength: [1000, "Comments cannot exceed 1000 characters"],
    },
    isHelpful: {
      type: Boolean,
      default: false,
    },
    tags: [
      {
        type: String,
        enum: [
          "thorough",
          "innovative",
          "needs-improvement",
          "well-reasoned",
          "creative",
          "evidence-based",
          "unclear",
          "incomplete",
        ],
      },
    ],
  },
  {
    timestamps: true,
  },
);

// Prevent duplicate reviews for same comment by same reviewer
PeerReviewSchema.index({ reviewer: 1, commentId: 1 }, { unique: true });

// Indexes for performance
PeerReviewSchema.index({ reviewee: 1, createdAt: -1 });
PeerReviewSchema.index({ caseId: 1 });
PeerReviewSchema.index({ rating: -1 });

export default mongoose.model<IPeerReview>("PeerReview", PeerReviewSchema);
