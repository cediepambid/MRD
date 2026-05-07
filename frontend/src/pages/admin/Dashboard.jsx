import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Clock, CheckCircle, XCircle, RefreshCw,
  Package, Archive, Users, TrendingUp, AlertCircle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import api from '../../api';

const COLORS = ['#1E8449','#C0392B','#E67E22','#2471A3','#F39C12'];

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  const fetchData = () => {
    setLoading(true);
    setError(false);
    api.get('/dashboard.php')
      .then(res => setData(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const s = data?.summary || {};

  const CARDS = [
    { label: 'Total Applications', value: s.total_applications, icon: FileText,    color: 'blue',   link: '/admin/applications' },
    { label: 'Pending Review',     value: s.pending,            icon: Clock,       color: 'yellow', link: '/admin/pending' },
    { label: 'Approved',           value: s.approved,           icon: CheckCircle, color: 'green',  link: '/admin/beneficiaries' },
    { label: 'Rejected',           value: s.rejected,           icon: XCircle,     color: 'red',    link: '/admin/applications?status=Rejected' },
    { label: 'For Resubmission',   value: s.for_resubmission,   icon: RefreshCw,   color: 'orange', link: '/admin/applications?status=For+Resubmission' },
    { label: 'Beneficiaries',      value: s.total_beneficiaries, icon: Users,      color: 'navy',   link: '/admin/beneficiaries' },
    { label: 'Rice Claimed',       value: s.claimed,             icon: Package,    color: 'blue',   link: '/admin/claimed' },
    { label: 'Not Yet Claimed',    value: s.not_yet_claimed,     icon: Archive,    color: 'gray',   link: '/admin/not-yet-claimed' },
  ];

  const pieData = [
    { name: 'Approved',  value: s.approved          || 0 },
    { name: 'Rejected',  value: s.rejected          || 0 },
    { name: 'Pending',   value: s.pending           || 0 },
    { name: 'Resubmit',  value: s.for_resubmission  || 0 },
  ].filter(d => d.value > 0);

  const claimPie = [
    { name: 'Claimed',         value: s.claimed         || 0 },
    { name: 'Not Yet Claimed', value: s.not_yet_claimed || 0 },
  ].filter(d => d.value > 0);

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: 4 }}>Dashboard</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Monthly Rice Distribution Program — Overview &amp; Analytics
          </p>
        </div>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <div className="spinner-sm" />
            Loading data…
          </div>
        )}
      </div>

      {/* Error banner with retry */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: '#FEF3F2', border: '1px solid #FECACA',
          borderRadius: 10, padding: '14px 18px', marginBottom: 20,
        }}>
          <AlertCircle size={18} color="#C0392B" style={{ flexShrink: 0 }} />
          <span style={{ color: '#C0392B', fontSize: '0.9rem', flex: 1 }}>
            Could not load dashboard data. Backend may still be starting up.
          </span>
          <button className="btn btn-outline btn-sm" onClick={fetchData}>
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {/* Stat cards — render immediately; show — while data is loading */}
      <div className="stats-grid">
        {CARDS.map(card => (
          <div
            key={card.label}
            className="stat-card"
            style={{ cursor: 'pointer', opacity: loading ? 0.6 : 1, transition: 'opacity 0.3s' }}
            onClick={() => navigate(card.link)}
          >
            <div className={`stat-icon ${card.color}`}>
              <card.icon size={24} />
            </div>
            <div className="stat-info">
              <h3>{loading ? '—' : (card.value ?? 0)}</h3>
              <p>{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <h4 className="card-title">Applications by Barangay</h4>
          </div>
          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto' }} />
            </div>
          ) : (data?.by_barangay?.length ?? 0) === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <TrendingUp size={40} />
              <p>No data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.by_barangay} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F6F7" />
                <XAxis dataKey="barangay" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--primary)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h4 className="card-title">Monthly Submissions</h4>
          </div>
          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto' }} />
            </div>
          ) : (data?.monthly?.length ?? 0) === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <TrendingUp size={40} />
              <p>No data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.monthly} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F6F7" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--primary-light)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <h4 className="card-title">Application Status</h4>
          </div>
          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : pieData.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}><p>No data yet</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h4 className="card-title">Rice Distribution Status</h4>
          </div>
          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : claimPie.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}><p>No beneficiaries yet</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={claimPie} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                  <Cell fill="#2471A3" />
                  <Cell fill="#AAB7B8" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent applications */}
      <div className="card">
        <div className="card-header">
          <h4 className="card-title">Recent Applications</h4>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/admin/applications')}>
            View All
          </button>
        </div>
        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : (data?.recent?.length ?? 0) === 0 ? (
          <div className="empty-state">
            <FileText size={40} />
            <h3>No applications yet</h3>
            <p>Applications will appear here once submitted.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Reference No.</th>
                  <th>Name</th>
                  <th>Barangay</th>
                  <th>Status</th>
                  <th>Date Submitted</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map(app => (
                  <tr key={app.reference_number} style={{ cursor: 'pointer' }}
                    onClick={() => navigate('/admin/applications')}>
                    <td><strong>{app.reference_number}</strong></td>
                    <td>{app.given_name} {app.surname}</td>
                    <td>{app.barangay}</td>
                    <td><StatusBadge status={app.status} /></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {new Date(app.submitted_at).toLocaleDateString('en-PH')}
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

function StatusBadge({ status }) {
  const map = {
    Pending:            'badge-pending',
    Approved:           'badge-approved',
    Rejected:           'badge-rejected',
    'For Resubmission': 'badge-resubmission',
  };
  return <span className={`badge ${map[status] || 'badge-pending'}`}>{status}</span>;
}
