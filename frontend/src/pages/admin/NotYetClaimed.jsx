import { useState, useEffect, useCallback } from 'react';
import { Archive, Search } from 'lucide-react';
import api from '../../api';

export default function NotYetClaimed() {
  const [list, setList]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [barangay, setBarangay] = useState('');
  const [todaName, setTodaName] = useState('');
  const [page, setPage]         = useState(1);

  const fetch = useCallback(() => {
    setLoading(true);
    api.get('/beneficiaries.php?action=list', {
      params: { search, barangay, toda_name: todaName, page, claim_status: 'Not Yet Claimed' }
    })
      .then(res => { setList(res.data.data || []); setTotal(res.data.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, barangay, todaName, page]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Archive size={24} color="var(--text-muted)" /> Not Yet Claimed
        </h2>
        <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>
          Approved beneficiaries who have not yet claimed their rice assistance
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
          <input type="text" className="filter-select" placeholder="TODA Name..."
            value={todaName} onChange={e => { setTodaName(e.target.value); setPage(1); }} />
          <button className="btn btn-outline btn-sm" onClick={() => { setSearch(''); setBarangay(''); setTodaName(''); setPage(1); }}>Clear</button>
          <button className="btn btn-primary btn-sm" onClick={() => window.print()}>Print List</button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h4 className="card-title">{total} beneficiar{total!==1?'ies':'y'} not yet claimed</h4>
        </div>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : list.length === 0 ? (
          <div className="empty-state">
            <Archive size={48} />
            <h3>All beneficiaries have claimed!</h3>
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
                  <th>Date Approved</th>
                </tr>
              </thead>
              <tbody>
                {list.map(b => (
                  <tr key={b.beneficiary_id}>
                    <td><strong style={{ color: 'var(--primary)' }}>{b.reference_number}</strong></td>
                    <td>{b.given_name} {b.surname}</td>
                    <td>{b.barangay}</td>
                    <td>{b.toda_name || '—'}</td>
                    <td>{b.cellphone}</td>
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
    </div>
  );
}
