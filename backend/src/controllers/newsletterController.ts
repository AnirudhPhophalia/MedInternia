import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import NewsletterSubscriber from '../models/NewsletterSubscriber';
import transporter from '../utils/mailer';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const normalizeEmail = (value?: string): string =>
  (value ?? '').toString().trim().toLowerCase();

/**
 * Issue a short-lived signed JWT that can be embedded in an unsubscribe link.
 * Using JWT keeps the email out of the URL in plain text while remaining
 * stateless (no DB token table needed).
 */
const createUnsubscribeToken = (email: string): string =>
  jwt.sign(
    { email, purpose: 'newsletter_unsubscribe' },
    process.env.JWT_SECRET as string,
    { expiresIn: '30d' },
  );

/**
 * Verify an unsubscribe token and return the email it was issued for.
 * Returns null if the token is invalid, expired, or has the wrong purpose.
 */
const verifyUnsubscribeToken = (token: string): string | null => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      email?: string;
      purpose?: string;
    };
    if (decoded?.purpose !== 'newsletter_unsubscribe' || !decoded.email) {
      return null;
    }
    return normalizeEmail(decoded.email);
  } catch {
    return null;
  }
};

/**
 * Build the one-click unsubscribe URL embedded in confirmation emails.
 * Falls back to localhost for local development if FRONTEND_URL is not set.
 */
const buildUnsubscribeUrl = (token: string): string => {
  const base = (process.env.FRONTEND_URL ?? 'http://localhost:3001').replace(/\/$/, '');
  return `${base}/newsletter/unsubscribe?token=${token}`;
};

// ---------------------------------------------------------------------------
// Subscribe
// ---------------------------------------------------------------------------

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

        // Re-send confirmation with a fresh unsubscribe link
        await sendSubscriptionConfirmation(normalizedEmail);
      }

      // Return 200 in all cases (new, active, or reactivated) to prevent
      // email enumeration — the caller cannot distinguish whether the
      // address was already subscribed.
      return res.status(200).json({
        success: true,
        message: 'Successfully subscribed to the newsletter',
      });
    }

    await NewsletterSubscriber.create({ email: normalizedEmail });

    // Send confirmation email containing the one-click unsubscribe link
    await sendSubscriptionConfirmation(normalizedEmail);

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
      // Duplicate key — treat as success to prevent email enumeration
      return res.status(200).json({
        success: true,
        message: 'Successfully subscribed to the newsletter',
      });
    }
    console.error('Newsletter subscribe error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// ---------------------------------------------------------------------------
// Unsubscribe
// ---------------------------------------------------------------------------

/**
 * PATCH /api/newsletter/unsubscribe
 *
 * Token flow (recommended, used from email links):
 *    Body: { token: "<signed JWT>" }
 *    The JWT was issued by subscribeNewsletter and embeds the email — so no
 *    account login is required (required by CAN-SPAM one-click rule).
 *
 * The direct email flow has been removed: an unauthenticated caller must
 * never be able to unsubscribe an arbitrary address by email alone.
 *
 * Idempotent: unsubscribing an already-unsubscribed address returns 200
 * without error.
 */
export const unsubscribeNewsletter = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'An unsubscribe token is required',
      });
    }

    const normalizedEmail = verifyUnsubscribeToken(token);
    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: 'Unsubscribe link is invalid or has expired. Please contact support.',
      });
    }

    // Perform the unsubscribe. findOneAndUpdate is atomic — safe under
    // concurrent requests from the same user clicking the link twice.
    const record = await NewsletterSubscriber.findOneAndUpdate(
      { email: normalizedEmail },
      { $set: { status: 'unsubscribed' } },
      { new: true },
    );

    if (!record) {
      // Return 200 intentionally: revealing whether an address exists in the
      // subscriber list would be an information leak (email enumeration).
      return res.status(200).json({
        success: true,
        message: 'You have been unsubscribed from the newsletter',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'You have been successfully unsubscribed from the newsletter',
    });
  } catch (error) {
    console.error('Newsletter unsubscribe error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Send a subscription confirmation email that includes a one-click
 * unsubscribe link. Non-fatal — a sending failure is logged but does not
 * roll back the subscription record.
 */
const sendSubscriptionConfirmation = async (email: string): Promise<void> => {
  try {
    const token = createUnsubscribeToken(email);
    const unsubscribeUrl = buildUnsubscribeUrl(token);

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'MedInternia Newsletter — Subscription Confirmed',
      text: [
        'Thank you for subscribing to the MedInternia newsletter!',
        '',
        'You will receive updates on medical education, case studies, and platform news.',
        '',
        'To unsubscribe at any time, click the link below:',
        unsubscribeUrl,
        '',
        'Or copy and paste the URL into your browser.',
        '',
        '— The MedInternia Team',
      ].join('\n'),
      html: `
        <p>Thank you for subscribing to the <strong>MedInternia</strong> newsletter!</p>
        <p>You will receive updates on medical education, case studies, and platform news.</p>
        <p>
          To unsubscribe at any time,
          <a href="${unsubscribeUrl}">click here to unsubscribe</a>.
        </p>
        <p style="font-size:12px;color:#999;">
          If the link above does not work, copy and paste this URL into your browser:<br>
          ${unsubscribeUrl}
        </p>
        <p>— The MedInternia Team</p>
      `,
      // RFC 8058 List-Unsubscribe header — required by Gmail / Yahoo bulk
      // sender requirements for newsletters (enabled Feb 2024).
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });
  } catch (err) {
    // Non-fatal: log but do not propagate — the subscription was already
    // persisted and a failed confirmation email must not undo that.
    console.error('Newsletter confirmation email failed:', err);
  }
};
