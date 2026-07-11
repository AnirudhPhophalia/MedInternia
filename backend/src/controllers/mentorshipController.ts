import { Request, Response } from 'express';
import Mentorship from '../models/Mentorship';
import User from '../models/User';

export const requestMentorship = async (req: Request, res: Response): Promise<void> => {
  try {
    const { mentorId, specialtyRequested, initialMessage } = req.body;
    
    // Check if mentor exists and is a doctor
    const mentor = await User.findById(mentorId);
    if (!mentor || mentor.userType !== 'doctor') {
      res.status(404).json({ success: false, message: 'Mentor not found or is not a doctor' });
      return;
    }

    // Check if already requested
    const existing = await Mentorship.findOne({
      mentor: mentorId,
      mentee: (req as any).user.id,
      status: { $in: ['pending', 'active'] }
    });

    if (existing) {
      res.status(400).json({ success: false, message: 'You already have an active or pending mentorship with this doctor' });
      return;
    }

    const mentorship = await Mentorship.create({
      mentor: mentorId,
      mentee: (req as any).user.id,
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

export const getMentorshipById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const mentorship = await Mentorship.findById(req.params.id)
      .populate('mentor', 'firstName lastName profilePicture specialization')
      .populate('mentee', 'firstName lastName profilePicture medicalSchool');

    if (!mentorship) {
      res.status(404).json({ success: false, message: 'Mentorship not found' });
      return;
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

export const updateMentorshipStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    const userId = (req as any).user.id;

    const mentorship = await Mentorship.findById(req.params.id);
    if (!mentorship) {
      res.status(404).json({ success: false, message: 'Mentorship not found' });
      return;
    }

    // Only mentor can accept/reject
    if (mentorship.mentor.toString() !== userId && status !== 'completed') {
      res.status(403).json({ success: false, message: 'Only the mentor can update this status' });
      return;
    }

    mentorship.status = status;
    await mentorship.save();

    res.status(200).json({ success: true, data: mentorship });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const addGoal = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description } = req.body;
    const mentorship = await Mentorship.findById(req.params.id);
    if (!mentorship) return;

    mentorship.goals.push({ title, description, isCompleted: false } as any);
    await mentorship.save();

    res.status(200).json({ success: true, data: mentorship });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const toggleGoal = async (req: Request, res: Response): Promise<void> => {
  try {
    const { goalId } = req.params;
    const mentorship = await Mentorship.findById(req.params.id);
    if (!mentorship) return;

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

export const addMeeting = async (req: Request, res: Response): Promise<void> => {
  try {
    const { scheduledAt, topic, link, notes } = req.body;
    const mentorship = await Mentorship.findById(req.params.id);
    if (!mentorship) return;

    mentorship.meetings.push({ scheduledAt: new Date(scheduledAt), topic, link, notes } as any);
    await mentorship.save();

    res.status(200).json({ success: true, data: mentorship });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
