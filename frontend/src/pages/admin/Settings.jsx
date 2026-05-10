import { useState, useEffect, useCallback } from 'react';
import { Settings as SettingsIcon, Save, RefreshCw, AlertCircle, Archive, RotateCcw, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api';
import { getFileUrl } from '../../api';
import StatusBadge from '../../components/StatusBadge';

const FIELDS = [
  { key: 'system_name',      label: 'System Name',        placeholder: 'e.g. MRD – Monthly Rice Distribution Program' },
  { key: 'system_subtitle',  label: 'System Subtitle',    placeholder: 'e.g. Tricycle Franchise Holders / TODA Members' },
  { key: 'lgu_name',         label: 'LGU Name',           placeholder: 'e.g. City of Manila – PESO Office' },
  { key: 'reg_url',          label: 'Registration URL',   placeholder: 'e.g. https://example.com/#/register' },
  { key: 'max_file_size_mb', label: 'Max File Size (MB)', placeholder: '5', type: 'number' },
];

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [saving, setSaving]     = useState(false);
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'archive'

  // Archive tab state
  const [archivedApps, setArchivedApps] = useState([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archivePage, setArchivePage] = useState(1);
  const [archiveTotal, setArchiveTotal] = useState(0);

  const fetchSettings = () => {
    setLoading(true);
    setError(false);
    api.get('/settings.php')
      .then(res => setSettings(res.data || {}))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  const fetchArchived = useCallback(() => {
    setArchiveLoading(true);
    api.get('/applications.php?action=list', { params: { archived: 1, page: archivePage, limit: 10 } })
      .then(res => {
        setArchivedApps(res.data.data || []);
        setArchiveTotal(res.data.total || 0);
      })
      .catch(() => toast.error('Failed to load archived applications'))
      .finally(() => setArchiveLoading(false));
  }, [archivePage]);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'archive') fetchArchived();
  }, [activeTab, fetchArchived]);

  const handleChange = (key, value) => {
    setSettings(s => ({ ...s, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/settings.php', settings);
      toast.success('Settings saved successfully!');
    } catch {
      toast.error('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleUnarchive = async (id) => {
    try {
      await api.post(`/applications.php?action=unarchive&id=${id}`);
      toast.success('Application restored');
      fetchArchived();
    } catch {
      toast.error('Failed to restore application');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: 800, marginBottom: 24 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SettingsIcon size={24} color="var(--primary)" /> System Management
        </h2>
        <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>Configure system settings and manage archived data</p>
      </div>

      {/* Tabs */}
      <div style={{
        width: '100%', maxWidth: 800,
        display: 'flex', gap: 0, marginBottom: 20,
        borderBottom: '1px solid var(--border)'
      }}>
        <button
          onClick={() => setActiveTab('general')}
          style={{
            padding: '12px 24px', background: 'none', border: 'none',
            borderBottom: `3px solid ${activeTab === 'general' ? 'var(--primary)' : 'transparent'}`,
            color: activeTab === 'general' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          General Settings
        </button>
        <button
          onClick={() => setActiveTab('archive')}
          style={{
            padding: '12px 24px', background: 'none', border: 'none',
            borderBottom: `3px solid ${activeTab === 'archive' ? 'var(--primary)' : 'transparent'}`,
            color: activeTab === 'archive' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', gap: 6
          }}
        >
          <Archive size={16} /> Archived Applications
        </button>
      </div>

      {activeTab === 'general' ? (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Error banner with retry */}
          {error && (
            <div style={{
              width: '100%', maxWidth: 640,
              display: 'flex', alignItems: 'center', gap: 12,
              background: '#FEF3F2', border: '1px solid #FECACA',
              borderRadius: 10, padding: '14px 18px', marginBottom: 20,
            }}>
              <AlertCircle size={18} color="#C0392B" style={{ flexShrink: 0 }} />
              <span style={{ color: '#C0392B', fontSize: '0.9rem', flex: 1 }}>
                Could not load settings. Backend may still be starting up.
              </span>
              <button className="btn btn-outline btn-sm" onClick={fetchSettings}>
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          )}

          <div className="card" style={{ width: '100%', maxWidth: 640 }}>
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <div className="spinner-sm" /> Loading settings…
              </div>
            )}

            <div className="form-group">
              <label className="form-label">System Logo</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {settings.system_logo ? (
                  <img src={getFileUrl(settings.system_logo)} alt="Logo" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: '50%', background: '#f8f9fa', padding: 4, border: '1px solid var(--border)' }} />
                ) : (
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f8f9fa', border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🍚</div>
                )}
                <div style={{ flex: 1 }}>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append('logo', file);
                      const loadingToast = toast.loading('Uploading logo...');
                      try {
                        const res = await api.post('/settings.php?action=upload_logo', formData, {
                          headers: { 'Content-Type': 'multipart/form-data' }
                        });
                        setSettings(s => ({ ...s, system_logo: res.data.logo_url }));
                        toast.success('Logo uploaded successfully!', { id: loadingToast });
                      } catch (err) {
                        toast.error(err.response?.data?.error || 'Failed to upload logo', { id: loadingToast });
                      }
                    }}
                    style={{ fontSize: '0.85rem' }}
                  />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 4 }}>Recommended: Square PNG or SVG (max 2MB)</p>
                </div>
              </div>
            </div>

            {FIELDS.map(f => (
              <div key={f.key} className="form-group">
                <label className="form-label">{f.label}</label>
                <input
                  type={f.type || 'text'}
                  className="form-control"
                  value={settings[f.key] || ''}
                  onChange={e => handleChange(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  disabled={loading}
                />
              </div>
            ))}

            <div className="form-group">
              <label className="form-label">QR Code Status</label>
              <select
                className="form-control"
                value={settings.qr_active || '1'}
                onChange={e => handleChange('qr_active', e.target.value)}
                disabled={loading}
              >
                <option value="1">Active (Registration open)</option>
                <option value="0">Inactive (Registration closed)</option>
              </select>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving || loading || error}
            >
              {saving
                ? <><div className="spinner-sm" /> Saving…</>
                : <><Save size={16} /> Save Settings</>
              }
            </button>
          </div>
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: 800 }}>
          <div className="card">
            <div className="card-header">
              <h4 className="card-title">Archived Applications ({archiveTotal})</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Applications moved to archive are hidden from the main list.</p>
            </div>

            {archiveLoading ? (
              <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
            ) : archivedApps.length === 0 ? (
              <div className="empty-state">
                <Archive size={40} />
                <h3>No archived applications</h3>
                <p>Applications you archive will appear here.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Ref No.</th>
                      <th>Name</th>
                      <th>Barangay</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archivedApps.map(app => (
                      <tr key={app.id}>
                        <td><strong>{app.reference_number}</strong></td>
                        <td>{app.given_name} {app.surname}</td>
                        <td>{app.barangay}</td>
                        <td><StatusBadge status={app.status} /></td>
                        <td>
                          <button className="btn btn-outline btn-sm" onClick={() => handleUnarchive(app.id)}>
                            <RotateCcw size={14} /> Unarchive
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
