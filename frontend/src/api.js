import axios from 'axios';
import toast from 'react-hot-toast';

// Show "backend is starting" toast at most once per minute so it never spams.
let wakeUpToastAt = 0;

const envBaseUrl = import.meta.env.VITE_API_BASE_URL;
const fallbackBaseUrl = '/api';

const api = axios.create({
  // In production (Render), VITE_API_BASE_URL is set in the Render dashboard.
  // In local dev (XAMPP), falls back to the proxied path.
  baseURL: (typeof envBaseUrl === 'string' && envBaseUrl.trim() !== '')
    ? envBaseUrl
    : fallbackBaseUrl,
  timeout: 12000,
  withCredentials: false,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('mrd_session_token');
  if (token) {
    config.headers['X-Session-Token'] = token;
  }
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    const isTimeout    = err.code === 'ECONNABORTED' || err.message?.includes('timeout');
    const isNetworkErr = !err.response;

    if (isTimeout || isNetworkErr) {
      const now = Date.now();
      if (now - wakeUpToastAt > 60_000) {
        wakeUpToastAt = now;
        toast('Backend is starting. Please wait or try again.', {
          icon: '⏳',
          duration: 7000,
          id: 'backend-wakeup',
        });
      }
    }

    if (err.response?.status === 401) {
      localStorage.removeItem('mrd_session_token');
      localStorage.removeItem('mrd_admin_user');
      if (!window.location.hash.includes('/login')) {
        window.location.hash = '#/admin/login';
      }
    }

    return Promise.reject(err);
  }
);

export default api;
