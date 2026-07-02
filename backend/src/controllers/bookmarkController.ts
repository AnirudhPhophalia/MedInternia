import { Response } from 'express';
import mongoose from 'mongoose';
import BookmarkCollection from '../models/BookmarkCollection';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';

// Create a new bookmark collection
export const createCollection = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user as any;
    const { title, description, specialty } = req.body;

    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    if (!title || !title.trim()) {
      throw new AppError('Collection title is required', 400);
    }

    const newCollection = await BookmarkCollection.create({
      owner: new mongoose.Types.ObjectId(user._id),
      title: title.trim(),
      description: description || '',
      specialty: specialty || 'General',
      bookmarks: []
    });

    res.status(201).json({
      success: true,
      message: 'Bookmark collection created successfully',
      data: {
        collection: newCollection
      }
    });
  }
);

// Get all bookmark collections for the authenticated user
export const getMyCollections = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user as any;

    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    const collections = await BookmarkCollection.find({
      owner: new mongoose.Types.ObjectId(user._id)
    }).populate('bookmarks.case', 'title description difficulty specialization doctor createdAt');

    res.json({
      success: true,
      data: {
        collections
      }
    });
  }
);

// Add a bookmark to a collection
export const addBookmark = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user as any;
    const { collectionId } = req.params;
    const { caseId, note } = req.body;

    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    if (!caseId) {
      throw new AppError('Case ID is required', 400);
    }

    const collection = await BookmarkCollection.findOne({
      _id: collectionId,
      owner: new mongoose.Types.ObjectId(user._id)
    });

    if (!collection) {
      throw new AppError('Bookmark collection not found', 404);
    }

    const alreadyBookmarked = collection.bookmarks.some(
      b => b.case.toString() === caseId
    );

    if (alreadyBookmarked) {
      throw new AppError('Case is already in this collection', 400);
    }

    collection.bookmarks.push({
      case: new mongoose.Types.ObjectId(caseId),
      note: note || '',
      createdAt: new Date()
    });

    await collection.save();

    res.json({
      success: true,
      message: 'Case bookmarked successfully',
      data: {
        collection
      }
    });
  }
);

// Remove a bookmark from a collection
export const removeBookmark = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user as any;
    const { collectionId, caseId } = req.params;

    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    const collection = await BookmarkCollection.findOne({
      _id: collectionId,
      owner: new mongoose.Types.ObjectId(user._id)
    });

    if (!collection) {
      throw new AppError('Bookmark collection not found', 404);
    }

    collection.bookmarks = collection.bookmarks.filter(
      b => b.case.toString() !== caseId
    );

    await collection.save();

    res.json({
      success: true,
      message: 'Bookmark removed successfully',
      data: {
        collection
      }
    });
  }
);

// Update a private note on a bookmark
export const updateBookmarkNote = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user as any;
    const { collectionId, caseId } = req.params;
    const { note } = req.body;

    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    const collection = await BookmarkCollection.findOne({
      _id: collectionId,
      owner: new mongoose.Types.ObjectId(user._id)
    });

    if (!collection) {
      throw new AppError('Bookmark collection not found', 404);
    }

    const bookmark = collection.bookmarks.find(
      b => b.case.toString() === caseId
    );

    if (!bookmark) {
      throw new AppError('Bookmark not found in this collection', 404);
    }

    bookmark.note = note || '';
    await collection.save();

    res.json({
      success: true,
      message: 'Private note updated successfully',
      data: {
        collection
      }
    });
  }
);

// Delete a collection
export const deleteCollection = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user as any;
    const { collectionId } = req.params;

    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    const deleted = await BookmarkCollection.findOneAndDelete({
      _id: collectionId,
      owner: new mongoose.Types.ObjectId(user._id)
    });

    if (!deleted) {
      throw new AppError('Bookmark collection not found or unauthorized', 404);
    }

    res.json({
      success: true,
      message: 'Bookmark collection deleted successfully'
    });
  }
);
