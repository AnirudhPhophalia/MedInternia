const mongoose = require('mongoose');
import { Response } from 'express';
import ConsultationRequest from '../models/ConsultationRequest';
import User from '../models/User';
import Case from '../models/Case';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';

// Request P2P consultation
export const requestConsultation = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user as any;
    const { caseId, specialty, rewardPoints } = req.body;

    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    if (!caseId || !specialty) {
      throw new AppError('Case ID and specialty are required', 400);
    }

    const points = rewardPoints !== undefined ? Number(rewardPoints) : 0;

    const caseData = await Case.findById(caseId);
    if (!caseData) {
      throw new AppError('Case study not found', 404);
    }

    const requesterUser = await User.findById(user._id);
    if (!requesterUser) {
      throw new AppError('User not found', 404);
    }

    if (requesterUser.points < points) {
      throw new AppError('Insufficient reward points balance', 400);
    }

    // Lock reward points from requester account
    requesterUser.points -= points;
    await requesterUser.save();

    const request = await ConsultationRequest.create({
      case: new mongoose.Types.ObjectId(caseId),
      requester: new mongoose.Types.ObjectId(user._id),
      specialty,
      status: 'requested',
      rewardPoints: points,
      messages: []
    });

    res.status(201).json({
      success: true,
      message: 'Consultation request submitted and reward points locked',
      data: {
        request
      }
    });
  }
);

// Get consultation requests (with optional filters)
export const getConsultationRequests = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user as any;
    const { status, specialty } = req.query;

    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    const filter: any = {};
    if (status) filter.status = status;
    if (specialty) filter.specialty = specialty;

    const requests = await ConsultationRequest.find(filter)
      .populate('case', 'title description specialization difficulty')
      .populate('requester', 'firstName lastName userType')
      .populate('assignedConsultant', 'firstName lastName specialization')
      .populate('messages.sender', 'firstName lastName userType');

    res.json({
      success: true,
      data: {
        requests
      }
    });
  }
);

// Accept a consultation request (Doctors only)
export const acceptConsultation = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user as any;
    const { requestId } = req.params;

    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    if (user.userType !== 'doctor' && user.userType !== 'admin') {
      throw new AppError('Only doctors can accept consultation requests', 403);
    }

    const request = await ConsultationRequest.findById(requestId);
    if (!request) {
      throw new AppError('Consultation request not found', 404);
    }

    if (request.status !== 'requested') {
      throw new AppError('Consultation request is already accepted or resolved', 400);
    }

    request.status = 'in_progress';
    request.assignedConsultant = new mongoose.Types.ObjectId(user._id);
    await request.save();

    res.json({
      success: true,
      message: 'Consultation accepted successfully',
      data: {
        request
      }
    });
  }
);

// Add message to private consulting chatroom
export const addConsultationMessage = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user as any;
    const { requestId } = req.params;
    const { content } = req.body;

    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    if (!content || !content.trim()) {
      throw new AppError('Message content is required', 400);
    }

    const request = await ConsultationRequest.findById(requestId);
    if (!request) {
      throw new AppError('Consultation request not found', 404);
    }

    // Verify user is requester or assigned consultant
    const isRequester = request.requester.toString() === user._id.toString();
    const isConsultant = request.assignedConsultant?.toString() === user._id.toString();

    if (!isRequester && !isConsultant) {
      throw new AppError('You do not have access to this consultation workspace', 403);
    }

    request.messages.push({
      sender: new mongoose.Types.ObjectId(user._id),
      content: content.trim(),
      createdAt: new Date()
    });

    await request.save();

    const populated = await ConsultationRequest.findById(requestId)
      .populate('case', 'title description specialization')
      .populate('requester', 'firstName lastName userType')
      .populate('assignedConsultant', 'firstName lastName specialization')
      .populate('messages.sender', 'firstName lastName userType');

    res.json({
      success: true,
      message: 'Consultation message posted successfully',
      data: {
        request: populated
      }
    });
  }
);

// Resolve consultation request and pay consultant points
export const resolveConsultation = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = req.user as any;
    const { requestId } = req.params;

    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    const request = await ConsultationRequest.findById(requestId);
    if (!request) {
      throw new AppError('Consultation request not found', 404);
    }

    if (request.status === 'resolved') {
      throw new AppError('Consultation request is already resolved', 400);
    }

    // Verify requester or assigned consultant is resolving
    const isRequester = request.requester.toString() === user._id.toString();
    const isConsultant = request.assignedConsultant?.toString() === user._id.toString();

    if (!isRequester && !isConsultant) {
      throw new AppError('You do not have authorization to resolve this consultation', 403);
    }

    request.status = 'resolved';
    await request.save();

    // Pay reward points to the consultant doctor if assigned
    if (request.assignedConsultant && request.rewardPoints > 0) {
      const doctorUser = await User.findById(request.assignedConsultant);
      if (doctorUser) {
        doctorUser.points += request.rewardPoints;
        await doctorUser.save();
      }
    }

    res.json({
      success: true,
      message: 'Consultation resolved successfully and reward points transferred',
      data: {
        request
      }
    });
  }
);
