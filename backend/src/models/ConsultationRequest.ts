import mongoose, { Document, Schema } from 'mongoose';

export interface IConsultationMessage {
  sender: mongoose.Types.ObjectId;
  content: string;
  createdAt: Date;
}

export interface IConsultationRequest extends Document {
  case: mongoose.Types.ObjectId;
  requester: mongoose.Types.ObjectId;
  specialty: string;
  status: 'requested' | 'in_progress' | 'resolved';
  assignedConsultant?: mongoose.Types.ObjectId;
  rewardPoints: number;
  messages: IConsultationMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const ConsultationMessageSchema = new Schema<IConsultationMessage>({
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const ConsultationRequestSchema = new Schema<IConsultationRequest>({
  case: {
    type: Schema.Types.ObjectId,
    ref: 'Case',
    required: true
  },
  requester: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  specialty: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['requested', 'in_progress', 'resolved'],
    default: 'requested'
  },
  assignedConsultant: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  rewardPoints: {
    type: Number,
    required: true,
    min: [0, 'Reward points cannot be negative']
  },
  messages: [ConsultationMessageSchema]
}, {
  timestamps: true
});

ConsultationRequestSchema.index({ specialty: 1, status: 1 });
ConsultationRequestSchema.index({ requester: 1 });
ConsultationRequestSchema.index({ assignedConsultant: 1 });

export default mongoose.model<IConsultationRequest>('ConsultationRequest', ConsultationRequestSchema);
