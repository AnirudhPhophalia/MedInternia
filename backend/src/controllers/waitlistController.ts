import mongoose from 'mongoose';
import { Request, Response } from 'express';
import Waitlist from '../models/Waitlist';

const normalizeEmail = (value?: string): string =>
  (value ?? '').toString().trim().toLowerCase();

export const addToWaitlist = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    const normalizedEmail = normalizeEmail(email);

    const existing = await Waitlist.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'This email is already on the waitlist',
      });
    }

    await Waitlist.create({ email: normalizedEmail });

    res.status(201).json({
      success: true,
      message: 'Successfully added to the waitlist',
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }
    if ((error as any)?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This email is already on the waitlist',
      });
    }
    console.error('Waitlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
