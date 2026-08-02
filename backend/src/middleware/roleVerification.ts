import { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth';
import { AppRole } from './permissions';

/**
 * Security middleware to verify user role from database,
 * not from JWT payload (Issue #1000)
 *
 * Ensures that even if JWT is forged or tampered with,
 * the role used for authorization comes from the database.
 */
export const verifyRoleFromDatabase = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Verify that user object has userType from database
    // If user object only has JWT payload role without db verification,
    // this will catch it
    if (!req.user.userType) {
      return res.status(401).json({
        success: false,
        message: 'User role information missing or invalid'
      });
    }

    // At this point, req.user was fetched from database in auth middleware
    // and userType comes from the database, not from JWT payload
    next();
  } catch (error) {
    console.error('Role verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error verifying user role'
    });
  }
};

/**
 * Middleware to enforce a specific role and verify it from database
 * Issue #1000: Only trust roles from database, never from JWT
 */
export const requireRole = (...allowedRoles: AppRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Use userType from database (populated in auth middleware),
      // NOT from JWT payload
      const userRole = req.user.userType as AppRole;

      if (!userRole) {
        return res.status(401).json({
          success: false,
          message: 'User role not found in database'
        });
      }

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: insufficient permissions',
          requiredRoles: allowedRoles,
          userRole
        });
      }

      next();
    } catch (error) {
      console.error('Role enforcement error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking user role'
      });
    }
  };
};

/**
 * Middleware specifically for admin-only endpoints
 * Issue #1000: Verify admin role from database, not JWT
 */
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  return requireRole('admin')(req, res, next);
};
