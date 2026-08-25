import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Mentorship from '../models/Mentorship';
import User from '../models/User';

// Credits awarded to a mentor when a mentorship is completed. This is the only
// place the mentoring-credit economy is funded — credits are spent on issuing
// certificates and counted on the leaderboard, but were never earned anywhere.
const MENTORSHIP_COMPLETION_CREDITS = 5;

// True when userId is the mentor or mentee of the mentorship. Handles both
// populated (mentor._id) and unpopulated (mentor as ObjectId) documents.
const isParticipant = (mentorship: any, userId: string): boolean => {
  const mentorId = mentorship.mentor?._id?.toString() ?? mentorship.mentor?.toString();
  const menteeId = mentorship.mentee?._id?.toString() ?? mentorship.mentee?.toString();
  return mentorId === userId || menteeId === userId;
};

export const requestMentorship = async (req: Request, res: Response): Promise<void> => {
  try {
    const { mentorId, specialtyRequested, initialMessage } = req.body;
    const requesterId = (req as any).user.id;

    if (mentorId === requesterId) {
      res.status(400).json({ success: false, message: 'You cannot request mentorship from yourself' });
      return;
    }
    
    // Check if mentor exists and is a doctor
    const mentor = await User.findById(mentorId);
    if (!mentor || mentor.userType !== 'doctor') {
      res.status(404).json({ success: false, message: 'Mentor not found or is not a doctor' });
      return;
    }

    // Check if already requested
    const existing = await Mentorship.findOne({
      mentor: mentorId,
      mentee: requesterId,
      status: { $in: ['pending', 'active'] }
    });

    if (existing) {
      res.status(400).json({ success: false, message: 'You already have an active or pending mentorship with this doctor' });
      return;
    }

    const mentorship = await Mentorship.create({
      mentor: mentorId,
      mentee: requesterId,
      specialtyRequested,
      initialMessage,
    });

    res.status(201).json({ success: true, data: mentorship });
  } catch (error: any) {
    console.error('Request mentorship error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getMyMentorships = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const userType = (req as any).user.userType;
    
    // If intern, fetch where mentee = me, populate mentor
    // If doctor, fetch where mentor = me, populate mentee
    const query = userType === 'doctor' ? { mentor: userId } : { mentee: userId };
    
    const mentorships = await Mentorship.find(query)
      .populate('mentor', 'firstName lastName profilePicture specialization')
      .populate('mentee', 'firstName lastName profilePicture medicalSchool')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: mentorships });
  } catch (error: any) {
    console.error('Get mentorships error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getMentorshipById = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.id;
    const mentorship = await Mentorship.findById(req.params.id)
      .populate('mentor', 'firstName lastName profilePicture specialization')
      .populate('mentee', 'firstName lastName profilePicture medicalSchool');

    if (!mentorship) {
      return res.status(404).json({
        success: false,
        message: "Mentorship not found",
      });
    }

    // Verify authorized to view
    if (mentorship.mentor._id.toString() !== userId && mentorship.mentee._id.toString() !== userId) {
      res.status(403).json({ success: false, message: 'Not authorized' });
      return;
    }

    res.status(200).json({ success: true, data: mentorship });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateMentorshipStatus = async (req: Request, res: Response): Promise<any> => {
  try {
    const { status } = req.body;
    const userId = (req as any).user.id;
    const allowedStatuses = new Set(['pending', 'active', 'rejected', 'completed']);

    if (!allowedStatuses.has(status)) {
      res.status(400).json({ success: false, message: 'Invalid mentorship status' });
      return;
    }

    const mentorship = await Mentorship.findById(req.params.id);
    if (!mentorship) {
      return res.status(404).json({
        success: false,
        message: "Mentorship not found",
      });
    }

    // Must be a participant to touch the mentorship at all.
    if (!isParticipant(mentorship, userId)) {
      res.status(403).json({ success: false, message: 'Not authorized' });
      return;
    }

    const mentorId = mentorship.mentor.toString();
    const menteeId = mentorship.mentee.toString();
    const isMentor = mentorId === userId;
    const isMentee = menteeId === userId;
    const currentStatus = mentorship.status;

    // Explicit transition matrix:
    // - mentor: pending -> active|rejected
    // - mentee: active -> completed
    if (isMentor) {
      if (!(currentStatus === 'pending' && (status === 'active' || status === 'rejected'))) {
        res.status(400).json({
          success: false,
          message: 'Mentors can only accept or reject pending mentorship requests'
        });
        return;
      }
    } else if (isMentee) {
      if (!(currentStatus === 'active' && status === 'completed')) {
        res.status(403).json({
          success: false,
          message: 'Mentees can only mark an active mentorship as completed'
        });
        return;
      }
    } else {
      res.status(403).json({ success: false, message: 'Not authorized' });
      return;
    }

    // Update the Mentorship status and the mentee's User profile atomically.
    // A crash between the two writes used to leave a "active" mentorship with
    // no mentorDoctor reference, silently breaking permission checks.
    const session = await mongoose.startSession();
    let committed = false;
    try {
      session.startTransaction();

      mentorship.status = status;
      await mentorship.save({ session });

      if (status === 'active') {
        await User.findByIdAndUpdate(mentorship.mentee, {
          mentorDoctor: mentorship.mentor
        }, { session });
      } else if (status === 'rejected' || status === 'completed') {
        await User.findByIdAndUpdate(mentorship.mentee, {
          $unset: { mentorDoctor: 1 }
        }, { session });

        // Award the mentor their mentoring credits on completion. Only the
        // active -> completed transition reaches here, so this fires once.
        if (status === 'completed') {
          await User.findByIdAndUpdate(mentorship.mentor, {
            $inc: { mentoringCredits: MENTORSHIP_COMPLETION_CREDITS }
          }, { session });
        }
      }

      await session.commitTransaction();
      committed = true;
    } finally {
      if (!committed) await session.abortTransaction();
      session.endSession();
    }

    res.status(200).json({ success: true, data: mentorship });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const addGoal = async (req: Request, res: Response): Promise<any> => {
  try {
    const { title, description } = req.body;
    const userId = (req as any).user.id;
    const mentorship = await Mentorship.findById(req.params.id);
    if (!mentorship) {
      return res.status(404).json({
        success: false,
        message: "Mentorship not found",
      });
    }
    if (!isParticipant(mentorship, userId)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Use an atomic $push so concurrent adds never overwrite each other.
    const updatedMentorship = await Mentorship.findByIdAndUpdate(
      req.params.id,
      { $push: { goals: { title, description, isCompleted: false } } },
      { new: true }
    );

    if (!updatedMentorship) {
      return res.status(404).json({
        success: false,
        message: "Mentorship not found",
      });
    }

    res.status(200).json({ success: true, data: updatedMentorship });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const toggleGoal = async (req: Request, res: Response): Promise<any> => {
  try {
    const { goalId } = req.params;
    const userId = (req as any).user.id;
    const mentorship = await Mentorship.findById(req.params.id);
    if (!mentorship) {
      return res.status(404).json({
        success: false,
        message: "Mentorship not found",
      });
    }
    if (!isParticipant(mentorship, userId)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const goal = mentorship.goals.find((g: any) => g._id && g._id.toString() === goalId);
    if (goal) {
      goal.isCompleted = !goal.isCompleted;
      await mentorship.save();
    }

    res.status(200).json({ success: true, data: mentorship });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const addMeeting = async (req: Request, res: Response): Promise<any> => {
  try {
    const { scheduledAt, topic, link, notes } = req.body;
    const userId = (req as any).user.id;
    const mentorship = await Mentorship.findById(req.params.id);
    if (!mentorship) {
      return res.status(404).json({
        success: false,
        message: "Mentorship not found",
      });
    }
    if (!isParticipant(mentorship, userId)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Validate the requested time: required, parseable, and in the future.
    if (!scheduledAt || !topic) {
      return res.status(400).json({ success: false, message: 'scheduledAt and topic are required' });
    }
    const when = new Date(scheduledAt);
    if (Number.isNaN(when.getTime())) {
      return res.status(400).json({ success: false, message: 'scheduledAt must be a valid date' });
    }
    if (when <= new Date()) {
      return res.status(400).json({ success: false, message: 'Meetings must be scheduled in the future' });
    }

    // Reject a time that collides with an existing (non-cancelled) meeting.
    // ponytail: fixed 60-min window; add a per-meeting duration field if scheduling gets real.
    const OVERLAP_MS = 60 * 60 * 1000;
    const overlaps = mentorship.meetings.some(
      (m: any) =>
        m.status !== 'cancelled' &&
        Math.abs(new Date(m.scheduledAt).getTime() - when.getTime()) < OVERLAP_MS
    );
    if (overlaps) {
      return res.status(409).json({
        success: false,
        message: 'That time overlaps an existing meeting for this mentorship',
      });
    }

    // Use an atomic $push so concurrent adds never overwrite each other.
    const updatedMentorship = await Mentorship.findByIdAndUpdate(
      req.params.id,
      { $push: { meetings: { scheduledAt: when, topic, link, notes, status: 'scheduled' } } },
      { new: true }
    );

    if (!updatedMentorship) {
      return res.status(404).json({
        success: false,
        message: "Mentorship not found",
      });
    }

    res.status(200).json({ success: true, data: updatedMentorship });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Mark a scheduled meeting as completed. Participant-only; the meeting must have
 * already taken place (its scheduledAt is in the past). Idempotent if the meeting
 * is already completed.
 */
export const completeMeeting = async (req: Request, res: Response): Promise<any> => {
  try {
    const { meetingId } = req.params;
    const userId = (req as any).user.id;
    const mentorship = await Mentorship.findById(req.params.id);
    if (!mentorship) {
      return res.status(404).json({ success: false, message: 'Mentorship not found' });
    }
    if (!isParticipant(mentorship, userId)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const meeting = mentorship.meetings.find(
      (m: any) => m._id && m._id.toString() === meetingId
    );
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }
    if (meeting.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot complete a cancelled meeting' });
    }
    if (meeting.status === 'completed') {
      // Idempotent: already done.
      return res.status(200).json({ success: true, data: mentorship });
    }
    if (new Date(meeting.scheduledAt) > new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot complete a meeting that has not happened yet',
      });
    }

    meeting.status = 'completed';
    meeting.completedAt = new Date();
    await mentorship.save();

    res.status(200).json({ success: true, data: mentorship });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
