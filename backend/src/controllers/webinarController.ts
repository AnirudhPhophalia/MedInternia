import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Webinar from '../models/Webinar';
import Notification from '../models/Notification';
import User from '../models/User';

// Create webinar
export const createWebinar = async (req: AuthRequest, res: Response) => {
  try {
    const {
      title,
      description,
      type,
      specialization,
      scheduledAt,
      duration,
      maxParticipants,
      registrationDeadline,
      materials,
      tags
    } = req.body;

    // Webinar managers can create webinars after route-level permission checks.
    if (req.user!.userType !== 'doctor' && req.user!.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only doctors or admins can create webinars'
      });
    }

    const webinar = new Webinar({
      title,
      description,
      host: req.user!._id,
      type,
      specialization,
      scheduledAt,
      duration,
      maxParticipants,
      registrationDeadline,
      materials,
      tags,
      meetingLink: `https://meet.jit.si/webinar-${new Date().getTime()}-${Math.floor(Math.random()*10000)}`
    });

    await webinar.save();
    await webinar.populate('host', 'firstName lastName specialization isVerifiedDoctor');

    // Ensure webinar.host is a populated document
    const host = webinar.host as any;

    // Notify all interns about the new webinar
    const interns = await User.find({ userType: 'intern' });
      const notifications = interns.map(intern => ({
        recipient: intern._id,
        message: `New webinar scheduled: ${webinar.title} by ${host.firstName} ${host.lastName}`,
        type: 'webinar',
        link: webinar.meetingLink
      }));
    await Notification.insertMany(notifications);

    res.status(201).json({
      success: true,
      message: 'Webinar created successfully',
      data: { webinar, meetingLink: webinar.meetingLink }
    });
  } catch (error) {
    console.error('Create webinar error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get all webinars with filtering
export const getWebinars = async (req: Request, res: Response) => {
  try {
    const {
      type,
      specialization,
      status,
      upcoming,
      page = 1,
      limit = 10,
      sortBy = 'scheduledAt',
      sortOrder = 'asc'
    } = req.query;

    const filter: any = { isActive: true };
    
    if (type) filter.type = type;
    if (specialization) filter.specialization = { $in: [specialization] };
    if (status) filter.status = status;
    
    if (upcoming === 'true') {
      filter.scheduledAt = { $gte: new Date() };
      filter.status = { $in: ['scheduled', 'live'] };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    const webinars = await Webinar.find(filter)
      .populate('host', 'firstName lastName specialization isVerifiedDoctor profilePicture')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    const total = await Webinar.countDocuments(filter);

    res.json({
      success: true,
      data: {
        webinars,
        total,
        totalPages: Math.ceil(total / Number(limit)),
        currentPage: Number(page)
      }
    });
  } catch (error) {
    console.error('Get webinars error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get webinar by ID
export const getWebinarById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const webinar = await Webinar.findById(id)
      .populate('host', 'firstName lastName specialization isVerifiedDoctor profilePicture bio')
      .populate('participants.user', 'firstName lastName userType profilePicture');

    if (!webinar) {
      return res.status(404).json({
        success: false,
        message: 'Webinar not found'
      });
    }

    res.json({
      success: true,
      data: { webinar }
    });
  } catch (error) {
    console.error('Get webinar error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Register for webinar
export const registerForWebinar = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!._id;

    const webinar = await Webinar.findById(id);
    if (!webinar) {
      return res.status(404).json({
        success: false,
        message: 'Webinar not found'
      });
    }

    // Check if registration is still open
    if (webinar.registrationDeadline && new Date() > webinar.registrationDeadline) {
      return res.status(400).json({
        success: false,
        message: 'Registration deadline has passed'
      });
    }

    // Check if webinar is full
    if (webinar.maxParticipants && webinar.participants.length >= webinar.maxParticipants) {
      return res.status(400).json({
        success: false,
        message: 'Webinar is full'
      });
    }

    // Check if user is already registered
    const isAlreadyRegistered = webinar.participants.some(
      p => (p.user as any).toString() === (userId as any).toString()
    );

    if (isAlreadyRegistered) {
      return res.status(400).json({
        success: false,
        message: 'You are already registered for this webinar'
      });
    }

    webinar.participants.push({
      user: userId as any,
      registeredAt: new Date(),
      attended: false
    });

    await webinar.save();

    res.json({
      success: true,
      message: 'Successfully registered for webinar',
      data: { webinar }
    });
  } catch (error) {
    console.error('Register for webinar error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Unregister from webinar
export const unregisterFromWebinar = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req.user!._id as any).toString();

    const webinar = await Webinar.findById(id);
    if (!webinar) {
      return res.status(404).json({
        success: false,
        message: 'Webinar not found'
      });
    }

    // Check if webinar has already started
    if (webinar.status === 'live' || webinar.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot unregister from a webinar that has started or completed'
      });
    }

    const participantIndex = webinar.participants.findIndex(
      p => (p.user as any).toString() === userId
    );

    if (participantIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'You are not registered for this webinar'
      });
    }

    webinar.participants.splice(participantIndex, 1);
    await webinar.save();

    res.json({
      success: true,
      message: 'Successfully unregistered from webinar'
    });
  } catch (error) {
    console.error('Unregister from webinar error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update webinar
export const updateWebinar = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const hostId = (req.user!._id as any).toString();

    const webinar = await Webinar.findOne({ _id: id, host: hostId });
    if (!webinar) {
      return res.status(404).json({
        success: false,
        message: 'Webinar not found or you are not authorized to update it'
      });
    }

    Object.assign(webinar, updateData);
    await webinar.save();
    await webinar.populate('host', 'firstName lastName specialization');

    res.json({
      success: true,
      message: 'Webinar updated successfully',
      data: { webinar }
    });
  } catch (error) {
    console.error('Update webinar error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Mark attendance
export const markAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, attended } = req.body;
    const hostId = (req.user!._id as any).toString();

    const webinar = await Webinar.findOne({ _id: id, host: hostId });
    if (!webinar) {
      return res.status(404).json({
        success: false,
        message: 'Webinar not found or you are not authorized to mark attendance'
      });
    }

    const participant = webinar.participants.find(
      p => (p.user as any).toString() === userId
    );

    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found'
      });
    }

    participant.attended = attended;
    await webinar.save();

    res.json({
      success: true,
      message: 'Attendance marked successfully'
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Submit feedback
export const submitFeedback = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { rating, comments } = req.body;
    const userId = (req.user!._id as any).toString();

    const webinar = await Webinar.findById(id);
    if (!webinar) {
      return res.status(404).json({
        success: false,
        message: 'Webinar not found'
      });
    }

    const participant = webinar.participants.find(
      p => (p.user as any).toString() === userId
    );

    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'You are not registered for this webinar'
      });
    }

    if (!participant.attended) {
      return res.status(400).json({
        success: false,
        message: 'You must attend the webinar to provide feedback'
      });
    }

    participant.feedback = { rating, comments };
    await webinar.save();

    res.json({
      success: true,
      message: 'Feedback submitted successfully'
    });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get user's webinars (hosted and attended)
