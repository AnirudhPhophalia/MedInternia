import { Response } from 'express';
import mongoose from 'mongoose';
import ClinicalChallenge from '../models/ClinicalChallenge';
import ChallengeAttempt from '../models/ChallengeAttempt';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';

// Create a new clinical challenge (Admin only)
export const createChallenge = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { title, description, specialty, timeLimit, questions, passingScore, badgeName } = req.body;

    if (!title || !specialty || !questions || !badgeName) {
      throw new AppError('Missing required fields for challenge creation', 400);
    }

    const challenge = await ClinicalChallenge.create({
      title,
      description,
      specialty,
      timeLimit: Number(timeLimit) || 15,
      questions,
      passingScore: Number(passingScore) || 30,
      badgeName
    });

    res.status(201).json({
      success: true,
      message: 'Clinical challenge created successfully',
      data: {
        challenge
      }
    });
  }
);

// Get list of challenges (hiding correctOptionIndex)
export const getChallenges = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user;

    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    const challenges = await ClinicalChallenge.find();
    
    // Hide correctOptionIndex for students
    const sanitized = challenges.map(ch => {
      const copy = ch.toObject();
      copy.questions = copy.questions.map((q: any) => {
        const { correctOptionIndex, ...rest } = q;
        return rest;
      });
      return copy;
    });

    res.json({
      success: true,
      data: {
        challenges: sanitized
      }
    });
  }
);

// Get challenge by ID (hiding correctOptionIndex)
export const getChallengeById = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user;
    const { challengeId } = req.params;

    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    const challenge = await ClinicalChallenge.findById(challengeId);
    if (!challenge) {
      throw new AppError('Challenge not found', 404);
    }

    const sanitized = challenge.toObject();
    sanitized.questions = sanitized.questions.map((q: any) => {
      const { correctOptionIndex, ...rest } = q;
      return rest;
    });

    res.json({
      success: true,
      data: {
        challenge: sanitized
      }
    });
  }
);

// Submit answers for clinical challenge assessment
export const submitAttempt = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user as any;
    const { challengeId } = req.params;
    const { answers, timeTaken } = req.body; // answers is an array of selected option indexes matching questions order

    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    if (!Array.isArray(answers)) {
      throw new AppError('Answers must be submitted as an array of option indexes', 400);
    }

    const challenge = await ClinicalChallenge.findById(challengeId);
    if (!challenge) {
      throw new AppError('Challenge not found', 404);
    }

    let calculatedScore = 0;
    const questionsList = challenge.questions;

    // Calculate score
    questionsList.forEach((q, idx) => {
      const submittedOption = answers[idx];
      if (submittedOption !== undefined && Number(submittedOption) === q.correctOptionIndex) {
        calculatedScore += q.points;
      }
    });

    const isPassed = calculatedScore >= challenge.passingScore;
    const status = isPassed ? 'passed' : 'failed';

    // Save attempt
    const attempt = await ChallengeAttempt.create({
      challenge: challenge._id,
      user: new mongoose.Types.ObjectId(user._id),
      score: calculatedScore,
      status,
      timeTaken: Number(timeTaken) || 0
    });

    // If passed, award badge and bonus points
    let badgeAwarded = false;
    let pointsAwarded = 0;
    if (isPassed) {
      const student = await User.findById(user._id);
      if (student) {
        if (!student.badges) student.badges = [];
        if (!student.badges.includes(challenge.badgeName)) {
          student.badges.push(challenge.badgeName);
          badgeAwarded = true;
        }
        // Award 50 bonus reward points for passing a challenge!
        student.points = (student.points || 0) + 50;
        pointsAwarded = 50;
        await student.save();
      }
    }

    res.json({
      success: true,
      message: isPassed ? 'Congratulations! You passed the challenge.' : 'Challenge attempt finished.',
      data: {
        attempt,
        score: calculatedScore,
        passingScore: challenge.passingScore,
        status,
        badgeAwarded,
        pointsAwarded
      }
    });
  }
);
