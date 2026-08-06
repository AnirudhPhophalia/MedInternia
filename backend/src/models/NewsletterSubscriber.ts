import mongoose, { Schema, Document } from 'mongoose';

export interface INewsletterSubscriber extends Document {
  email: string;
  status: 'active' | 'unsubscribed';
  createdAt: Date;
  updatedAt: Date;
}

const NewsletterSubscriberSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
        'Please provide a valid email',
      ],
    },
    status: {
      type: String,
      enum: ['active', 'unsubscribed'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  },
);

NewsletterSubscriberSchema.index({ email: 1 }, { unique: true });
NewsletterSubscriberSchema.index({ status: 1 });

export default mongoose.model<INewsletterSubscriber>(
  'NewsletterSubscriber',
  NewsletterSubscriberSchema,
);
