import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem('mrd_admin_token');
    if (!token) { setLoading(false); return; }

    api.get('/auth.php?action=me')
      .then(res => {
        if (res.data.authenticated) setUser(res.data.user);
        else {
          sessionStorage.removeItem('mrd_admin_token');
          sessionStorage.removeItem('mrd_admin_user');
        }
      })
      .catch(() => {
        sessionStorage.removeItem('mrd_admin_token');
        sessionStorage.removeItem('mrd_admin_user');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth.php?action=login', { email, password });
    if (res.data.success) {
      sessionStorage.setItem('mrd_admin_token', res.data.session_token);
      sessionStorage.setItem('mrd_admin_user',  JSON.stringify(res.data.user));
      setUser(res.data.user);
    }
    return res.data;
  };

  const logout = async () => {
    try { await api.post('/auth.php?action=logout'); } catch {}
    sessionStorage.removeItem('mrd_admin_token');
    sessionStorage.removeItem('mrd_admin_user');
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
