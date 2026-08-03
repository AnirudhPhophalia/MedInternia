import crypto from 'crypto';
import { Response } from 'express';

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // matches session cookie lifetime

/**
 * Generates a cryptographically random CSRF token for the double-submit
 * cookie pattern: this value is set as a readable (non-httpOnly) cookie and
 * must also be echoed back by the frontend as an X-CSRF-Token header on
 * state-changing requests. A cross-site attacker can trigger the browser to
 * send the cookie automatically but cannot read it to set the header, so a
 * mismatch reveals a forged request.
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Issues (or rotates) the CSRF cookie alongside a session. Call this
 * anywhere a session cookie (`token` / `refresh_token`) is set — login,
 * register, and refresh — so the CSRF token's lifecycle always matches the
 * session it protects.
 */
export function setCsrfCookie(res: Response): string {
  const csrfToken = generateCsrfToken();

  res.cookie(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false, // must be readable by frontend JS to echo as a header
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: CSRF_MAX_AGE,
  });

  return csrfToken;
}

export { CSRF_COOKIE_NAME };
