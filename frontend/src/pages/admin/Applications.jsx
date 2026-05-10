import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Eye, Filter } from 'lucide-react';
import api from '../../api';
import StatusBadge from '../../components/StatusBadge';
import ApplicationModal from '../../components/ApplicationModal';

const STATUSES = ['','Pending','Resubmitted','Approved','Rejected','For Resubmission'];

export default function Applications() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [apps, setApps]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState(params.get('status') || '');
  const [barangay, setBarangay] = useState('');
  const [page, setPage]       = useState(1);
  const [selectedId, setSelectedId] = useState(null);

  // Debounced filters for real-time search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [debouncedBarangay, setDebouncedBarangay] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setDebouncedBarangay(barangay);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, barangay]);

  const fetchApps = useCallback(() => {
    setLoading(true);
    const p = { 
      page, 
      limit: 20, 
      search: debouncedSearch, 
      status, 
      barangay: debouncedBarangay 
    };
    api.get('/applications.php?action=list', { params: p })
      .then(res => {
        setApps(res.data.data || []);
        setTotal(res.data.total || 0);
        setTotalPages(res.data.total_pages || 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, debouncedSearch, status, debouncedBarangay]);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    setDebouncedSearch(search);
    setDebouncedBarangay(barangay);
    setPage(1);
    fetchApps();
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2>All Applications</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>Manage and review all MRD applications</p>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <form onSubmit={handleSearch}>
          <div className="filters-bar">
            <div className="search-box">
              <Search size={16} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search by name, reference no., or phone..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select className="filter-select" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              {STATUSES.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input type="text" className="filter-select" placeholder="Filter by barangay..."
              value={barangay} onChange={e => setBarangay(e.target.value)} />
            <button type="submit" className="btn btn-primary btn-sm">
              <Filter size={14} /> Apply
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => {
              setSearch(''); setStatus(''); setBarangay(''); setPage(1);
            }}>Clear</button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <h4 className="card-title">
            {total} Application{total !== 1 ? 's' : ''} found
          </h4>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : apps.length === 0 ? (
          <div className="empty-state">
            <Search size={40} />
            <h3>No applications found</h3>
            <p>Try adjusting your search or filters.</p>
          </div>
        ) : (
          <>
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
                    <th>Claim Status</th>
                    <th>Date Submitted</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {apps.map(app => (
                    <tr key={app.id}>
                      <td><strong style={{ color: 'var(--primary)' }}>{app.reference_number}</strong></td>
                      <td>{app.given_name} {app.middle_name ? app.middle_name[0]+'.' : ''} {app.surname}</td>
                      <td>{app.barangay}</td>
                      <td>{app.toda_name || '—'}</td>
                      <td>{app.cellphone}</td>
                      <td><StatusBadge status={app.status} /></td>
                      <td>
                        {app.claim_status
                          ? <span className={`badge ${app.claim_status === 'Claimed' ? 'badge-claimed' : 'badge-not-claimed'}`}>
                              {app.claim_status}
                            </span>
                          : <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>—</span>
                        }
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {new Date(app.submitted_at).toLocaleDateString('en-PH')}
                      </td>
                      <td>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => setSelectedId(app.id)}
                        >
                          <Eye size={14} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="pagination">
              <div className="pagination-info">
                Showing {(page-1)*20+1}–{Math.min(page*20,total)} of {total}
              </div>
              <div className="pagination-btns">
                <button className="pagination-btn" disabled={page <= 1} onClick={() => setPage(p=>p-1)}>← Prev</button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(page-2, totalPages-4)) + i;
                  return (
                    <button key={p} className={`pagination-btn ${p===page?'active':''}`} onClick={() => setPage(p)}>
                      {p}
                    </button>
                  );
                })}
                <button className="pagination-btn" disabled={page >= totalPages} onClick={() => setPage(p=>p+1)}>Next →</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Application detail modal */}
      {selectedId && (
        <ApplicationModal
          id={selectedId}
          onClose={() => { setSelectedId(null); fetchApps(); }}
        />
      )}
    </div>
  );
}
