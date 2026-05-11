import { useState, useEffect, useCallback } from 'react';
import { CheckSquare, Search } from 'lucide-react';
import api from '../../api';

export default function ClaimedList() {
  const [list, setList]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [barangay, setBarangay] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [page, setPage]         = useState(1);

  const fetch = useCallback(() => {
    setLoading(true);
    api.get('/beneficiaries.php?action=list', {
      params: { search, barangay, page, claim_status: 'Claimed', date_from: dateFrom, date_to: dateTo }
    })
      .then(res => { setList(res.data.data || []); setTotal(res.data.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, barangay, page, dateFrom, dateTo]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckSquare size={24} color="var(--info)" /> Claimed List
        </h2>
        <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>
          Beneficiaries who have already claimed their rice assistance
        </p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="filters-bar">
          <div className="search-box">
            <Search size={16} color="var(--text-muted)" />
            <input type="text" placeholder="Search..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <input type="text" className="filter-select" placeholder="Barangay..."
            value={barangay} onChange={e => { setBarangay(e.target.value); setPage(1); }} />
          <input type="date" className="filter-select" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <input type="date" className="filter-select" value={dateTo}   onChange={e => setDateTo(e.target.value)} />
          <button className="btn btn-outline btn-sm" onClick={() => { setSearch(''); setBarangay(''); setDateFrom(''); setDateTo(''); setPage(1); }}>Clear</button>
          <button className="btn btn-primary btn-sm" onClick={() => window.print()}>Print</button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h4 className="card-title">{total} claimed</h4>
        </div>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : list.length === 0 ? (
          <div className="empty-state">
            <CheckSquare size={48} />
            <h3>No Claimed Records</h3>
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
                  <th>Date Claimed</th>
                  <th>Released By</th>
                </tr>
              </thead>
              <tbody>
                {list.map(b => (
                  <tr key={b.beneficiary_id}>
                    <td><strong style={{ color: 'var(--primary)' }}>{b.reference_number}</strong></td>
                    <td>{b.given_name} {b.surname}</td>
                    <td>{b.barangay}</td>
                    <td>{b.toda_name || '—'}</td>
                    <td>{b.claimed_at ? new Date(b.claimed_at).toLocaleDateString('en-PH') : '—'}</td>
                    <td>{b.released_by_name || '—'}</td>
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
