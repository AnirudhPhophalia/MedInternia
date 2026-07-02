import mongoose, { Document, Schema } from 'mongoose';

export interface IBlacklistedToken extends Document {
  token: string;
  createdAt: Date;
}

const blacklistedTokenSchema = new Schema<IBlacklistedToken>(
  {
    token: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now, expires: 86400 } // Expires in 24 hours
  },
  { timestamps: true }
);

export default mongoose.model<IBlacklistedToken>('BlacklistedToken', blacklistedTokenSchema);
