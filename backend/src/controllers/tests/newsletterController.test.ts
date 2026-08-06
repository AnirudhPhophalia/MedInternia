import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { subscribeNewsletter } from '../newsletterController';
import NewsletterSubscriber from '../../models/NewsletterSubscriber';

jest.mock('../../models/NewsletterSubscriber');

const mockedNewsletter = NewsletterSubscriber as unknown as jest.Mocked<typeof NewsletterSubscriber>;

const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

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

  it('rejects an already active subscription', async () => {
    const req = { body: { email: 'doc@example.com' } } as Request;
    const res = mockResponse();

    mockedNewsletter.findOne.mockResolvedValue({
      email: 'doc@example.com',
      status: 'active',
    } as any);

    await subscribeNewsletter(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
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
