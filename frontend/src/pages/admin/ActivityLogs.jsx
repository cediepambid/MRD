import { useState, useEffect, useCallback } from 'react';
import { Activity, Search } from 'lucide-react';
import api from '../../api';

const ACTION_LABELS = {
  submit_application:       '📝 Application Submitted',
  approve_application:      '✅ Application Approved',
  reject_application:       '❌ Application Rejected',
  request_resubmission:     '🔄 Resubmission Requested',
  resubmit_application:     '📎 Documents Resubmitted',
  mark_claimed:             '📦 Marked as Claimed',
  mark_unclaimed:           '↩️ Claim Reversed',
  generate_qr_code:         '🔲 QR Code Generated',
};

export default function ActivityLogs() {
  const [logs, setLogs]     = useState([]);
  const [total, setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage]     = useState(1);

  const fetch = useCallback(() => {
    setLoading(true);
    api.get('/activity_logs.php', { params: { search, date_from: dateFrom, date_to: dateTo, page } })
      .then(res => { setLogs(res.data.data || []); setTotal(res.data.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, dateFrom, dateTo, page]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={24} color="var(--primary)" /> Activity Logs
        </h2>
        <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>Complete audit trail of all admin actions</p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="filters-bar">
          <div className="search-box">
            <Search size={16} color="var(--text-muted)" />
            <input type="text" placeholder="Search by user, action, or reference..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <input type="date" className="filter-select" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <input type="date" className="filter-select" value={dateTo}   onChange={e => setDateTo(e.target.value)} />
          <button className="btn btn-outline btn-sm" onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setPage(1); }}>Clear</button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h4 className="card-title">{total} log{total !== 1 ? 's' : ''}</h4>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : logs.length === 0 ? (
          <div className="empty-state"><Activity size={48} /><h3>No logs found</h3></div>
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Reference No.</th>
                    <th>Old Status</th>
                    <th>New Status</th>
                    <th>Remarks</th>
                    <th>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(log.created_at).toLocaleString('en-PH')}
                      </td>
                      <td style={{ fontWeight: 600 }}>{log.user_name || 'System'}</td>
                      <td>{ACTION_LABELS[log.action] || log.action}</td>
                      <td style={{ color: 'var(--primary)', fontWeight: 600 }}>{log.reference_number || '—'}</td>
                      <td>
                        {log.old_status
                          ? <span className={`badge badge-${log.old_status.toLowerCase().replace(' ','-')}`} style={{ fontSize: '0.72rem' }}>
                              {log.old_status}
                            </span>
                          : '—'
                        }
                      </td>
                      <td>
                        {log.new_status
                          ? <span className={`badge badge-${log.new_status.toLowerCase().replace(' ','-')}`} style={{ fontSize: '0.72rem' }}>
                              {log.new_status}
                            </span>
                          : '—'
                        }
                      </td>
                      <td style={{ fontSize: '0.83rem', color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.remarks || '—'}
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{log.ip_address || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <div className="pagination-info">Page {page}</div>
              <div className="pagination-btns">
                <button className="pagination-btn" disabled={page <= 1} onClick={() => setPage(p => p-1)}>← Prev</button>
                <button className="pagination-btn" disabled={logs.length < 30} onClick={() => setPage(p => p+1)}>Next →</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
