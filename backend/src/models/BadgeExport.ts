import mongoose, { Schema, Document } from 'mongoose';

export type BadgeExportProvider = 'linkedin' | 'github';
export type BadgeExportStatus = 'unavailable' | 'succeeded' | 'failed';

export interface IBadgeExport extends Document {
  user: mongoose.Types.ObjectId;
  provider: BadgeExportProvider;
  status: BadgeExportStatus;
  message: string;
  reference?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BadgeExportSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ['linkedin', 'github'],
      required: true,
    },
    status: {
      type: String,
      enum: ['unavailable', 'succeeded', 'failed'],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    reference: {
      type: String,
    },
  },
  { timestamps: true },
);

export default mongoose.model<IBadgeExport>('BadgeExport', BadgeExportSchema);
