import mongoose, { Document, Schema } from 'mongoose';

import crypto from 'crypto';

export interface IBlacklistedToken extends Document {
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

const BlacklistedTokenSchema = new Schema<IBlacklistedToken>({
  tokenHash: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

BlacklistedTokenSchema.index({ tokenHash: 1 });

export const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

export default mongoose.model<IBlacklistedToken>('BlacklistedToken', BlacklistedTokenSchema);
