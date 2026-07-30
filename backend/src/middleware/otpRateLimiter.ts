import rateLimit from 'express-rate-limit';

export const otpRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many OTP requests. Please try again after 1 hour.' },
  keyGenerator: (req) => req.body.email || req.ip
});

export const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many OTP verification attempts. Please try again after 15 minutes.' },
  keyGenerator: (req) => req.body.email || req.ip
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again after 15 minutes.' }
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many registration attempts. Please try again after an hour.' }
});

export const chatbotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many chatbot requests. Please try again after 15 minutes.' }
});

// Limits each authenticated user to 30 outbound messages per minute.
// Keyed by user ID from the JWT so the window is per-sender, not per-IP
// (which would be trivially bypassed from the same machine).
export const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many messages sent. Please wait a minute before sending more.' },
  keyGenerator: (req) => {
    // req.user is attached by the authenticate middleware which runs before
    // this limiter on the message route.
    const user = (req as any).user;
    return user?._id?.toString() ?? req.ip ?? 'unknown';
  }
});
