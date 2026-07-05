import jwt from 'jsonwebtoken';
import type { AppRole } from '../middleware/permissions';

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret === 'fallback_secret') {
    throw new Error('JWT_SECRET must be set to a secure random value in production');
  }

  return secret;
};

export interface JwtPayload {
  userId: string;
  email: string;
  userType: AppRole;
}

export const generateToken = (payload: JwtPayload, rememberMe: boolean = false): string => {
  const secret = getJwtSecret();
  const expiresIn = rememberMe ? '7d' : '15m';

  return jwt.sign(payload, secret, { expiresIn });
};

export const generateRefreshToken = (payload: JwtPayload): string => {
  const secret = process.env.JWT_REFRESH_SECRET || getJwtSecret();
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  return jwt.sign(payload, secret, { expiresIn: '7d' });
};

export const verifyToken = (token: string): JwtPayload | null => {
  const secret = getJwtSecret();

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = (token: string): JwtPayload | null => {
  const secret = process.env.JWT_REFRESH_SECRET || getJwtSecret();
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET is not defined in environment variables');
  }
  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};
