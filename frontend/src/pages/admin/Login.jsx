import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import api, { getFileUrl } from '../../api';

export default function AdminLogin() {
  const navigate   = useNavigate();
  const { login }  = useAuth();
  const [form, setForm]     = useState({ email: '', password: '' });
  const [show, setShow]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [sysSettings, setSysSettings] = useState({});

  useEffect(() => {
    api.get('/settings.php')
      .then(res => setSysSettings(res.data || {}))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) { setError('Email and password are required.'); return; }
    setLoading(true);
    try {
      const res = await login(form.email, form.password);
      if (res.success) {
        navigate('/admin/dashboard', { replace: true });
      } else {
        setError(res.message || 'Login failed.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-circle" style={{ overflow: 'hidden', padding: sysSettings.system_logo ? 0 : '' }}>
            {sysSettings.system_logo ? (
              <img src={getFileUrl(sysSettings.system_logo)} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              '🍚'
            )}
          </div>
          <h2>{sysSettings.system_name || 'MRD Admin Portal'}</h2>
          <p>{sysSettings.system_subtitle || 'Monthly Rice Distribution Program'}</p>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: 20 }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-control"
              placeholder="admin@mrd.gov.ph"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              autoFocus
              style={{ fontSize: '1rem', padding: '13px 14px' }}
            />
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label">Password</label>
            <input
              type={show ? 'text' : 'password'}
              className="form-control"
              placeholder="Enter your password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              style={{ fontSize: '1rem', padding: '13px 14px', paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setShow(s => !s)}
              style={{
                position: 'absolute', right: 12, top: 40,
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', padding: 4,
              }}
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? <><div className="spinner-sm" /> Logging in...</> : 'Login'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            MRD – Monthly Rice Distribution Program
          </p>
        </div>
      </div>
    </div>
  );
}
