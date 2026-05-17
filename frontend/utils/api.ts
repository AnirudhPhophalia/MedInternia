import axios from 'axios';

const ensureApiPath = (baseUrl: string): string => {
  const normalized = baseUrl.replace(/\/+$/, '');
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
};

const rawBaseUrl = 'http://localhost:5000/api';

const API_BASE_URL = ensureApiPath(rawBaseUrl);

const api = axios.create({  
  baseURL: API_BASE_URL,
});

// Add interceptor to include JWT token in all requests
api.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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

export default api;
