import { Request, Response } from 'express';
import { LeaderboardCache } from '../models/LeaderboardCache';

export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    const leaderboard = await LeaderboardCache.find()
      .sort({ totalPoints: -1 })
      .limit(100);

    return res.status(200).json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};
