import { useState, useEffect } from 'react';
import { Clock, Eye } from 'lucide-react';
import api from '../../api';
import ApplicationModal from '../../components/ApplicationModal';

export default function PendingReviews() {
  const [apps, setApps]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  const fetch = () => {
    setLoading(true);
    api.get('/applications.php?action=list', { params: { status: 'Pending', limit: 50 } })
      .then(res => setApps(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={24} color="var(--warning)" /> Pending Reviews
        </h2>
        <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>
          Applications awaiting your review and decision
        </p>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : apps.length === 0 ? (
          <div className="empty-state">
            <Clock size={48} />
            <h3>No Pending Applications</h3>
            <p>All applications have been reviewed.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Reference No.</th>
                  <th>Full Name</th>
                  <th>Barangay</th>
                  <th>TODA Name</th>
                  <th>Cellphone</th>
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
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {new Date(app.submitted_at).toLocaleDateString('en-PH')}
                    </td>
                    <td>
                      <button className="btn btn-primary btn-sm" onClick={() => setSelectedId(app.id)}>
                        <Eye size={14} /> Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedId && (
        <ApplicationModal id={selectedId} onClose={() => { setSelectedId(null); fetch(); }} />
      )}
    </div>
  );
}
