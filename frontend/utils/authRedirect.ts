import type { NextRouter } from "next/router";
import { getGlobalToken } from "../context/AuthContext";

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
  if (getGlobalToken()) return true;
  if (typeof document === 'undefined') return false;
  return document.cookie.split('; ').some(row => row.startsWith('auth_status='));
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
