import axios from 'axios';

const api = axios.create({
  baseURL: '/MRD/api',
  withCredentials: false,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(config => {
  const token = sessionStorage.getItem('mrd_admin_token');
  if (token) {
    config.headers['X-Session-Token'] = token;
  }
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      sessionStorage.removeItem('mrd_admin_token');
      sessionStorage.removeItem('mrd_admin_user');
      if (!window.location.hash.includes('/login')) {
        window.location.hash = '#/admin/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
