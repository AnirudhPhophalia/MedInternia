import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { subscribeNewsletter, unsubscribeNewsletter } from '../newsletterController';
import NewsletterSubscriber from '../../models/NewsletterSubscriber';

// ── Module mocks ─────────────────────────────────────────────────────────────

// Prevent mailer.ts from throwing at import time when EMAIL_USER/PASS are absent.
jest.mock('../../utils/mailer', () => ({
  default: { sendMail: jest.fn().mockResolvedValue(undefined) },
  sendMail: jest.fn().mockResolvedValue(undefined),
}));

// Mock jsonwebtoken so token generation/verification is deterministic.
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-unsubscribe-token'),
  verify: jest.fn(),
}));

jest.mock('../../models/NewsletterSubscriber');

// ── Test helpers ─────────────────────────────────────────────────────────────

const mockedNewsletter = NewsletterSubscriber as unknown as jest.Mocked<typeof NewsletterSubscriber>;

// Pull the mocked jwt so individual tests can configure verify() behaviour.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockedJwt = require('jsonwebtoken') as jest.Mocked<typeof import('jsonwebtoken')>;

const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

// ── subscribeNewsletter ───────────────────────────────────────────────────────

describe('subscribeNewsletter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects missing email', async () => {
    const req = { body: {} } as Request;
    const res = mockResponse();

    await subscribeNewsletter(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Email is required' }),
    );
  });

  it('creates a new subscription', async () => {
    const req = { body: { email: '  Doc@Example.com ' } } as Request;
    const res = mockResponse();

    mockedNewsletter.findOne.mockResolvedValue(null as any);
    mockedNewsletter.create.mockResolvedValue({ email: 'doc@example.com' } as any);

    await subscribeNewsletter(req, res);

    expect(mockedNewsletter.create).toHaveBeenCalledWith({ email: 'doc@example.com' });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });

  it('returns 200 for an already active subscription (prevents enumeration)', async () => {
    const req = { body: { email: 'doc@example.com' } } as Request;
    const res = mockResponse();

    mockedNewsletter.findOne.mockResolvedValue({
      email: 'doc@example.com',
      status: 'active',
    } as any);

    await subscribeNewsletter(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockedNewsletter.create).not.toHaveBeenCalled();
  });

  it('reactivates a previously unsubscribed address', async () => {
    const req = { body: { email: 'doc@example.com' } } as Request;
    const res = mockResponse();

    const saveMock = jest.fn().mockResolvedValue(undefined);
    mockedNewsletter.findOne.mockResolvedValue({
      email: 'doc@example.com',
      status: 'unsubscribed',
      save: saveMock,
    } as any);

    await subscribeNewsletter(req, res);

    expect(saveMock).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
    // No new record should be created
    expect(mockedNewsletter.create).not.toHaveBeenCalled();
  });

  it('rejects invalid email via mongoose validation', async () => {
    const req = { body: { email: 'not-an-email' } } as Request;
    const res = mockResponse();

    mockedNewsletter.findOne.mockResolvedValue(null as any);
    mockedNewsletter.create.mockRejectedValue(
      new mongoose.Error.ValidationError(),
    );

    await subscribeNewsletter(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Please provide a valid email address',
      }),
    );
  });
});

// ── unsubscribeNewsletter ─────────────────────────────────────────────────────

describe('unsubscribeNewsletter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects a request with neither token nor email', async () => {
    const req = { body: {} } as Request;
    const res = mockResponse();

    await unsubscribeNewsletter(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'An unsubscribe token is required' }),
    );
  });

  it('rejects an invalid/expired token', async () => {
    const req = { body: { token: 'bad-token' } } as Request;
    const res = mockResponse();

    mockedJwt.verify.mockImplementation(() => { throw new Error('invalid'); });

    await unsubscribeNewsletter(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    );
  });

  it('rejects a token with wrong purpose', async () => {
    const req = { body: { token: 'wrong-purpose-token' } } as Request;
    const res = mockResponse();

    mockedJwt.verify.mockReturnValue({
      email: 'doc@example.com',
      purpose: 'signup', // wrong purpose
    } as any);

    await unsubscribeNewsletter(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('unsubscribes via a valid token', async () => {
    const req = { body: { token: 'mock-unsubscribe-token' } } as Request;
    const res = mockResponse();

    mockedJwt.verify.mockReturnValue({
      email: 'doc@example.com',
      purpose: 'newsletter_unsubscribe',
    } as any);

    mockedNewsletter.findOneAndUpdate.mockResolvedValue({
      email: 'doc@example.com',
      status: 'unsubscribed',
    } as any);

    await unsubscribeNewsletter(req, res);

    expect(mockedNewsletter.findOneAndUpdate).toHaveBeenCalledWith(
      { email: 'doc@example.com' },
      { $set: { status: 'unsubscribed' } },
      { new: true },
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });

  it('rejects a request with only an email (no token)', async () => {
    const req = { body: { email: 'doc@example.com' } } as Request;
    const res = mockResponse();

    await unsubscribeNewsletter(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'An unsubscribe token is required' }),
    );
  });
});
