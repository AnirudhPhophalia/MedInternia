// Utility to fetch current user profile from backend
import api from "../utils/api";

export async function fetchCurrentUserProfile() {
  try {
    const res = await api.get('/auth/me');
    return res.data.user || res.data.data?.user || null;
  } catch (err) {
    try {
      const res = await api.get('/auth/profile');
      return res.data.user || res.data.data?.user || null;
    } catch (e) {
      return null;
    }
  }
}
