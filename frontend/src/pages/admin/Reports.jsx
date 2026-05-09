import { useState, useEffect, useCallback } from 'react';
import { BarChart2, Download, Printer, Search, Filter, Loader2 } from 'lucide-react';
import api from '../../api';
import StatusBadge from '../../components/StatusBadge';

const REPORT_TYPES = [
  { value: 'all',          label: 'All Applications' },
  { value: 'pending',      label: 'Pending Applications' },
  { value: 'approved',     label: 'Approved Beneficiaries' },
  { value: 'rejected',     label: 'Rejected Applications' },
  { value: 'resubmission', label: 'For Resubmission' },
  { value: 'claimed',      label: 'Claimed Beneficiaries' },
  { value: 'not_claimed',  label: 'Not Yet Claimed' },
];

export default function Reports() {
  const [type, setType]         = useState('all');
  const [barangay, setBarangay] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(false);

  const generateReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports.php', {
        params: { type, barangay, date_from: dateFrom, date_to: dateTo }
      });
      setData(res.data);
    } catch {
      // error
    } finally {
      setLoading(false);
    }
  }, [type, barangay, dateFrom, dateTo]);

  // Reactive: update report whenever filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      generateReport();
    }, 300); // Small debounce for typing in Barangay
    return () => clearTimeout(timer);
  }, [generateReport]);

  const printReport = () => window.print();

  const exportCSV = () => {
    if (!data?.data?.length) return;
    const headers = ['Reference No','Surname','Given Name','Barangay','Town/City','TODA Name','Cellphone','Status','Claim Status','Date Submitted'];
    const rows = data.data.map(r => [
      r.reference_number, r.surname, r.given_name, r.barangay, r.town_city,
      r.toda_name||'', r.cellphone, r.application_status, r.claim_status||'',
      r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('en-PH') : ''
    ]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${(v||'').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `MRD_${type}_report.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarChart2 size={24} color="var(--primary)" /> Reports
        </h2>
        <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>Generate and export MRD reports</p>
      </div>

      {/* Report filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h4 style={{ marginBottom: 16 }}>Report Parameters</h4>
        <div className="filters-bar">
          <select className="filter-select" value={type} onChange={e => setType(e.target.value)}>
            {REPORT_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <input type="text" className="filter-select" placeholder="Barangay (optional)"
            value={barangay} onChange={e => setBarangay(e.target.value)} />
          <input type="date" className="filter-select" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <span style={{ color: 'var(--text-muted)', lineHeight: '38px' }}>to</span>
          <input type="date" className="filter-select" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 600 }}>
              <Loader2 size={16} className="spinner" /> Updating...
            </div>
          )}
        </div>
      </div>

      {data && (
        <>
          {/* Report header */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3>{REPORT_TYPES.find(r=>r.value===type)?.label}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
                  Generated: {new Date(data.generated_at).toLocaleString('en-PH')} · By: {data.generated_by}
                  {barangay && ` · Barangay: ${barangay}`}
                  {dateFrom && ` · From: ${dateFrom}`}
                  {dateTo   && ` · To: ${dateTo}`}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline btn-sm" onClick={exportCSV}>
                  <Download size={14} /> Export CSV
                </button>
                <button className="btn btn-primary btn-sm" onClick={printReport}>
                  <Printer size={14} /> Print
                </button>
              </div>
            </div>
          </div>

          {/* Barangay summary */}
          {data.barangay_summary?.length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <h4 style={{ marginBottom: 14 }}>Summary by Barangay</h4>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Barangay</th>
                      <th style={{ textAlign: 'center' }}>Total</th>
                      <th style={{ textAlign: 'center' }}>Approved</th>
                      <th style={{ textAlign: 'center' }}>Pending</th>
                      <th style={{ textAlign: 'center' }}>Rejected</th>
                      <th style={{ textAlign: 'center' }}>For Resubmission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.barangay_summary.map(row => (
                      <tr key={row.barangay}>
                        <td><strong>{row.barangay}</strong></td>
                        <td style={{ textAlign: 'center' }}><strong>{row.total}</strong></td>
                        <td style={{ textAlign: 'center', color: 'var(--success)' }}>{row.approved}</td>
                        <td style={{ textAlign: 'center', color: 'var(--warning)' }}>{row.pending}</td>
                        <td style={{ textAlign: 'center', color: 'var(--danger)' }}>{row.rejected}</td>
                        <td style={{ textAlign: 'center', color: 'var(--warning)' }}>{row.for_resubmission}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Data table */}
          <div className="card">
            <div className="card-header">
              <h4 className="card-title">{data.data?.length || 0} Records</h4>
            </div>
            {!data.data?.length ? (
              <div className="empty-state"><p>No records found for the selected filters.</p></div>
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
                      <th>Claim</th>
                      <th>Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map(r => (
                      <tr key={r.reference_number}>
                        <td><strong style={{ color: 'var(--primary)' }}>{r.reference_number}</strong></td>
                        <td>{r.given_name} {r.surname}</td>
                        <td>{r.barangay}</td>
                        <td>{r.toda_name || '—'}</td>
                        <td>{r.cellphone}</td>
                        <td><StatusBadge status={r.application_status} /></td>
                        <td>
                          {r.claim_status
                            ? <span className={`badge ${r.claim_status==='Claimed'?'badge-claimed':'badge-not-claimed'}`}>{r.claim_status}</span>
                            : '—'
                          }
                        </td>
                        <td style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>
                          {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('en-PH') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
