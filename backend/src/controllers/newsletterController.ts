import mongoose from 'mongoose';
import { Request, Response } from 'express';
import NewsletterSubscriber from '../models/NewsletterSubscriber';

const normalizeEmail = (value?: string): string =>
  (value ?? '').toString().trim().toLowerCase();

export const subscribeNewsletter = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    const normalizedEmail = normalizeEmail(email);
    const existing = await NewsletterSubscriber.findOne({ email: normalizedEmail });

    if (existing) {
      if (existing.status === 'unsubscribed') {
        existing.status = 'active';
        await existing.save();
        return res.status(200).json({
          success: true,
          message: 'Successfully resubscribed to the newsletter',
        });
      }

      return res.status(409).json({
        success: false,
        message: 'This email is already subscribed',
      });
    }

    await NewsletterSubscriber.create({ email: normalizedEmail });

    res.status(201).json({
      success: true,
      message: 'Successfully subscribed to the newsletter',
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
        message: 'This email is already subscribed',
      });
    }
    console.error('Newsletter subscribe error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
