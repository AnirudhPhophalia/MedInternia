import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import BadgeExport, { BadgeExportProvider } from '../models/BadgeExport';

const PROVIDER_LABELS: Record<BadgeExportProvider, string> = {
  linkedin: 'LinkedIn',
  github: 'GitHub',
};

const isProviderConfigured = (provider: BadgeExportProvider): boolean => {
  if (provider === 'linkedin') {
    return Boolean(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET);
  }
  return Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
};

export const exportBadges = async (req: AuthRequest, res: Response) => {
  try {
    const provider = req.params.provider as BadgeExportProvider;
    if (provider !== 'linkedin' && provider !== 'github') {
      return res.status(400).json({
        success: false,
        code: 'INVALID_PROVIDER',
        message: 'Unsupported export provider',
      });
    }

    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHENTICATED',
        message: 'Authentication required',
      });
    }

    const label = PROVIDER_LABELS[provider];

    if (!isProviderConfigured(provider)) {
      const message = `${label} badge export is unavailable until OAuth credentials are configured.`;
      const record = await BadgeExport.create({
        user: userId,
        provider,
        status: 'unavailable',
        message,
      });

      return res.status(503).json({
        success: false,
        code: 'EXPORT_UNAVAILABLE',
        message,
        data: {
          provider,
          status: 'unavailable',
          reference: String(record._id),
        },
      });
    }

    // Provider credentials exist, but API export is not implemented yet.
    const message = `${label} export is not implemented yet. No badges were sent.`;
    const record = await BadgeExport.create({
      user: userId,
      provider,
      status: 'failed',
      message,
    });

    return res.status(501).json({
      success: false,
      code: 'EXPORT_NOT_IMPLEMENTED',
      message,
      data: {
        provider,
        status: 'failed',
        reference: String(record._id),
      },
    });
  } catch (error) {
    console.error('Badge export error:', error);
    return res.status(500).json({
      success: false,
      code: 'EXPORT_ERROR',
      message: 'Could not process badge export',
    });
  }
};
