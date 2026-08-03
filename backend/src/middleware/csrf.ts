import { Request, Response, NextFunction } from 'express';
import { CSRF_COOKIE_NAME } from '../utils/csrf';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Double-submit CSRF check for state-changing requests.
 *
 * Defense-in-depth: our session/refresh cookies already use
 * SameSite=strict, which already blocks the browser from attaching them to
 * cross-site requests in virtually all cases. This middleware adds a second,
 * independent layer that doesn't rely on SameSite support/behavior alone
 * (e.g. older browsers, misconfigured proxies, or a future change to a
 * looser SameSite value elsewhere in the codebase).
 *
 * Requests with no csrf_token cookie are passed through untouched — those
 * are unauthenticated flows (login, register, forgot-password, etc.) that
 * have no session cookie to forge in the first place.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();

  const hasSessionCookie = Boolean(req.cookies?.token || req.cookies?.refresh_token);
  if (!hasSessionCookie) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  if (!cookieToken) {
    return res.status(403).json({
      success: false,
      message: 'Missing CSRF token cookie',
    });
  }
  const headerToken = req.headers['x-csrf-token'];

  if (!headerToken || headerToken !== cookieToken) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or missing CSRF token',
    });
  }

  next();
}
