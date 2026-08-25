import { Response } from 'express';
import { setAvailability, getMyAvailability, getAvailableSlots } from '../availabilityController';
import DoctorAvailability from '../../models/DoctorAvailability';
import Appointment from '../../models/Appointment';
import User from '../../models/User';
import { AuthRequest } from '../../middleware/auth';

// Stub asyncHandler so thrown AppErrors surface synchronously in tests.
jest.mock('../../utils/asyncHandler', () => ({ asyncHandler: (fn: any) => fn }));
jest.mock('../../models/DoctorAvailability');
jest.mock('../../models/Appointment');
jest.mock('../../models/User');

const mockedAvail = DoctorAvailability as unknown as jest.Mocked<typeof DoctorAvailability>;
const mockedAppt = Appointment as unknown as jest.Mocked<typeof Appointment>;
const mockedUser = User as unknown as jest.Mocked<typeof User>;

const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};
const mockReq = (over: Partial<AuthRequest> = {}): AuthRequest =>
  ({ user: { _id: 'doc1', userType: 'doctor' }, body: {}, params: {}, query: {}, ...over }) as unknown as AuthRequest;

const validWeekly = [{ weekday: 3, start: '09:00', end: '11:00' }];

beforeEach(() => jest.clearAllMocks());

describe('setAvailability', () => {
  it('rejects a non-doctor with 403', async () => {
    const req = mockReq({ user: { _id: 'p1', userType: 'patient' } as any, body: { weekly: validWeekly } });
    await expect(setAvailability(req, mockResponse(), jest.fn() as any)).rejects.toMatchObject({ statusCode: 403 });
    expect(mockedAvail.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects an invalid weekday with 400', async () => {
    const req = mockReq({ body: { weekly: [{ weekday: 9, start: '09:00', end: '11:00' }] } });
    await expect(setAvailability(req, mockResponse(), jest.fn() as any)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects start >= end with 400', async () => {
    const req = mockReq({ body: { weekly: [{ weekday: 3, start: '11:00', end: '09:00' }] } });
    await expect(setAvailability(req, mockResponse(), jest.fn() as any)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects an out-of-range slot duration with 400', async () => {
    const req = mockReq({ body: { weekly: validWeekly, slotDurationMinutes: 2 } });
    await expect(setAvailability(req, mockResponse(), jest.fn() as any)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('upserts a valid schedule and returns 200', async () => {
    (mockedAvail.findOneAndUpdate as jest.Mock).mockResolvedValue({ doctor: 'doc1', weekly: validWeekly });
    const req = mockReq({ body: { weekly: validWeekly, slotDurationMinutes: 30 } });
    const res = mockResponse();
    await setAvailability(req, res, jest.fn() as any);
    expect(mockedAvail.findOneAndUpdate).toHaveBeenCalledWith(
      { doctor: 'doc1' },
      expect.objectContaining({ doctor: 'doc1', slotDurationMinutes: 30 }),
      expect.objectContaining({ upsert: true }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('getMyAvailability', () => {
  it('returns the doctor’s own availability', async () => {
    (mockedAvail.findOne as jest.Mock).mockResolvedValue({ doctor: 'doc1', weekly: validWeekly });
    const res = mockResponse();
    await getMyAvailability(mockReq(), res, jest.fn() as any);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

describe('getAvailableSlots', () => {
  it('400s when date is missing', async () => {
    const req = mockReq({ params: { id: 'doc1' }, query: {} });
    await expect(getAvailableSlots(req, mockResponse(), jest.fn() as any)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('404s when the doctor does not exist', async () => {
    (mockedUser.findOne as jest.Mock).mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const req = mockReq({ params: { id: 'nope' }, query: { date: '2025-06-04' } });
    await expect(getAvailableSlots(req, mockResponse(), jest.fn() as any)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('returns hasAvailability=false when the doctor has no schedule', async () => {
    (mockedUser.findOne as jest.Mock).mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: 'doc1' }) });
    (mockedAvail.findOne as jest.Mock).mockResolvedValue(null);
    const req = mockReq({ params: { id: 'doc1' }, query: { date: '2025-06-04' } });
    const res = mockResponse();
    await getAvailableSlots(req, res, jest.fn() as any);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ hasAvailability: false, slots: [] }) }),
    );
  });

  it('computes open slots minus booked times', async () => {
    (mockedUser.findOne as jest.Mock).mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: 'doc1' }) });
    (mockedAvail.findOne as jest.Mock).mockResolvedValue({
      weekly: [{ weekday: 3, start: '09:00', end: '11:00' }], // 2025-06-04 is Wednesday
      slotDurationMinutes: 30,
      blockedDates: [],
    });
    (mockedAppt.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue([{ scheduledTime: '09:30' }]),
    });
    const req = mockReq({ params: { id: 'doc1' }, query: { date: '2025-06-04' } });
    const res = mockResponse();
    await getAvailableSlots(req, res, jest.fn() as any);
    // 09:00,09:30,10:00,10:30 minus the booked 09:30.
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ hasAvailability: true, slots: ['09:00', '10:00', '10:30'] }),
      }),
    );
  });
});
