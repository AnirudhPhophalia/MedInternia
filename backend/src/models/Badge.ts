import mongoose, { Schema, Document } from "mongoose";

export interface IBadge extends Document {
  name: string;
  description: string;
  icon: string;
  category:
    "participation" | "quality" | "expertise" | "special" | "achievement";
  criteria: {
    type:
      | "points"
      | "cases_analyzed"
      | "upvotes_received"
      | "streak"
      | "special_achievement";
    threshold?: number;
    description: string;
  };
  color: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BadgeSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Badge name is required"],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Badge description is required"],
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    icon: {
      type: String,
      required: [true, "Badge icon is required"],
    },
    category: {
      type: String,
      required: [true, "Badge category is required"],
      enum: ["participation", "quality", "expertise", "special", "achievement"],
    },
    criteria: {
      type: {
        type: String,
        required: [true, "Criteria type is required"],
        enum: [
          "points",
          "cases_analyzed",
          "upvotes_received",
          "streak",
          "special_achievement",
        ],
      },
      threshold: {
        type: Number,
        min: [0, "Threshold cannot be negative"],
      },
      description: {
        type: String,
        required: [true, "Criteria description is required"],
      },
    },
    color: {
      type: String,
      required: [true, "Badge color is required"],
      match: [/^#[0-9A-F]{6}$/i, "Please provide a valid hex color"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for performance
BadgeSchema.index({ category: 1 });
BadgeSchema.index({ isActive: 1 });

export default mongoose.model<IBadge>("Badge", BadgeSchema);
