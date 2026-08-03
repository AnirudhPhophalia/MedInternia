/**
 * Reads the CSRF token from its readable (non-httpOnly) cookie, set by the
 * backend alongside the session cookies on login/register/refresh. Used to
 * echo the token back as an X-CSRF-Token header on state-changing requests
 * (see utils/api.ts) — the double-submit pattern that pairs with the
 * backend's csrfProtection middleware.
 */
export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;

  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith('csrf_token='));

  return match ? decodeURIComponent(match.split('=')[1]) : null;
}
