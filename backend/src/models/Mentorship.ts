import mongoose, { Document, Schema } from 'mongoose';

export interface IMentorshipGoal {
  _id?: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  isCompleted: boolean;
  createdAt?: Date;
}

export interface IMentorshipMeeting {
  _id?: mongoose.Types.ObjectId;
  scheduledAt: Date;
  topic: string;
  link?: string;
  notes?: string;
}

export interface IMentorship extends Document {
  mentor: mongoose.Types.ObjectId;
  mentee: mongoose.Types.ObjectId;
  status: 'pending' | 'active' | 'rejected' | 'completed';
  specialtyRequested: string;
  initialMessage: string;
  goals: IMentorshipGoal[];
  meetings: IMentorshipMeeting[];
  createdAt: Date;
  updatedAt: Date;
}

const MentorshipSchema = new Schema<IMentorship>({
  mentor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  mentee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { 
    type: String, 
    enum: ['pending', 'active', 'rejected', 'completed'], 
    default: 'pending' 
  },
  specialtyRequested: { type: String, required: true },
  initialMessage: { type: String, required: true },
  goals: [{
    title: { type: String, required: true },
    description: { type: String },
    isCompleted: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],
  meetings: [{
    scheduledAt: { type: Date, required: true },
    topic: { type: String, required: true },
    link: { type: String },
    notes: { type: String }
  }]
}, { timestamps: true });

export default mongoose.models.Mentorship || mongoose.model<IMentorship>('Mentorship', MentorshipSchema);
