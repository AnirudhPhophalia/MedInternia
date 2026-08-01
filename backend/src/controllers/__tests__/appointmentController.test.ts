import { Response } from 'express';
import { createAppointment } from '../appointmentController';
import Appointment, { AppointmentStatus } from '../../models/Appointment';
import User from '../../models/User';
import { AppError } from '../../utils/AppError';
import type { AuthRequest } from '../../middleware/auth';

/**
 * Tests for appointment controller (Issue #999)
 * Verifies that concurrent booking requests for the same time slot are prevented
 */

jest.mock('../../models/Appointment');
jest.mock('../../models/User');

describe('Appointment Controller - Double-booking Prevention (Issue #999)', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {
      user: {
        _id: 'patient123',
        userType: 'patient',
        email: 'patient@example.com',
        isActive: true,
      } as any,
      body: {
        doctorId: 'doctor123',
        scheduledDate: new Date(Date.now() + 86400000), // Tomorrow
        scheduledTime: '14:00',
        reason: 'Regular checkup',
      },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('Double-booking Prevention', () => {
    it('should prevent creating appointment when time slot is already booked', async () => {
      // Mock doctor exists
      (User.findOne as jest.Mock).mockResolvedValue({
        _id: 'doctor123',
        userType: 'doctor',
        isActive: true,
      });

      // Mock existing appointment at the same time
      (Appointment.findOne as jest.Mock).mockResolvedValue({
        _id: 'existing-apt',
        doctorId: 'doctor123',
        scheduledDate: mockReq.body.scheduledDate,
        scheduledTime: '14:00',
        status: AppointmentStatus.SCHEDULED,
      });

      await expect(
        createAppointment(mockReq as AuthRequest, mockRes as Response)
      ).rejects.toThrow(AppError);

      // Should not attempt to save
      expect(Appointment).not.toHaveBeenCalledWith(expect.anything());
    });

    it('should allow booking different time slot for same doctor', async () => {
      // Mock doctor exists
      (User.findOne as jest.Mock).mockResolvedValue({
        _id: 'doctor123',
        userType: 'doctor',
        isActive: true,
      });

      // Mock no existing appointment at 15:00
      (Appointment.findOne as jest.Mock).mockResolvedValue(null);

      // Mock appointment creation
      const mockAppointment = {
        _id: 'apt123',
        save: jest.fn().mockResolvedValue({}),
        populate: jest.fn().mockReturnThis(),
      };
      (Appointment as jest.Mock).mockReturnValue(mockAppointment);

      mockReq.body.scheduledTime = '15:00'; // Different time

      await createAppointment(mockReq as AuthRequest, mockRes as Response);

      expect(mockAppointment.save).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should allow rebooking cancelled time slot', async () => {
      const appointmentDate = new Date(Date.now() + 86400000);

      // Mock doctor exists
      (User.findOne as jest.Mock).mockResolvedValue({
        _id: 'doctor123',
        userType: 'doctor',
        isActive: true,
      });

      // Mock cancelled appointment at the same time
      // Should not block because it's cancelled
      (Appointment.findOne as jest.Mock).mockResolvedValue(null);

      const mockAppointment = {
        _id: 'apt123',
        save: jest.fn().mockResolvedValue({}),
        populate: jest.fn().mockReturnThis(),
      };
      (Appointment as jest.Mock).mockReturnValue(mockAppointment);

      await createAppointment(mockReq as AuthRequest, mockRes as Response);

      // Should successfully create new appointment
      expect(mockAppointment.save).toHaveBeenCalled();
    });

    it('should handle MongoDB duplicate key error', async () => {
      // Mock doctor exists
      (User.findOne as jest.Mock).mockResolvedValue({
        _id: 'doctor123',
        userType: 'doctor',
        isActive: true,
      });

      // Mock no existing appointment found (race condition scenario)
      (Appointment.findOne as jest.Mock).mockResolvedValue(null);

      // Mock appointment creation that fails with duplicate key error
      const mockAppointment = {
        save: jest.fn().mockRejectedValue({
          code: 11000,
          message: 'duplicate key error',
        }),
        populate: jest.fn().mockReturnThis(),
      };
      (Appointment as jest.Mock).mockReturnValue(mockAppointment);

      await expect(
        createAppointment(mockReq as AuthRequest, mockRes as Response)
      ).rejects.toThrow('Time slot already booked');
    });

    it('should prevent concurrent requests for same time slot', async () => {
      // Simulate race condition:
      // 1. First request: findOne returns null (no conflict)
      // 2. First request: saves successfully
      // 3. Second request: findOne returns null (because it happens before first save)
      // 4. Second request: tries to save and gets duplicate key error

      (User.findOne as jest.Mock).mockResolvedValue({
        _id: 'doctor123',
        userType: 'doctor',
        isActive: true,
      });

      // Both concurrent requests see no conflict initially
      (Appointment.findOne as jest.Mock).mockResolvedValue(null);

      // First request succeeds
      const mockAppointment1 = {
        save: jest.fn().mockResolvedValue({}),
        populate: jest.fn().mockReturnThis(),
      };

      // Second request fails with duplicate key
      const mockAppointment2 = {
        save: jest.fn().mockRejectedValue({
          code: 11000,
          message: 'duplicate key error',
        }),
        populate: jest.fn().mockReturnThis(),
      };

      // Simulate the two requests
      (Appointment as jest.Mock)
        .mockReturnValueOnce(mockAppointment1)
        .mockReturnValueOnce(mockAppointment2);

      // First request succeeds
      await createAppointment(mockReq as AuthRequest, mockRes as Response);
      expect(mockAppointment1.save).toHaveBeenCalled();

      // Second request fails due to unique constraint
      await expect(
        createAppointment(mockReq as AuthRequest, mockRes as Response)
      ).rejects.toThrow('Time slot already booked');
    });
  });

  describe('Security Checks', () => {
    it('should only allow patients to create appointments', async () => {
      mockReq.user = {
        ...mockReq.user,
        userType: 'doctor',
      };

      await expect(
        createAppointment(mockReq as AuthRequest, mockRes as Response)
      ).rejects.toThrow('Only patients can create appointments');
    });

    it('should always use authenticated user as patient', async () => {
      (User.findOne as jest.Mock).mockResolvedValue({
        _id: 'doctor123',
        userType: 'doctor',
        isActive: true,
      });

      (Appointment.findOne as jest.Mock).mockResolvedValue(null);

      const mockAppointment = {
        _id: 'apt123',
        save: jest.fn().mockResolvedValue({}),
        populate: jest.fn().mockReturnThis(),
      };
      (Appointment as jest.Mock).mockReturnValue(mockAppointment);

      // Try to book for a different patient in request body
      mockReq.body.patientId = 'other-patient';

      await createAppointment(mockReq as AuthRequest, mockRes as Response);

      // Should use authenticated user's ID, not request body
      expect(Appointment).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: 'patient123', // From req.user, not body
        })
      );
    });
  });
});
