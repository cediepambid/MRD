import { useState, useEffect, useCallback } from 'react';
import { Package, Search, CheckSquare, AlertCircle, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api';
import StatusBadge from '../../components/StatusBadge';

export default function Distribution() {
  const [list, setList]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [barangay, setBarangay] = useState('');
  const [page, setPage]         = useState(1);
  const [claimModal, setClaimModal] = useState(null); // { id, name }
  const [processing, setProcessing] = useState(false);

  const fetch = useCallback(() => {
    setLoading(true);
    api.get('/beneficiaries.php?action=list', {
      params: { search, barangay, page, claim_status: 'Not Yet Claimed' }
    })
      .then(res => { setList(res.data.data || []); setTotal(res.data.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, barangay, page]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleMarkClaimed = async () => {
    setProcessing(true);
    try {
      const res = await api.post(`/beneficiaries.php?action=mark_claimed&id=${claimModal.id}`);
      if (res.data.warning) {
        toast.error(res.data.message);
      } else {
        toast.success(res.data.message);
        setClaimModal(null);
        fetch();
      }
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error(err.response.data.message);
      } else {
        toast.error(err.response?.data?.error || 'Action failed.');
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Package size={24} color="var(--primary)" /> Rice Distribution
        </h2>
        <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>
          Mark beneficiaries as claimed when they receive their rice assistance
        </p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="filters-bar">
          <div className="search-box">
            <Search size={16} color="var(--text-muted)" />
            <input type="text" placeholder="Search beneficiary..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <input type="text" className="filter-select" placeholder="Barangay..."
            value={barangay} onChange={e => { setBarangay(e.target.value); setPage(1); }} />
          <button className="btn btn-outline btn-sm" onClick={() => { setSearch(''); setBarangay(''); setPage(1); }}>Clear</button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h4 className="card-title">{total} beneficiar{total!==1?'ies':'y'} waiting for rice</h4>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : list.length === 0 ? (
          <div className="empty-state">
            <Package size={48} />
            <h3>No Pending Distribution</h3>
            <p>All beneficiaries have claimed their rice assistance.</p>
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
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {list.map(b => (
                  <tr key={b.beneficiary_id}>
                    <td><strong style={{ color: 'var(--primary)' }}>{b.reference_number}</strong></td>
                    <td><strong>{b.given_name} {b.surname}</strong></td>
                    <td>{b.barangay}</td>
                    <td>{b.toda_name || '—'}</td>
                    <td>{b.cellphone}</td>
                    <td><StatusBadge status={b.claim_status} /></td>
                    <td>
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => setClaimModal({ id: b.beneficiary_id, name: `${b.given_name} ${b.surname}` })}
                      >
                        <CheckSquare size={14} /> Mark as Claimed
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Claim confirmation modal */}
      {claimModal && (
        <div className="modal-overlay">
          <div className="modal modal-sm">
            <div className="modal-header">
              <h3>Confirm Rice Claiming</h3>
            </div>
            <div className="modal-body">
              <div className="alert alert-info" style={{ marginBottom: 16 }}>
                <Package size={16} />
                <div>
                  Marking <strong>{claimModal.name}</strong> as having received their monthly rice assistance.
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => { setClaimModal(null); }}>
                Cancel
              </button>
              <button className="btn btn-success" onClick={handleMarkClaimed} disabled={processing}>
                {processing ? <><div className="spinner-sm" /> Processing...</> : <><CheckSquare size={16} /> Confirm Claimed</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
