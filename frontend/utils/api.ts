import axios from 'axios';
import { getGlobalToken } from '../context/AuthContext';

// Maintain backward compatibility for files importing getAuthToken
export const getAuthToken = (): string | null => getGlobalToken();

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

// Add interceptor to include JWT token in all requests
api.interceptors.request.use(
  (config) => {
    const token = getGlobalToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
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
  return res.data;
};

// Create a new diary
export const createDiary = async (title: string) => {
  const res = await api.post('/diaries', { title });
  return res.data;
};

// Add a new entry to a diary
export const addDiaryEntry = async (diaryId: string, day: string, content: string) => {
  const res = await api.post(`/diaries/${diaryId}/entries`, { day, content });
  return res.data;
};

// Run an AI-powered smart search across job/internship listings and profiles
export const smartSearch = async (
  query: string,
  opts: { scope?: 'all' | 'jobs' | 'profiles'; page?: number; limit?: number } = {}
) => {
  const { scope = 'all', page = 1, limit = 10 } = opts;
  const res = await api.get('/search', {
    params: { q: query, scope, page, limit },
  });
  return res.data;
};

// Fetch the top-ranked users for the leaderboard
export const getLeaderboard = async (
  opts: { userType?: 'intern' | 'doctor'; metric?: string; limit?: number } = {}
) => {
  const { userType = 'intern', metric = 'points', limit = 10 } = opts;
  const res = await api.get('/users/leaderboard', {
    params: { userType, metric, limit },
  });
  return res.data;
};

export default api;
