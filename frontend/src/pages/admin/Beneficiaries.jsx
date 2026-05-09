import { useState, useEffect, useCallback } from 'react';
import { Users, Search, Eye } from 'lucide-react';
import api from '../../api';
import StatusBadge from '../../components/StatusBadge';
import ApplicationModal from '../../components/ApplicationModal';

export default function Beneficiaries() {
  const [list, setList]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [barangay, setBarangay] = useState('');
  const [page, setPage]         = useState(1);
  const [selectedAppId, setSelectedAppId] = useState(null);

  const fetch = useCallback(() => {
    setLoading(true);
    api.get('/beneficiaries.php?action=list', { params: { search, barangay, page } })
      .then(res => { setList(res.data.data || []); setTotal(res.data.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, barangay, page]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={24} color="var(--primary)" /> Beneficiary Master List
        </h2>
        <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>All approved MRD beneficiaries</p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="filters-bar">
          <div className="search-box">
            <Search size={16} color="var(--text-muted)" />
            <input type="text" placeholder="Search by name, reference no., or phone..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <input type="text" className="filter-select" placeholder="Filter by barangay..."
            value={barangay} onChange={e => { setBarangay(e.target.value); setPage(1); }} />
          <button className="btn btn-outline btn-sm" onClick={() => { setSearch(''); setBarangay(''); setPage(1); }}>
            Clear
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h4 className="card-title">{total} Beneficiar{total !== 1 ? 'ies' : 'y'}</h4>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : list.length === 0 ? (
          <div className="empty-state">
            <Users size={48} />
            <h3>No Beneficiaries Yet</h3>
            <p>Approved applicants will appear here.</p>
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
                  <th>Claim Status</th>
                  <th>Date Approved</th>
                </tr>
              </thead>
              <tbody>
                {list.map(b => (
                  <tr key={b.beneficiary_id}>
                    <td><strong style={{ color: 'var(--primary)' }}>{b.reference_number}</strong></td>
                    <td>{b.given_name} {b.middle_name ? b.middle_name[0]+'.' : ''} {b.surname}</td>
                    <td>{b.barangay}</td>
                    <td>{b.toda_name || '—'}</td>
                    <td>{b.cellphone}</td>
                    <td><StatusBadge status={b.claim_status} /></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {b.approved_at ? new Date(b.approved_at).toLocaleDateString('en-PH') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedAppId && (
        <ApplicationModal id={selectedAppId} onClose={() => { setSelectedAppId(null); fetch(); }} />
      )}
    </div>
  );
}
