import axios from 'axios';
import toast from 'react-hot-toast';

// Show "backend is starting" toast at most once per minute so it never spams.
let wakeUpToastAt = 0;

const envBaseUrl = import.meta.env.VITE_API_BASE_URL;
const fallbackBaseUrl = '/api';

export const apiBaseUrl = (typeof envBaseUrl === 'string' && envBaseUrl.trim() !== '')
  ? envBaseUrl
  : fallbackBaseUrl;

// Build a URL to view/download an uploaded file.
// On Render the files are served through serve-file.php; locally through /MRD/uploads/.
export function getFileUrl(filePath) {
  if (!filePath) return '';
  
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  if (!isLocal) {
    // On production (Render), always use the proxy script
    return `${apiBaseUrl}/serve-file.php?path=${encodeURIComponent(filePath)}`;
  }
  
  // Local: files are in /MRD/uploads/
  return `/MRD/uploads/${filePath}`;
}

const api = axios.create({
  // In production (Render), VITE_API_BASE_URL is set in the Render dashboard.
  // In local dev (XAMPP), falls back to the proxied path.
  baseURL: apiBaseUrl,
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
      // Do nothing, just fail silently instead of showing the wakeup toast
    }

    if (err.response?.status === 401) {
      localStorage.removeItem('mrd_session_token');
      localStorage.removeItem('mrd_admin_user');
      window.dispatchEvent(new Event('mrd_unauthorized'));
      if (!window.location.hash.includes('/login')) {
        window.location.hash = '#/admin/login';
      }
    }

    return Promise.reject(err);
  }
);

export default api;
