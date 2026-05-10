import { useState, useEffect } from 'react';
import { Clock, Eye, Trash2, RefreshCw } from 'lucide-react';
import api from '../../api';
import toast from 'react-hot-toast';
import ApplicationModal from '../../components/ApplicationModal';
import StatusBadge from '../../components/StatusBadge';

export default function PendingReviews() {
  const [pending, setPending]         = useState([]);
  const [resubmitted, setResubmitted] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selectedId, setSelectedId]   = useState(null);

  const fetch = () => {
    setLoading(true);
    Promise.all([
      api.get('/applications.php?action=list', { params: { status: 'Pending',     limit: 100 } }),
      api.get('/applications.php?action=list', { params: { status: 'Resubmitted', limit: 100 } }),
    ])
      .then(([pendRes, resubRes]) => {
        setPending(pendRes.data.data || []);
        setResubmitted(resubRes.data.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const deleteApp = (id) => {
    if (!window.confirm('Are you sure you want to delete this application? This cannot be undone.')) return;
    api.delete(`/applications.php?action=delete&id=${id}`)
      .then(() => { toast.success('Application deleted.'); fetch(); })
      .catch(() => toast.error('Failed to delete application'));
  };

  const total = pending.length + resubmitted.length;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={24} color="var(--warning)" /> Pending Reviews
          {!loading && total > 0 && (
            <span style={{ background: 'var(--danger)', color: '#fff', fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 10, marginLeft: 4 }}>
              {total}
            </span>
          )}
        </h2>
        <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>
          Applications awaiting your review and decision
        </p>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : total === 0 ? (
        <div className="card"><div className="empty-state"><Clock size={48} /><h3>No Pending Applications</h3><p>All applications have been reviewed.</p></div></div>
      ) : (
        <>
          {/* ── Resubmitted section (shown first — needs re-review) ── */}
          {resubmitted.length > 0 && (
            <div className="card" style={{ marginBottom: 20, borderLeft: '4px solid #2471A3' }}>
              <div className="card-header" style={{ marginBottom: 12 }}>
                <h4 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#2471A3' }}>
                  <RefreshCw size={18} /> Documents Resubmitted — Needs Re-Review
                  <span style={{ background: '#2471A3', color: '#fff', fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>
                    {resubmitted.length}
                  </span>
                </h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  These applicants have re-uploaded their required documents after being asked for resubmission.
                </p>
              </div>
              <AppTable apps={resubmitted} onView={setSelectedId} onDelete={deleteApp} />
            </div>
          )}

          {/* ── New Pending section ── */}
          {pending.length > 0 && (
            <div className="card" style={{ borderLeft: '4px solid var(--warning)' }}>
              <div className="card-header" style={{ marginBottom: 12 }}>
                <h4 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--warning)' }}>
                  <Clock size={18} /> New Applications — Awaiting First Review
                  <span style={{ background: 'var(--warning)', color: '#fff', fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>
                    {pending.length}
                  </span>
                </h4>
              </div>
              <AppTable apps={pending} onView={setSelectedId} onDelete={deleteApp} />
            </div>
          )}
        </>
      )}

      {selectedId && (
        <ApplicationModal id={selectedId} onClose={() => { setSelectedId(null); fetch(); }} />
      )}
    </div>
  );
}

function AppTable({ apps, onView, onDelete }) {
  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Reference No.</th>
            <th>Full Name</th>
            <th>Barangay</th>
            <th>TODA Name</th>
            <th>Cellphone</th>
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
              <td>{app.toda_name || '—'}</td>
              <td>{app.cellphone}</td>
              <td><StatusBadge status={app.status} /></td>
              <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {new Date(app.submitted_at).toLocaleDateString('en-PH')}
              </td>
              <td>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => onView(app.id)}>
                    <Eye size={14} /> Review
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => onDelete(app.id)}
                    title="Delete Application"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
