import cron from 'node-cron';
import User from '../models/User';
import { LeaderboardCache } from '../models/LeaderboardCache';

export const generateLeaderboard = async (): Promise<void> => {
  try {
    console.log('Starting leaderboard generation pipeline...');
    
    await User.aggregate([
      {
        $lookup: {
          from: 'cases',
          localField: '_id',
          foreignField: 'author',
          as: 'cases'
        }
      },
      {
        $lookup: {
          from: 'peerreviews',
          localField: '_id',
          foreignField: 'reviewer', // Changed to reviewer as per PeerReview model
          as: 'reviews'
        }
      },
      {
        $addFields: {
          totalPoints: {
            $add: [
              { $multiply: [{ $size: '$cases' }, 10] },
              { $multiply: [{ $size: '$reviews' }, 5] }
            ]
          },
          userId: '$_id',
          lastUpdated: new Date(),
          name: { $concat: ['$firstName', ' ', '$lastName'] }
        }
      },
      {
        $project: {
          _id: 1,
          userId: 1,
          name: 1,
          avatar: '$profilePicture',
          totalPoints: 1,
          lastUpdated: 1
        }
      },
      {
        $merge: {
          into: 'leaderboardcaches',
          on: '_id',
          whenMatched: 'replace',
          whenNotMatched: 'insert'
        }
      }
    ]);

    console.log('Leaderboard generation completed.');
  } catch (error) {
    console.error('Error generating leaderboard:', error);
  }
};

// Start the cron job
export const startLeaderboardCron = () => {
  // Run every 15 minutes
  cron.schedule('*/15 * * * *', generateLeaderboard);
  console.log('Leaderboard cron job scheduled (every 15 minutes).');
};
