import { Request, Response } from 'express';
import { apiLimiter } from '../otpRateLimiter';

const createMockResponse = () => {
  const res: Partial<Response> & {
    statusCode?: number;
    body?: unknown;
    headers: Record<string, string | number | readonly string[]>;
  } = {
    headers: {},
    setHeader: jest.fn((name: string, value: string | number | readonly string[]) => {
      res.headers[name] = value;
      return res as Response;
    }),
    status: jest.fn((code: number) => {
      res.statusCode = code;
      return res as Response;
    }),
    send: jest.fn((body?: unknown) => {
      res.body = body;
      return res as Response;
    }),
    json: jest.fn((body?: unknown) => {
      res.body = body;
      return res as Response;
    }),
  };

  return res as Response & typeof res;
};

describe('apiLimiter', () => {
  const createMockRequest = (ip: string, method = 'GET') =>
    ({
      app: {
        get: jest.fn(() => false),
      },
      headers: {},
      ip,
      method,
    }) as unknown as Request;

  it('allows the generic API quota and blocks the next request from the same IP', async () => {
    const ip = `203.0.113.${Date.now() % 255}`;

    for (let i = 0; i < 100; i += 1) {
      const req = createMockRequest(ip);
      const res = createMockResponse();
      const next = jest.fn();

      await apiLimiter(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalledWith(429);
    }

    const blockedReq = createMockRequest(ip);
    const blockedRes = createMockResponse();
    const blockedNext = jest.fn();

    await apiLimiter(blockedReq, blockedRes, blockedNext);

    expect(blockedNext).not.toHaveBeenCalled();
    expect(blockedRes.status).toHaveBeenCalledWith(429);
    expect(blockedRes.body).toEqual({
      success: false,
      message: 'Too many API requests. Please try again after 15 minutes.',
    });
  });

  it('skips CORS preflight requests', async () => {
    const req = createMockRequest('203.0.113.200', 'OPTIONS');
    const res = createMockResponse();
    const next = jest.fn();

    await apiLimiter(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalledWith(429);
  });
});
