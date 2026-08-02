import type { NextRouter } from "next/router";

export const protectedLandingPaths = [
  "/cases",
  "/jobs",
  "/webinars",
  "/leaderboard",
  "/webinar-demo",
  "/learning-paths",
  "/patients",
  "/doctors",
  "/diaries",
  "/upload-raw",
];

export const hasAuthToken = () => {
  // SECURITY: No localStorage fallback — the auth token itself is only ever
  // in an httpOnly cookie, unreadable from JS. `auth_status` is a separate,
  // non-sensitive, non-httpOnly cookie the backend sets purely as a readable
  // marker so this check can work before AuthContext's async validation
  // call resolves (e.g. on first paint after a hard refresh).
  if (typeof document === 'undefined') return false;
  return document.cookie.split('; ').some((row) => row.startsWith('auth_status='));
};

export const getLoginHref = (redirectPath: string) =>
  `/auth/login?redirect=${encodeURIComponent(redirectPath)}`;

export const getCurrentRedirectPath = () => {
  if (typeof window === "undefined") return "/dashboard";

  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
};

export const getSafeRedirectPath = (redirect: string | string[] | undefined) => {
  const redirectPath = Array.isArray(redirect) ? redirect[0] : redirect;

  if (
    redirectPath &&
    redirectPath.startsWith("/") &&
    !redirectPath.startsWith("//") &&
    !redirectPath.includes("://")
  ) {
    return redirectPath;
  }

  return "/landing";
};

export const redirectToLogin = (router: NextRouter, redirectPath = getCurrentRedirectPath()) => {
  router.replace(getLoginHref(redirectPath));
};
