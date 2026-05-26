import { Response } from 'express';
import Case from '../models/Case';
import User from '../models/User';
import Rating from '../models/Rating';
import { AuthRequest } from '../middleware/auth';

// Rate and award points for a comment
export const rateComment = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { caseId, commentId } = req.params;
    const { rating, feedback, pointsAwarded } = req.body;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (user.userType !== 'doctor' && user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only doctors or admins can rate comments'
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Find the case and comment
    const caseData = await Case.findById(caseId);
    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: 'Case not found'
      });
    }

    const comment = caseData.comments.find(c => c._id?.toString() === commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check if comment author is an intern
    const commentAuthor = await User.findById(comment.author);
    if (!commentAuthor || commentAuthor.userType !== 'intern') {
      return res.status(400).json({
        success: false,
        message: 'Can only rate intern comments'
      });
    }

    // Check if already rated by this doctor
    const existingRating = await Rating.findOne({
      rater: user._id,
      commentId: commentId
    });

    if (existingRating) {
      return res.status(400).json({
        success: false,
        message: 'You have already rated this comment'
      });
    }

    // Create new rating
    const newRating = new Rating({
      rater: user._id as any,
      ratee: comment.author,
      caseId: caseId,
      commentId: commentId,
      rating: rating,
      feedback: feedback,
      pointsAwarded: pointsAwarded || rating * 2 // Default: 2 points per star
    });

    await newRating.save();

    // Update comment with rating
    comment.rating = rating;
    comment.ratedBy = user._id as any;
    await caseData.save();

    // Update intern's points and rating
    const pointsToAdd = newRating.pointsAwarded;
    const internUpdate = await User.findByIdAndUpdate(
      comment.author,
      {
        $inc: { 
          points: pointsToAdd,
          totalRatings: 1
        }
      },
      { new: true }
    );

    // Recalculate average rating
    if (internUpdate) {
      const allRatings = await Rating.find({ ratee: comment.author });
      const avgRating = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;
      internUpdate.averageRating = Math.round(avgRating * 100) / 100;
      await internUpdate.save();
    }

    res.status(201).json({
      success: true,
      message: 'Comment rated successfully',
      data: {
        rating: newRating,
        pointsAwarded: pointsToAdd
      }
    });
  } catch (error) {
    console.error('Rate comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Reply to a comment
export const replyToComment = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { caseId, commentId } = req.params;
    const { content } = req.body;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Reply content is required'
      });
    }

    const caseData = await Case.findById(caseId);
    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: 'Case not found'
      });
    }

    const parentComment = caseData.comments.find(c => c._id?.toString() === commentId);
    if (!parentComment) {
      return res.status(404).json({
        success: false,
        message: 'Parent comment not found'
      });
    }

    // Create reply as a new comment with parentComment reference
    const reply = {
      author: user._id as any,
      content: content.trim(),
      parentComment: commentId,
      replies: [],
      likes: []
    };

    caseData.comments.push(reply as any);
    await caseData.save();

    await caseData.populate('comments.author', 'firstName lastName userType');

    const addedReply = caseData.comments[caseData.comments.length - 1];

    res.status(201).json({
      success: true,
      message: 'Reply added successfully',
      data: {
        reply: addedReply
      }
    });
  } catch (error) {
    console.error('Reply to comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Like a comment
export const likeComment = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { caseId, commentId } = req.params;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const caseData = await Case.findById(caseId);
    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: 'Case not found'
      });
    }

    const comment = caseData.comments.find(c => c._id?.toString() === commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    const userIdString = user._id?.toString();
    const likeIndex = comment.likes.findIndex((like: any) => like.toString() === userIdString);

    let isLiked = false;
    
    if (likeIndex > -1) {
      // Unlike
      comment.likes.splice(likeIndex, 1);
      isLiked = false;
    } else {
      // Like
      comment.likes.push(user._id as any);
      isLiked = true;
    }

    await caseData.save();

    res.json({
      success: true,
      message: isLiked ? 'Comment liked successfully' : 'Comment unliked successfully',
      data: {
        isLiked,
        totalLikes: comment.likes.length
      }
    });
  } catch (error) {
    console.error('Like comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get leaderboard
export const getLeaderboard = async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 20, type = 'interns' } = req.query;

    let pipeline: any[] = [];

    if (type === 'interns') {
      pipeline = [
        { $match: { userType: 'intern' } },
        { $sort: { points: -1, averageRating: -1 } },
        { $limit: parseInt(limit as string) },
        {
          $project: {
            firstName: 1,
            lastName: 1,
            medicalSchool: 1,
            yearOfStudy: 1,
            points: 1,
            averageRating: 1,
            totalRatings: 1
          }
        }
      ];
    } else if (type === 'doctors') {
      pipeline = [
        { $match: { userType: 'doctor' } },
        { $sort: { points: -1 } },
        { $limit: parseInt(limit as string) },
        {
          $project: {
            firstName: 1,
            lastName: 1,
            specialization: 1,
            points: 1,
            experience: 1
          }
        }
      ];
    }

    const leaderboard = await User.aggregate(pipeline);

    res.json({
      success: true,
      data: {
        leaderboard,
        type
      }
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Award points to doctor for posting case
export const awardCasePoints = async (doctorId: string, caseId: string, points: number = 10) => {
  try {
    await User.findByIdAndUpdate(
      doctorId,
      { $inc: { points: points } }
    );

    await Case.findByIdAndUpdate(
      caseId,
      { pointsAwarded: points }
    );

    return true;
  } catch (error) {
    console.error('Award case points error:', error);
    return false;
  }
};

// Advanced search
export const advancedSearch = async (req: AuthRequest, res: Response) => {
  try {
    const {
      query,
      type, // 'cases', 'doctors', 'interns'
      specialization,
      difficulty,
      doctorName,
      disease,
      tags,
      page = 1,
      limit = 10
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    let results: any[] = [];
    let total = 0;

    if (type === 'cases' || !type) {
      const filter: any = { isActive: true };

      if (query) {
        filter.$or = [
          { title: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { diagnosis: { $regex: query, $options: 'i' } },
          { tags: { $in: [new RegExp(query as string, 'i')] } }
        ];
      }

      if (specialization) {
        filter.specialization = { $regex: specialization, $options: 'i' };
      }

      if (difficulty) {
        filter.difficulty = difficulty;
      }

      if (disease) {
        filter.$or = filter.$or || [];
        filter.$or.push(
          { diagnosis: { $regex: disease, $options: 'i' } },
          { symptoms: { $in: [new RegExp(disease as string, 'i')] } }
        );
      }

      if (tags) {
        const tagArray = Array.isArray(tags) ? tags : [tags];
        filter.tags = { $in: tagArray };
      }

      results = await Case.find(filter)
        .populate('doctor', 'firstName lastName specialization')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);

      total = await Case.countDocuments(filter);
    }

    if (type === 'doctors') {
      const filter: any = { userType: 'doctor' };

      if (query || doctorName) {
        const searchTerm = query || doctorName;
        filter.$or = [
          { firstName: { $regex: searchTerm, $options: 'i' } },
          { lastName: { $regex: searchTerm, $options: 'i' } },
          { specialization: { $regex: searchTerm, $options: 'i' } }
        ];
      }

      if (specialization) {
        filter.specialization = { $regex: specialization, $options: 'i' };
      }

      results = await User.find(filter)
        .select('firstName lastName specialization experience points')
        .sort({ points: -1 })
        .skip(skip)
        .limit(limitNum);

      total = await User.countDocuments(filter);
    }

    if (type === 'interns') {
      const filter: any = { userType: 'intern' };

      if (query) {
        filter.$or = [
          { firstName: { $regex: query, $options: 'i' } },
          { lastName: { $regex: query, $options: 'i' } },
          { medicalSchool: { $regex: query, $options: 'i' } },
          { interests: { $in: [new RegExp(query as string, 'i')] } }
        ];
      }

      results = await User.find(filter)
        .select('firstName lastName medicalSchool yearOfStudy points averageRating')
        .sort({ points: -1 })
        .skip(skip)
        .limit(limitNum);

      total = await User.countDocuments(filter);
    }

    res.json({
      success: true,
      data: {
        results,
        searchType: type || 'cases',
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Advanced search error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
