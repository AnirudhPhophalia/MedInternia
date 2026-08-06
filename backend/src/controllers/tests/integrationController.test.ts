import { Response } from 'express';
import { exportBadges } from '../integrationController';
import BadgeExport from '../../models/BadgeExport';

jest.mock('../../models/BadgeExport');

const mockedBadgeExport = BadgeExport as unknown as jest.Mocked<typeof BadgeExport>;

const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

describe('exportBadges', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.LINKEDIN_CLIENT_ID;
    delete process.env.LINKEDIN_CLIENT_SECRET;
    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns unavailable when LinkedIn OAuth is not configured', async () => {
    const req = {
      params: { provider: 'linkedin' },
      user: { _id: 'user-1' },
    } as any;
    const res = mockResponse();

    mockedBadgeExport.create.mockResolvedValue({ _id: 'export-1' } as any);

    await exportBadges(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: 'EXPORT_UNAVAILABLE',
        data: expect.objectContaining({
          provider: 'linkedin',
          status: 'unavailable',
          reference: 'export-1',
        }),
      }),
    );
  });

  it('returns unavailable when GitHub OAuth is not configured', async () => {
    const req = {
      params: { provider: 'github' },
      user: { _id: 'user-1' },
    } as any;
    const res = mockResponse();

    mockedBadgeExport.create.mockResolvedValue({ _id: 'export-2' } as any);

    await exportBadges(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(mockedBadgeExport.create).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'github',
        status: 'unavailable',
      }),
    );
  });

  it('does not report success when credentials exist but export is unimplemented', async () => {
    process.env.GITHUB_CLIENT_ID = 'id';
    process.env.GITHUB_CLIENT_SECRET = 'secret';

    const req = {
      params: { provider: 'github' },
      user: { _id: 'user-1' },
    } as any;
    const res = mockResponse();

    mockedBadgeExport.create.mockResolvedValue({ _id: 'export-3' } as any);

    await exportBadges(req, res);

    expect(res.status).toHaveBeenCalledWith(501);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: 'EXPORT_NOT_IMPLEMENTED',
      }),
    );
  });

  it('rejects an unsupported provider', async () => {
    const req = {
      params: { provider: 'twitter' },
      user: { _id: 'user-1' },
    } as any;
    const res = mockResponse();

    await exportBadges(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockedBadgeExport.create).not.toHaveBeenCalled();
  });
});
