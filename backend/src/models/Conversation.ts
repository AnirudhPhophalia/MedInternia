import mongoose, { Document, Schema } from 'mongoose';

export interface IConversation extends Document {
  participants: mongoose.Types.ObjectId[];
  lastMessage?: string;
  updatedAt: Date;
  createdAt: Date;
}

const ConversationSchema = new Schema({
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  lastMessage: {
    type: String
  }
}, {
  timestamps: true
});

// Index to ensure we can quickly find a conversation between exactly two specific users
ConversationSchema.index({ participants: 1 });

// Enforce at the database level that only one conversation can exist between a
// given participant pair. This prevents duplicate threads even under concurrent
// requests. The application must store participants in canonical (sorted) order
// so the compound index covers both orderings of a pair.
ConversationSchema.index(
  { "participants.0": 1, "participants.1": 1 },
  { unique: true }
);

export default mongoose.model<IConversation>('Conversation', ConversationSchema);
