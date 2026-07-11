import mongoose, { Document, Schema } from 'mongoose';

export interface ICollection extends Document {
  name: string;
  description?: string;
  user: mongoose.Types.ObjectId;
  isPublic: boolean;
  cases: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const CollectionSchema = new Schema<ICollection>({
  name: { type: String, required: true },
  description: { type: String },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  isPublic: { type: Boolean, default: false },
  cases: [{ type: Schema.Types.ObjectId, ref: 'Case' }]
}, { timestamps: true });

export default mongoose.models.Collection || mongoose.model<ICollection>('Collection', CollectionSchema);
