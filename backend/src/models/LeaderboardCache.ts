import mongoose, { Document, Schema } from 'mongoose';

export interface ILeaderboardCache extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  avatar?: string;
  totalPoints: number;
  lastUpdated: Date;
}

const leaderboardCacheSchema = new Schema<ILeaderboardCache>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  avatar: {
    type: String
  },
  totalPoints: {
    type: Number,
    default: 0,
    index: -1
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

export const LeaderboardCache = mongoose.model<ILeaderboardCache>('LeaderboardCache', leaderboardCacheSchema);
