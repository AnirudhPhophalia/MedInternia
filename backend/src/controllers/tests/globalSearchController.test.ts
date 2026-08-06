import { Request, Response } from 'express';
import { globalSearch } from '../globalSearchController';
import Case from '../../models/Case';
import User from '../../models/User';
import JobOpportunity from '../../models/JobOpportunity';
import ResearchPaper from '../../models/ResearchPaper';
import Webinar from '../../models/Webinar';

jest.mock('../../models/Case');
jest.mock('../../models/User');
jest.mock('../../models/JobOpportunity');
jest.mock('../../models/ResearchPaper');
jest.mock('../../models/Webinar');

const mockedCase = Case as unknown as jest.Mocked<typeof Case>;
const mockedUser = User as unknown as jest.Mocked<typeof User>;
const mockedJob = JobOpportunity as unknown as jest.Mocked<typeof JobOpportunity>;
const mockedPaper = ResearchPaper as unknown as jest.Mocked<typeof ResearchPaper>;
const mockedWebinar = Webinar as unknown as jest.Mocked<typeof Webinar>;

const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const chainLean = (value: any) => ({
  select: jest.fn().mockReturnValue({
    sort: jest.fn().mockReturnValue({
      limit: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(value),
      }),
    }),
  }),
});

describe('globalSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects an empty query', async () => {
    const req = { query: {} } as any;
    const res = mockResponse();

    await globalSearch(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns normalized matches across content types', async () => {
    const req = { query: { q: 'cardio' } } as any;
    const res = mockResponse();

    mockedCase.find.mockReturnValue(chainLean([
      { _id: 'c1', title: 'Cardio Case', specialization: 'cardiology' },
    ]) as any);
    mockedJob.find.mockReturnValue(chainLean([
      {
        _id: 'j1',
        title: 'Cardio Internship',
        company: 'Clinic',
        location: { city: 'Mumbai', state: 'MH', country: 'IN' },
        specialization: ['cardiology'],
      },
    ]) as any);
    mockedPaper.find.mockReturnValue(chainLean([
      { _id: 'p1', title: 'Cardio Paper', field: 'cardiology' },
    ]) as any);
    mockedWebinar.find.mockReturnValue(chainLean([
      { _id: 'w1', title: 'Cardio Webinar', specialization: ['cardiology'] },
    ]) as any);
    mockedUser.find.mockReturnValue(chainLean([
      { _id: 'u1', firstName: 'Ada', lastName: 'Cardio', specialization: 'cardiology', userType: 'doctor' },
    ]) as any);

    await globalSearch(req, res);

    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data.counts.total).toBe(5);
    expect(payload.data.results.map((r: any) => r.type)).toEqual([
      'case',
      'internship',
      'paper',
      'webinar',
      'clinician',
    ]);
  });

  it('returns an empty result set when nothing matches', async () => {
    const req = { query: { q: 'zzz' } } as any;
    const res = mockResponse();

    mockedCase.find.mockReturnValue(chainLean([]) as any);
    mockedJob.find.mockReturnValue(chainLean([]) as any);
    mockedPaper.find.mockReturnValue(chainLean([]) as any);
    mockedWebinar.find.mockReturnValue(chainLean([]) as any);
    mockedUser.find.mockReturnValue(chainLean([]) as any);

    await globalSearch(req, res);

    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.data.results).toEqual([]);
    expect(payload.data.counts.total).toBe(0);
  });
});
