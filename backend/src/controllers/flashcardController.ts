import { Request, Response } from 'express';
import Flashcard from '../models/Flashcard';
import { parsePagination, buildPaginationMeta } from '../utils/pagination';

/**
 * SM-2 Spaced Repetition Algorithm
 * quality: 0-5 (0=total blackout, 5=perfect response)
 */
function sm2(card: { interval: number; repetitions: number; easeFactor: number }, quality: number) {
  let { interval, repetitions, easeFactor } = card;

  if (quality >= 3) {
    // Correct response
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetitions += 1;
  } else {
    // Incorrect — reset
    repetitions = 0;
    interval = 1;
  }

  // Update ease factor (min 1.3)
  easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return { interval, repetitions, easeFactor, nextReview };
}

// @route POST /api/flashcards
// @desc  Create a flashcard (optionally from a case)
export const createFlashcard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { question, answer, tags, caseId } = req.body;
    if (!question || !answer) {
      res.status(400).json({ success: false, message: 'Question and answer are required' });
      return;
    }

    const flashcard = await Flashcard.create({
      user: (req as any).user.id,
      question,
      answer,
      tags: tags || [],
      caseId: caseId || undefined,
    });

    res.status(201).json({ success: true, data: flashcard });
  } catch (error: any) {
    console.error('Create flashcard error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route GET /api/flashcards/me
// @desc  Get all flashcards for logged-in user
export const getMyFlashcards = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { user: (req as any).user.id };

    const [flashcards, total] = await Promise.all([
      Flashcard.find(filter)
        .sort({ nextReview: 1 })
        .skip(skip)
        .limit(limit),
      Flashcard.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: flashcards,
      pagination: buildPaginationMeta(page, limit, total)
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route GET /api/flashcards/due
// @desc  Get flashcards due for review today
export const getDueFlashcards = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const now = new Date();
    const filter = {
      user: (req as any).user.id,
      nextReview: { $lte: now }
    };

    const [flashcards, total] = await Promise.all([
      Flashcard.find(filter)
        .sort({ nextReview: 1 })
        .skip(skip)
        .limit(limit),
      Flashcard.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: flashcards,
      count: total,
      pagination: buildPaginationMeta(page, limit, total)
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route POST /api/flashcards/:id/review
// @desc  Submit a review result and update SM-2 schedule
export const reviewFlashcard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { quality } = req.body; // 0-5 score
    const qualityScore = Number(quality);
    if (!Number.isInteger(qualityScore) || qualityScore < 0 || qualityScore > 5) {
      res.status(400).json({ success: false, message: 'Quality score (0-5) is required' });
      return;
    }

    const flashcard = await Flashcard.findOne({ _id: req.params.id, user: (req as any).user.id });
    if (!flashcard) {
      res.status(404).json({ success: false, message: 'Flashcard not found' });
      return;
    }

    const updated = sm2({ interval: flashcard.interval, repetitions: flashcard.repetitions, easeFactor: flashcard.easeFactor }, qualityScore);
    const version = (flashcard as any).__v;
    const updateFilter: Record<string, any> = {
      _id: req.params.id,
      user: (req as any).user.id
    };
    if (typeof version === 'number') {
      updateFilter.__v = version;
    }

    const reviewedFlashcard = await Flashcard.findOneAndUpdate(
      updateFilter,
      {
        $set: {
          interval: updated.interval,
          repetitions: updated.repetitions,
          easeFactor: updated.easeFactor,
          nextReview: updated.nextReview
        },
        $inc: { __v: 1 }
      },
      { new: true, runValidators: true }
    );

    if (!reviewedFlashcard) {
      res.status(409).json({
        success: false,
        message: 'Flashcard review was already updated. Refresh and try again.'
      });
      return;
    }

    res.status(200).json({ success: true, data: reviewedFlashcard });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route DELETE /api/flashcards/:id
// @desc  Delete a flashcard
export const deleteFlashcard = async (req: Request, res: Response): Promise<void> => {
  try {
    const flashcard = await Flashcard.findOneAndDelete({ _id: req.params.id, user: (req as any).user.id });
    if (!flashcard) {
      res.status(404).json({ success: false, message: 'Flashcard not found' });
      return;
    }
    res.status(200).json({ success: true, message: 'Flashcard deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
