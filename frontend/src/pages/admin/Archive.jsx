import { useState, useEffect, useCallback } from 'react';
import { Archive as ArchiveIcon, RotateCcw, Search, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api';
import StatusBadge from '../../components/StatusBadge';

export default function Archive() {
  const [apps, setApps]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchArchived = useCallback(() => {
    setLoading(true);
    api.get('/applications.php?action=list', { 
      params: { 
        archived: 1, 
        page, 
        limit: 20,
        search: debouncedSearch 
      } 
    })
      .then(res => {
        setApps(res.data.data || []);
        setTotal(res.data.total || 0);
      })
      .catch(() => toast.error('Failed to load archived applications'))
      .finally(() => setLoading(false));
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchArchived();
  }, [fetchArchived]);

  const handleUnarchive = async (id) => {
    try {
      await api.post(`/applications.php?action=unarchive&id=${id}`);
      toast.success('Application restored');
      fetchArchived();
    } catch {
      toast.error('Failed to restore application');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('PERMANENT DELETE: Are you sure you want to delete this application forever? This cannot be undone.')) return;
    try {
      await api.delete(`/applications.php?action=delete&id=${id}`);
      toast.success('Application deleted permanently');
      fetchArchived();
    } catch {
      toast.error('Failed to delete application');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ArchiveIcon size={24} color="var(--primary)" /> Archive
        </h2>
        <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>Manage archived applications. You can restore them or delete them permanently.</p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="search-box" style={{ maxWidth: 400 }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search archived by name or reference..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h4 className="card-title">Archived Applications ({total})</h4>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : apps.length === 0 ? (
          <div className="empty-state">
            <ArchiveIcon size={48} />
            <h3>No archived applications found</h3>
            <p>{search ? 'Try a different search term.' : 'Applications you archive will appear here.'}</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Ref No.</th>
                  <th>Full Name</th>
                  <th>Barangay</th>
                  <th>Status</th>
                  <th>Date Submitted</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {apps.map(app => (
                  <tr key={app.id}>
                    <td><strong style={{ color: 'var(--primary)' }}>{app.reference_number}</strong></td>
                    <td>{app.given_name} {app.surname}</td>
                    <td>{app.barangay}</td>
                    <td><StatusBadge status={app.status} /></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {new Date(app.submitted_at).toLocaleDateString('en-PH')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button 
                          className="btn btn-outline btn-sm" 
                          onClick={() => handleUnarchive(app.id)}
                          title="Restore to main list"
                        >
                          <RotateCcw size={14} /> Unarchive
                        </button>
                        <button 
                          className="btn btn-ghost btn-sm" 
                          onClick={() => handleDelete(app.id)}
                          title="Delete permanently"
                          style={{ color: 'var(--danger)' }}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
