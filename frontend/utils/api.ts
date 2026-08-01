import axios from 'axios';
import { getGlobalToken, setGlobalToken } from '../context/AuthContext';
import { getCsrfToken } from './csrf';

/**
 * @deprecated Token is now in httpOnly cookie, not in memory or localStorage.
 * This function is kept for backward compatibility but should not be used
 * for Authorization headers (cookies handle that automatically).
 */
export const getAuthToken = (): string | null => {
  return getGlobalToken();
};

export const getSocketUrl = (): string => {
  const rawUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3000';
  return rawUrl.replace(/\/+$/, '').replace(/\/api$/, '');
};

const ensureApiPath = (baseUrl: string): string => {
  const normalized = baseUrl.replace(/\/+$/, '');
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
};

const rawBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://med-internia-earj.onrender.com/api';

const API_BASE_URL = ensureApiPath(rawBaseUrl);

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// SECURITY: Session auth is handled via httpOnly cookies (not Authorization
// header or localStorage). Axios automatically includes cookies via
// withCredentials: true — no need to manually add an Authorization header.
//
// The CSRF token below is a *separate*, readable cookie (see utils/csrf.ts)
// echoed back as a header on state-changing requests, per the double-submit
// pattern the backend's csrfProtection middleware expects.
const SAFE_METHODS = new Set(['get', 'head', 'options']);

api.interceptors.request.use(
  (config) => {
    const method = (config.method || 'get').toLowerCase();
    if (!SAFE_METHODS.has(method)) {
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        config.headers = config.headers || {};
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRedirectingToLogin = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl: string = error.config?.url || '';

    const isSessionBootstrapCheck = requestUrl.includes('/auth/validate-token');

    if (
      status === 401 &&
      !isSessionBootstrapCheck &&
      typeof window !== 'undefined'
    ) {
      setGlobalToken(null);

      const alreadyOnLoginPage = window.location.pathname.startsWith('/auth/login');
      if (!isRedirectingToLogin && !alreadyOnLoginPage) {
        isRedirectingToLogin = true;
        const redirectPath = `${window.location.pathname}${window.location.search}`;
        window.location.href = `/auth/login?redirect=${encodeURIComponent(redirectPath)}`;
      }
    }

    return Promise.reject(error);
  }
);

// Fetch intern profile
export const getInternProfile = async () => {
  const res = await api.get('/intern/profile');
  return res.data;
};

// Fetch intern credits
export const getInternCredits = async () => {
  const res = await api.get('/intern/credits');
  return res.data.credits;
};

// Fetch all diaries for the intern
export const getDiaries = async () => {
  const res = await api.get('/diaries');
  return res.data.data;
};

// Create a new diary
export const createDiary = async (title: string) => {
  const res = await api.post('/diaries', { title });
  return res.data;
};

// Add a new entry to a diary
export const addDiaryEntry = async (diaryId: string, entry: Record<string, any>) => {
  const res = await api.post(`/diaries/${diaryId}/entries`, entry);
  return res.data;
};

export default api;