export const getUserWebinars = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const { type = 'all' } = req.query; // 'hosted', 'attended', 'registered', 'all'

    let query: any = {};
    
    if (type === 'hosted') {
      query = { host: userId };
    } else if (type === 'attended') {
      query = { 'participants.user': userId, 'participants.attended': true };
    } else if (type === 'registered') {
      query = { 'participants.user': userId };
    } else {
      // Get all webinars user is involved with
      query = {
        $or: [
          { host: userId },
          { 'participants.user': userId }
        ]
      };
    }

    const webinars = await Webinar.find(query)
      .populate('host', 'firstName lastName specialization')
      .sort({ scheduledAt: -1 });

    res.json({
      success: true,
      data: {
        webinars,
        total: webinars.length
      }
    });
  } catch (error) {
    console.error('Get user webinars error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Generate meeting link (for integration with video conferencing)
export const generateMeetingLink = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const hostId = (req.user!._id as any).toString();

    const webinar = await Webinar.findOne({ _id: id, host: hostId });
    if (!webinar) {
      return res.status(404).json({
        success: false,
        message: 'Webinar not found or you are not authorized'
      });
    }

    // Generate a simple meeting link (in production, integrate with Zoom, Google Meet, etc.)
    const meetingLink = `https://meet.example.com/webinar-${webinar._id}`;
    
    webinar.meetingLink = meetingLink;
    webinar.status = 'live';
    await webinar.save();

    res.json({
      success: true,
      message: 'Meeting link generated successfully',
      data: { 
        meetingLink,
        webinar 
      }
    });
  } catch (error) {
    console.error('Generate meeting link error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
