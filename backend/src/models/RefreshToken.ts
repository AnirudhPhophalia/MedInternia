import mongoose, { Document, Schema } from 'mongoose';

export interface IRefreshToken extends Document {
  token: string;
  userId: mongoose.Types.ObjectId;
  expiresAt: Date;
  isRevoked: boolean;
  replacedByToken?: string;
  createdAt: Date;
}

const RefreshTokenSchema = new Schema<IRefreshToken>({
  token: {
    type: String,
    required: true,
    index: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  isRevoked: {
    type: Boolean,
    default: false,
  },
  replacedByToken: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema);
