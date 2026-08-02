import { Response } from 'express';
import { getPatients, getPatientById, updatePatientMedicalInfo } from '../patientController';
import { AuthRequest } from '../../middleware/auth';
import User from '../../models/User';
import Appointment from '../../models/Appointment';

jest.mock('../../models/User');
jest.mock('../../models/Appointment');

const mockedUser = User as jest.Mocked<typeof User>;
const mockedAppointment = Appointment as jest.Mocked<typeof Appointment>;

const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockRequest = (
  userId: string,
  userType: string,
  query: Record<string, any> = {}
): AuthRequest =>
  ({
    query,
    user: { _id: userId, userType },
  }) as unknown as AuthRequest;

describe('PatientController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPatients', () => {
    it('returns paginated patients with only list-safe fields', async () => {
      const mockPatients = [
        { _id: 'p1', firstName: 'Alice', lastName: 'Smith', email: 'alice@test.com' },
        { _id: 'p2', firstName: 'Bob', lastName: 'Jones', email: 'bob@test.com' },
      ];

      mockedUser.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockPatients),
      } as any);
      mockedUser.countDocuments.mockResolvedValue(25);

      const req = mockRequest('doc-1', 'doctor', { page: '2', limit: '10' });
      const res = mockResponse();

      await getPatients(req as any, res as any);

      expect(mockedUser.find).toHaveBeenCalledWith({
        userType: 'patient',
        isActive: true,
      });

      const findChain = mockedUser.find();
      expect(findChain.select).toHaveBeenCalledWith('_id firstName lastName email');
      expect(findChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(findChain.skip).toHaveBeenCalledWith(10);
      expect(findChain.limit).toHaveBeenCalledWith(10);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          patients: mockPatients,
          pagination: {
            page: 2,
            limit: 10,
            total: 25,
            pages: 3,
          },
        },
      });
    });

    it('uses default page 1 and limit 20 when no query params provided', async () => {
      mockedUser.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      } as any);
      mockedUser.countDocuments.mockResolvedValue(0);

      const req = mockRequest('doc-1', 'doctor', {});
      const res = mockResponse();

      await getPatients(req as any, res as any);

      const findChain = mockedUser.find();
      expect(findChain.skip).toHaveBeenCalledWith(0);
      expect(findChain.limit).toHaveBeenCalledWith(20);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            pagination: expect.objectContaining({ page: 1, limit: 20 }),
          }),
        })
      );
    });

    it('clamps limit to max 100', async () => {
      mockedUser.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      } as any);
      mockedUser.countDocuments.mockResolvedValue(0);

      const req = mockRequest('doc-1', 'doctor', { limit: '999' });
      const res = mockResponse();

      await getPatients(req as any, res as any);

      const findChain = mockedUser.find();
      expect(findChain.limit).toHaveBeenCalledWith(100);
    });

    it('handles invalid page parameter gracefully', async () => {
      mockedUser.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      } as any);
      mockedUser.countDocuments.mockResolvedValue(0);

      const req = mockRequest('doc-1', 'doctor', { page: '-5', limit: 'abc' });
      const res = mockResponse();

      await getPatients(req as any, res as any);

      const findChain = mockedUser.find();
      expect(findChain.skip).toHaveBeenCalledWith(0);
      expect(findChain.limit).toHaveBeenCalledWith(20);
    });

    it('returns empty results when no patients exist', async () => {
      mockedUser.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      } as any);
      mockedUser.countDocuments.mockResolvedValue(0);

      const req = mockRequest('doc-1', 'doctor', { page: '1', limit: '20' });
      const res = mockResponse();

      await getPatients(req as any, res as any);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          patients: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            pages: 0,
          },
        },
      });
    });

    it('selects only list-safe fields via projection', async () => {
      const mockPatients = [
        { _id: 'p1', firstName: 'Charlie', lastName: 'Brown', email: 'charlie@test.com' },
      ];

      mockedUser.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockPatients),
      } as any);
      mockedUser.countDocuments.mockResolvedValue(1);

      const req = mockRequest('doc-1', 'doctor', {});
      const res = mockResponse();

      await getPatients(req as any, res as any);

      expect(mockedUser.find).toHaveBeenCalledWith({
        userType: 'patient',
        isActive: true,
      });
      const findChain = mockedUser.find();
      expect(findChain.select).toHaveBeenCalledWith('_id firstName lastName email');
    });

    it('returns 500 on database error', async () => {
      mockedUser.find.mockImplementation(() => {
        throw new Error('DB connection failed');
      });

      const req = mockRequest('doc-1', 'doctor', {});
      const res = mockResponse();

      await getPatients(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error',
      });
    });
  });

  describe('getPatientById', () => {
    const validPatientId = '507f1f77bcf86cd799439011';

    it('allows a patient to view their own profile', async () => {
      const req = {
        params: { id: validPatientId },
        user: { _id: validPatientId, userType: 'patient' },
      } as any;
      const res = mockResponse();

      const patient = { _id: validPatientId, firstName: 'Alice', userType: 'patient' };
      mockedUser.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(patient),
      } as any);

      await getPatientById(req as any, res as any);

      expect(mockedAppointment.exists).not.toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: { patient } })
      );
    });

    it('rejects a patient trying to view another patient profile', async () => {
      const req = {
        params: { id: validPatientId },
        user: { _id: '507f1f77bcf86cd799439012', userType: 'patient' },
      } as any;
      const res = mockResponse();

      await getPatientById(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Access denied' })
      );
      expect(mockedUser.findOne).not.toHaveBeenCalled();
    });

    it('rejects a doctor with no treatment relationship', async () => {
      const doctorId = '507f1f77bcf86cd799439013';
      const req = {
        params: { id: validPatientId },
        user: { _id: doctorId, userType: 'doctor' },
      } as any;
      const res = mockResponse();

      mockedAppointment.exists.mockResolvedValue(null);

      await getPatientById(req as any, res as any);

      expect(mockedAppointment.exists).toHaveBeenCalledWith({
        doctorId,
        patientId: validPatientId,
        status: { $ne: 'cancelled' },
      });
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Access denied' })
      );
      expect(mockedUser.findOne).not.toHaveBeenCalled();
    });

    it('allows a doctor with an existing appointment to view the patient', async () => {
      const req = {
        params: { id: validPatientId },
        user: { _id: '507f1f77bcf86cd799439013', userType: 'doctor' },
      } as any;
      const res = mockResponse();

      mockedAppointment.exists.mockResolvedValue({ _id: 'appt-1' } as any);
      const patient = { _id: validPatientId, firstName: 'Alice', userType: 'patient' };
      mockedUser.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(patient),
      } as any);

      await getPatientById(req as any, res as any);

      expect(res.status).not.toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: { patient } })
      );
    });

    it('allows an admin to view any patient profile', async () => {
      const req = {
        params: { id: validPatientId },
        user: { _id: '507f1f77bcf86cd799439014', userType: 'admin' },
      } as any;
      const res = mockResponse();

      const patient = { _id: validPatientId, firstName: 'Alice', userType: 'patient' };
      mockedUser.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(patient),
      } as any);

      await getPatientById(req as any, res as any);

      expect(mockedAppointment.exists).not.toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: { patient } })
      );
    });

    it('returns 404 for an invalid patient id', async () => {
      const req = {
        params: { id: 'not-a-valid-object-id' },
        user: { _id: '507f1f77bcf86cd799439014', userType: 'admin' },
      } as any;
      const res = mockResponse();

      await getPatientById(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(mockedUser.findOne).not.toHaveBeenCalled();
    });
  });

  describe('updatePatientMedicalInfo', () => {
    const validPatientId = '507f1f77bcf86cd799439011';

    it('rejects a doctor with no treatment relationship', async () => {
      const req = {
        params: { id: validPatientId },
        body: { medicalHistory: ['Asthma'] },
        user: { _id: '507f1f77bcf86cd799439013', userType: 'doctor' },
      } as any;
      const res = mockResponse();

      mockedAppointment.exists.mockResolvedValue(null);

      await updatePatientMedicalInfo(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Access denied' })
      );
      expect(mockedUser.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('allows a doctor with a relationship to update medical info', async () => {
      const req = {
        params: { id: validPatientId },
        body: { medicalHistory: ['Asthma'], allergies: ['Pollen'] },
        user: { _id: '507f1f77bcf86cd799439013', userType: 'doctor' },
      } as any;
      const res = mockResponse();

      mockedAppointment.exists.mockResolvedValue({ _id: 'appt-1' } as any);
      const patient = { _id: validPatientId, medicalHistory: ['Asthma'] };
      mockedUser.findOneAndUpdate.mockReturnValue({
        select: jest.fn().mockResolvedValue(patient),
      } as any);

      await updatePatientMedicalInfo(req as any, res as any);

      expect(mockedUser.findOneAndUpdate).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Medical information updated successfully',
        })
      );
    });

    it('allows a patient to update their own medical info', async () => {
      const req = {
        params: { id: validPatientId },
        body: { allergies: ['Pollen'] },
        user: { _id: validPatientId, userType: 'patient' },
      } as any;
      const res = mockResponse();

      const patient = { _id: validPatientId, allergies: ['Pollen'] };
      mockedUser.findOneAndUpdate.mockReturnValue({
        select: jest.fn().mockResolvedValue(patient),
      } as any);

      await updatePatientMedicalInfo(req as any, res as any);

      expect(mockedAppointment.exists).not.toHaveBeenCalled();
      expect(mockedUser.findOneAndUpdate).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });
});
