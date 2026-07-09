import jwt from 'jsonwebtoken';
import type { AppRole } from '../middleware/permissions';

// The startup validation in index.ts already ensures JWT_SECRET is set and strong.
// We keep a runtime check for safety.

if (!process.env.JWT_SECRET) {
  console.error('CRITICAL: JWT_SECRET is not defined. Server will not start.');
  process.exit(1);
}

export interface JwtPayload {
  userId: string;
  email: string;
  userType: AppRole;
}

export const generateToken = (payload: JwtPayload, rememberMe: boolean = false): string => {
  const secret = process.env.JWT_SECRET!;
  // Use environment variables for expiry, with sensible fallbacks
  const expiresIn = rememberMe
    ? (process.env.JWT_REFRESH_EXPIRES_IN || '7d')   // long-lived if "remember me"
    : (process.env.JWT_ACCESS_EXPIRES_IN || '15m'); // short-lived by default

  return jwt.sign(payload, secret, { expiresIn });
};

export const generateRefreshToken = (payload: JwtPayload): string => {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET!;
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  return jwt.sign(payload, secret, { expiresIn });
};

export const verifyToken = (token: string): JwtPayload | null => {
  const secret = process.env.JWT_SECRET!;
  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = (token: string): JwtPayload | null => {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET!;
  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};