import { Request, Response } from 'express';
import User from '../models/User';
import mongoose from 'mongoose';

// Toggle a bookmark for a specific item
export const toggleBookmark = async (req: Request, res: Response) => {
  try {
    const { userId, itemType, itemId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Determine the correct array based on itemType
    let targetArrayName: 'savedCases' | 'savedJobs' | 'savedWebinars';
    switch (itemType) {
      case 'case':
        targetArrayName = 'savedCases';
        break;
      case 'job':
        targetArrayName = 'savedJobs';
        break;
      case 'webinar':
        targetArrayName = 'savedWebinars';
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid itemType. Must be case, job, or webinar.' });
    }

    const targetArray = user[targetArrayName] || [];
    const itemIndex = targetArray.findIndex(id => id.toString() === itemId);
    let isBookmarked = false;

    if (itemIndex > -1) {
      // Remove bookmark
      targetArray.splice(itemIndex, 1);
    } else {
      // Add bookmark
      targetArray.push(new mongoose.Types.ObjectId(itemId));
      isBookmarked = true;
    }

    user[targetArrayName] = targetArray;
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        isBookmarked,
        itemId,
        itemType
      }
    });
  } catch (error) {
    console.error('Error toggling bookmark:', error);
    res.status(500).json({ success: false, message: 'Server error while toggling bookmark' });
  }
};

export const getSavedItems = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }

    const user = await User.findById(userId)
      .populate('savedCases')
      .populate('savedJobs')
      .populate('savedWebinars');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: {
        savedCases: user.savedCases || [],
        savedJobs: user.savedJobs || [],
        savedWebinars: user.savedWebinars || []
      }
    });
  } catch (error) {
    console.error('Error fetching saved items:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
