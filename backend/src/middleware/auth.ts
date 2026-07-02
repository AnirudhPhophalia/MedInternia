import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload, verifyRefreshToken, generateToken } from '../utils/jwt';
import User, { IUser } from '../models/User';
import { getUserRole } from './permissions';
import type { AppRole } from './permissions';

import BlacklistedToken from '../models/BlacklistedToken';

export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  const blacklisted = await BlacklistedToken.findOne({ token });
  return !!blacklisted;
};

export interface AuthRequest extends Request {
  user?: IUser;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (await isTokenBlacklisted(token)) {
      return res.status(401).json({
        success: false,
        message: 'Token has been revoked'
      });
    }

    try {
      const decoded = verifyToken(token);

      if (!decoded) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }
      
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token - user not found'
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated'
        });
      }

      req.user = user;
      next();
    } catch (tokenError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const authorize = (...userTypes: AppRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const role = getUserRole(req);
    const hasAuthorizedRole = role === 'admin' || (role && userTypes.includes(role));

    if (!hasAuthorizedRole) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - insufficient permissions',
        code: 'FORBIDDEN',
        role,
        allowedRoles: userTypes
      });
    }

    next();
  };
};

export const logger = (req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
};

export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'API key is required'
    });
  }
  
  // Add your API key validation logic here
  next();
};
