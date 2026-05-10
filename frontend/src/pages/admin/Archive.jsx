import { useState, useEffect, useCallback } from 'react';
import { Archive as ArchiveIcon, RotateCcw, Search, Trash2, X, AlertTriangle } from 'lucide-react';
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

  // Delete Confirmation State
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, name: '' });
  const [confirmName, setConfirmName] = useState('');

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

  const openDeleteModal = (app) => {
    const fullName = `${app.given_name} ${app.surname}`;
    setDeleteModal({ open: true, id: app.id, name: fullName });
    setConfirmName('');
  };

  const executeDelete = async (id) => {
    try {
      await api.delete(`/applications.php?action=delete&id=${id}`);
      toast.success('Application deleted permanently');
      setDeleteModal({ open: false, id: null, name: '' });
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
                          onClick={() => openDeleteModal(app)}
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

      {/* ── Delete Confirmation Modal ── */}
      {deleteModal.open && (
        <div className="modal-overlay">
          <div className="modal modal-sm" style={{ borderTop: '5px solid var(--danger)' }}>
            <div className="modal-header">
              <h3 style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={20} /> Critical Action
              </h3>
              <button 
                className="btn btn-ghost btn-icon btn-sm" 
                onClick={() => setDeleteModal({ open: false, id: null, name: '' })}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <p style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)' }}>Confirm Permanent Deletion</p>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.5 }}>
                  This action <strong>cannot be undone</strong>. This will permanently remove the record of 
                  <span style={{ color: 'var(--danger)', fontWeight: 800 }}> {deleteModal.name}</span> from the system.
                </p>
              </div>

              <div className="form-group" style={{ background: '#FDF2F2', padding: 16, borderRadius: 10, border: '1px solid #FADBD8' }}>
                <label className="form-label" style={{ fontSize: '0.85rem', marginBottom: 10 }}>
                  Guide: Please type the full name exactly as shown below:
                </label>
                <div style={{ 
                  background: '#fff', padding: '8px 12px', borderRadius: 6, 
                  border: '1.5px solid var(--border)', fontWeight: 800, 
                  color: 'var(--primary)', textAlign: 'center', marginBottom: 12,
                  fontSize: '1rem', letterSpacing: '0.5px'
                }}>
                  {deleteModal.name}
                </div>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Type name here..."
                  value={confirmName}
                  onChange={e => setConfirmName(e.target.value)}
                  autoFocus
                  style={{ textAlign: 'center', fontWeight: 700 }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-outline" 
                onClick={() => setDeleteModal({ open: false, id: null, name: '' })}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                disabled={confirmName !== deleteModal.name}
                onClick={() => executeDelete(deleteModal.id)}
                style={{ flex: 1 }}
              >
                Confirm & Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
