import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('mrd_session_token');
    if (!token) { setLoading(false); return; }

    api.get('/auth.php?action=me')
      .then(res => {
        if (res.data.authenticated) setUser(res.data.user);
        else {
          localStorage.removeItem('mrd_session_token');
          localStorage.removeItem('mrd_admin_user');
        }
      })
      .catch(() => {
        localStorage.removeItem('mrd_session_token');
        localStorage.removeItem('mrd_admin_user');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth.php?action=login', { email, password });
    console.log('Login response:', res.data);
    if (res.data.success) {
      localStorage.setItem('mrd_admin_user', JSON.stringify(res.data.user));
      localStorage.setItem('mrd_session_token', res.data.session_token || res.data.token || '');
      setUser(res.data.user);
    }
    return res.data;
  };

  const logout = async () => {
    try { await api.post('/auth.php?action=logout'); } catch {}
    localStorage.removeItem('mrd_session_token');
    localStorage.removeItem('mrd_admin_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
