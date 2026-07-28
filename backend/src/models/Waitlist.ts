import mongoose, { Schema, Document } from "mongoose";

export interface IWaitlist extends Document {
  email: string;
  status: "pending" | "notified";
  createdAt: Date;
  updatedAt: Date;
}

const WaitlistSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
        "Please provide a valid email",
      ],
    },
    status: {
      type: String,
      enum: ["pending", "notified"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  },
);

WaitlistSchema.index({ email: 1 }, { unique: true });
WaitlistSchema.index({ status: 1 });

export default mongoose.model<IWaitlist>("Waitlist", WaitlistSchema);
