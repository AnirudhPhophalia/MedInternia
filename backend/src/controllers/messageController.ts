import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import Conversation from "../models/Conversation";
import Message from "../models/Message";
import User from "../models/User";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { emitToUser } from "../utils/socket";
import mongoose from "mongoose";

// Get all conversations for a user
export const getConversations = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?._id;

  const conversations = await Conversation.find({
    participants: userId
  })
    .populate('participants', 'firstName lastName profilePicture userType isVerifiedDoctor')
    .sort({ updatedAt: -1 });

  res.json({
    success: true,
    data: {
      conversations
    }
  });
});

// Get messages for a conversation
export const getMessages = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { conversationId } = req.params;
  const userId = req.user?._id;

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId
  });

  if (!conversation) {
    throw new AppError("Conversation not found", 404);
  }

  const messages = await Message.find({ conversationId })
    .populate('sender', 'firstName lastName profilePicture')
    .sort({ createdAt: 1 });

  // Check if there are unread messages to mark as read
  const unreadCount = await Message.countDocuments({
    conversationId,
    sender: { $ne: userId },
    readAt: null
  });

  if (unreadCount > 0) {
    await Message.updateMany(
      { conversationId, sender: { $ne: userId }, readAt: null },
      { readAt: new Date() }
    );

    // Notify the sender that messages have been read
    const otherParticipant = conversation.participants.find(
      (p) => p.toString() !== userId?.toString()
    );
    if (otherParticipant) {
      emitToUser(otherParticipant.toString(), 'messages_read', {
        conversationId,
        readBy: userId
      });
    }
  }

  res.json({
    success: true,
    data: {
      messages
    }
  });
});

// Mark messages as read manually/in real-time
export const markAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { conversationId } = req.params;
  const userId = req.user?._id;

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId
  });

  if (!conversation) {
    throw new AppError("Conversation not found", 404);
  }

  const result = await Message.updateMany(
    { conversationId, sender: { $ne: userId }, readAt: null },
    { readAt: new Date() }
  );

  if (result.modifiedCount > 0) {
    const otherParticipant = conversation.participants.find(
      (p) => p.toString() !== userId?.toString()
    );
    if (otherParticipant) {
      emitToUser(otherParticipant.toString(), 'messages_read', {
        conversationId,
        readBy: userId
      });
    }
  }

  res.json({
    success: true,
    message: "Messages marked as read"
  });
});

// Send a message - FIXED VERSION with transaction and race condition prevention
export const sendMessage = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { receiverId, content } = req.body;
  const senderId = req.user?._id;
  const trimmedContent = typeof content === 'string' ? content.trim() : '';

  if (!senderId) {
    throw new AppError("Unauthorized", 401);
  }

  if (!trimmedContent) {
    throw new AppError("Message content is required", 400);
  }

  // Validate content length BEFORE hitting the DB
  if (trimmedContent.length > 2000) {
    throw new AppError("Message content must not exceed 2000 characters", 400);
  }

  if (senderId.toString() === receiverId) {
    throw new AppError("You cannot message yourself", 400);
  }

  // FIX #1: Check if receiver exists first (basic validation)
  const receiverExists = await User.findById(receiverId);
  if (!receiverExists) {
    throw new AppError("Recipient not found", 404);
  }

  // FIX #2: Check if sender exists (null check)
  const senderExists = await User.findById(senderId);
  if (!senderExists) {
    throw new AppError("Sender user not found", 404);
  }

  // START TRANSACTION - All operations must be atomic
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // FIX #3: Re-fetch receiver WITHIN transaction to get latest data
    const receiver = await User.findById(receiverId).session(session);

    if (!receiver) {
      throw new AppError("Recipient not found", 404);
    }

    // FIX #4: Privacy check happens WITHIN transaction
    if (receiver.messagePrivacy === 'none') {
      throw new AppError("This user is not accepting direct messages", 403);
    }

    if (receiver.messagePrivacy === 'verified_only') {
      if (!senderExists.isVerifiedDoctor && !senderExists.isVerified) {
        throw new AppError("This user only accepts messages from verified users", 403);
      }
    }

    // FIX #5: Use upsert to prevent duplicate conversations
    let conversation = await Conversation.findOneAndUpdate(
      {
        participants: { $all: [senderId, receiverId] }
      },
      {
        $setOnInsert: {
          participants: [senderId, receiverId]
        }
      },
      {
        upsert: true,
        new: true,
        session // Include session in transaction
      }
    );

    if (!conversation) {
      throw new AppError("Failed to create/find conversation", 500);
    }

    // FIX #6: Create message WITHIN same transaction
    const message = await Message.create(
      [{
        conversationId: conversation._id,
        sender: senderId,
        content: trimmedContent
      }],
      { session } // Message creation is part of transaction
    );

    if (!message || message.length === 0) {
      throw new AppError("Failed to create message", 500);
    }

    // FIX #7: Update conversation within transaction
    const PREVIEW_MAX_LENGTH = 100;
    const preview = trimmedContent.length > PREVIEW_MAX_LENGTH
      ? trimmedContent.substring(0, PREVIEW_MAX_LENGTH) + '...'
      : trimmedContent;

    await Conversation.findByIdAndUpdate(
      conversation._id,
      {
        lastMessage: preview,
        updatedAt: new Date()
      },
      { session }
    );

    // COMMIT TRANSACTION - all operations succeed or all fail
    await session.commitTransaction();

    // Populate sender details for response
    await message[0].populate('sender', 'firstName lastName profilePicture');

    // Emit to receiver (outside transaction)
    emitToUser(receiverId.toString(), 'new_message', {
      message: message[0],
      conversationId: conversation._id
    });

    res.status(201).json({
      success: true,
      data: {
        message: message[0],
        conversationId: conversation._id
      }
    });

  } catch (error) {
    // ROLLBACK on any error
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});
