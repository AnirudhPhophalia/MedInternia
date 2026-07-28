import mongoose, { Schema, Document } from "mongoose";

export interface IUserBadge extends Document {
  user: mongoose.Types.ObjectId;
  badge: mongoose.Types.ObjectId;
  earnedAt: Date;
  caseId?: mongoose.Types.ObjectId; // The case that triggered this badge
  commentId?: mongoose.Types.ObjectId; // The comment that triggered this badge
  verifiedBy?: mongoose.Types.ObjectId; // Doctor who verified this achievement
  metadata?: {
    pointsEarned?: number;
    streak?: number;
    specialNote?: string;
  };
  isVisible: boolean; // User can choose to hide badges
}

const UserBadgeSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
    },
    badge: {
      type: Schema.Types.ObjectId,
      ref: "Badge",
      required: [true, "Badge reference is required"],
    },
    earnedAt: {
      type: Date,
      default: Date.now,
    },
    caseId: {
      type: Schema.Types.ObjectId,
      ref: "Case",
    },
    commentId: {
      type: Schema.Types.ObjectId,
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    metadata: {
      pointsEarned: {
        type: Number,
        min: [0, "Points earned cannot be negative"],
      },
      streak: {
        type: Number,
        min: [0, "Streak cannot be negative"],
      },
      specialNote: {
        type: String,
        maxlength: [200, "Special note cannot exceed 200 characters"],
      },
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index to prevent duplicate badges for same user
UserBadgeSchema.index({ user: 1, badge: 1 }, { unique: true });

// Indexes for performance
UserBadgeSchema.index({ user: 1, earnedAt: -1 });
UserBadgeSchema.index({ badge: 1 });
UserBadgeSchema.index({ verifiedBy: 1 });

export default mongoose.model<IUserBadge>("UserBadge", UserBadgeSchema);
