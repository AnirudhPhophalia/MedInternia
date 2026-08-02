import { Request, Response, NextFunction } from 'express';
import { verifyRoleFromDatabase, requireRole, requireAdmin } from '../roleVerification';
import type { AuthRequest } from '../auth';
import { IUser } from '../../models/User';

/**
 * Tests for role verification middleware (Issue #1000)
 * Ensures roles are verified from database, not JWT payload
 */

describe('Role Verification Middleware (Issue #1000)', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('verifyRoleFromDatabase', () => {
    it('should allow authenticated user with valid role from database', async () => {
      mockReq.user = {
        _id: 'user123',
        userType: 'admin',
        email: 'admin@example.com',
        isActive: true,
      } as any;

      await verifyRoleFromDatabase(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject request without user', async () => {
      mockReq.user = undefined;

      await verifyRoleFromDatabase(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject user without userType from database', async () => {
      mockReq.user = {
        _id: 'user123',
        email: 'user@example.com',
        isActive: true,
      } as any;

      await verifyRoleFromDatabase(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User role information missing or invalid'
        })
      );
    });
  });

  describe('requireRole', () => {
    it('should allow user with matching role', () => {
      mockReq.user = {
        _id: 'user123',
        userType: 'admin',
        email: 'admin@example.com',
        isActive: true,
      } as any;

      const middleware = requireRole('admin', 'moderator');
      middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject user without matching role', () => {
      mockReq.user = {
        _id: 'user123',
        userType: 'patient',
        email: 'patient@example.com',
        isActive: true,
      } as any;

      const middleware = requireRole('admin', 'moderator');
      middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject if userType is missing from database', () => {
      mockReq.user = {
        _id: 'user123',
        email: 'user@example.com',
        isActive: true,
      } as any;

      const middleware = requireRole('admin');
      middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should use userType from database, not JWT payload', () => {
      // Simulating a forged JWT where someone claimed to be admin
      mockReq.user = {
        _id: 'user123',
        userType: 'patient', // Actual role from database
        email: 'patient@example.com',
        isActive: true,
        // Simulating JWT payload that might have been tampered with
        // The middleware should trust userType from database
      } as any;

      const middleware = requireRole('admin');
      middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      // Should reject because actual role is patient, not admin
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('should allow admin users', () => {
      mockReq.user = {
        _id: 'admin123',
        userType: 'admin',
        email: 'admin@example.com',
        isActive: true,
      } as any;

      requireAdmin(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject non-admin users', () => {
      mockReq.user = {
        _id: 'user123',
        userType: 'doctor',
        email: 'doctor@example.com',
        isActive: true,
      } as any;

      requireAdmin(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should prevent privilege escalation via JWT tampering', () => {
      // Even if someone forges a JWT with admin role,
      // the database role (doctor) should be used
      mockReq.user = {
        _id: 'user123',
        userType: 'doctor', // Actual role from database
        email: 'doctor@example.com',
        isActive: true,
      } as any;

      requireAdmin(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Forbidden: insufficient permissions'
        })
      );
    });
  });
});
