import { useState } from 'react';
import { Search, CheckCircle, Clock, XCircle, RefreshCw, Package, AlertCircle, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

const STATUS_CONFIG = {
  Pending:          { icon: Clock,        color: '#9A7D0A', bg: '#FEF9E7', label: 'Pending Review',     desc: 'Your application is being reviewed by the admin.' },
  Approved:         { icon: CheckCircle,  color: '#1E8449', bg: '#EAFAF1', label: 'Approved',            desc: 'Congratulations! Your application has been approved.' },
  Rejected:         { icon: XCircle,      color: '#C0392B', bg: '#FDEDEC', label: 'Rejected',            desc: 'Your application has been rejected.' },
  'For Resubmission':{ icon: RefreshCw,   color: '#CA6F1E', bg: '#FDF2E9', label: 'For Resubmission',   desc: 'Please re-upload the required documents.' },
  Resubmitted:      { icon: RefreshCw,    color: '#1A5276', bg: '#EBF5FB', label: 'Resubmitted',        desc: 'Requirements have been updated. Please wait for admin review.' },
};

const CLAIM_CONFIG = {
  Claimed:          { icon: Package,      color: '#2471A3', bg: '#EBF5FB', label: 'Rice Already Claimed' },
  'Not Yet Claimed':{ icon: Clock,        color: '#566573', bg: '#F2F3F4', label: 'Not Yet Claimed' },
};

export default function Track() {
  const navigate = useNavigate();
  const [query, setQuery]   = useState('');
  const [type, setType]     = useState('ref'); // 'ref' | 'phone'
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError]   = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const params = type === 'ref' ? { ref: query.trim() } : { phone: query.trim() };
      const res = await api.get('/applications.php?action=track', { params });

      if (res.data.found) {
        setResult(res.data.application);
      } else {
        setError(res.data.message || 'No application found.');
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setError('No application found with the provided information.');
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const status = result ? STATUS_CONFIG[result.status] : null;
  const claim  = result?.claim_status ? CLAIM_CONFIG[result.claim_status] : null;

  return (
    <div className="public-page">
      <div className="public-header">
        <div className="gov-logo">🔍</div>
        <h1>Track Your Application</h1>
        <p>Check the status of your MRD application</p>
      </div>

      <div className="track-card">
        {/* Search form */}
        <div style={{ padding: '28px 28px 0' }}>
          <div style={{ display: 'flex', gap: 0, marginBottom: 14, border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <button
              className={`btn ${type === 'ref' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ flex: 1, borderRadius: 0 }}
              onClick={() => setType('ref')}
            >
              Reference No.
            </button>
            <button
              className={`btn ${type === 'phone' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ flex: 1, borderRadius: 0 }}
              onClick={() => setType('phone')}
            >
              Cellphone No.
            </button>
          </div>

          <form onSubmit={handleSearch}>
            <div className="search-box" style={{ marginBottom: 12 }}>
              <Search size={18} color="var(--text-muted)" />
              <input
                type="text"
                placeholder={type === 'ref' ? 'e.g. MRD-2026-000001' : 'e.g. 09171234567'}
                value={query}
                onChange={e => setQuery(e.target.value)}
                style={{ fontSize: '1.05rem', padding: '13px 0' }}
              />
            </div>
            <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={loading}>
              {loading ? <><div className="spinner-sm" /> Searching...</> : <><Search size={18} /> Search</>}
            </button>
          </form>

          {error && (
            <div className="alert alert-danger" style={{ marginTop: 16 }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}
        </div>

        {/* Result */}
        {result && status && (
          <>
            {/* Status display */}
            <div className="status-display" style={{ background: status.bg }}>
              <div className="status-icon" style={{ background: 'rgba(255,255,255,0.7)', width: 72, height: 72 }}>
                <status.icon size={38} color={status.color} />
              </div>
              <h2 style={{ color: status.color, marginBottom: 6 }}>{status.label}</h2>
              <p style={{ color: 'var(--text-muted)', maxWidth: 320, margin: '0 auto' }}>{status.desc}</p>
            </div>

            <div style={{ padding: '0 28px 28px' }}>
              {/* Reference & name */}
              <div style={{ background: '#F8F9FA', borderRadius: 10, padding: '16px', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Reference Number</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)' }}>{result.reference_number}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Applicant</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700 }}>{result.full_name}</div>
                  </div>
                </div>
              </div>

              {/* Rejection reason */}
              {result.status === 'Rejected' && result.rejection_reason && (
                <div className="alert alert-danger">
                  <XCircle size={16} />
                  <div>
                    <strong>Reason for Rejection:</strong><br />
                    {result.rejection_reason}
                  </div>
                </div>
              )}

              {/* Resubmission */}
              {result.status === 'For Resubmission' && (
                <div className="alert alert-warning" style={{ flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <RefreshCw size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <strong>Documents Needed:</strong><br />
                      {result.resubmission_reason}
                    </div>
                  </div>
                  <button
                    className="btn btn-warning btn-sm"
                    onClick={() => navigate(`/resubmit/${result.reference_number}`)}
                  >
                    <RefreshCw size={14} /> Upload Missing Documents
                  </button>
                </div>
              )}

              {/* Claim status (for approved) */}
              {result.status === 'Approved' && claim && (
                <div style={{
                  background: claim.bg, borderRadius: 10, padding: '14px 18px',
                  display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16
                }}>
                  <claim.icon size={24} color={claim.color} />
                  <div>
                    <div style={{ fontWeight: 700, color: claim.color }}>{claim.label}</div>
                    {result.claim_status === 'Not Yet Claimed' && (
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        Please visit the distribution center to claim your rice assistance.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="timeline" style={{ padding: 0, marginTop: 8 }}>
                <TimelineItem
                  icon={<CheckCircle size={16} />}
                  color="var(--success)"
                  title="Application Submitted"
                  desc={formatDate(result.submitted_at)}
                  done
                />
                <TimelineItem
                  icon={<Clock size={16} />}
                  color={['Approved','Rejected','For Resubmission'].includes(result.status) ? 'var(--success)' : 'var(--text-muted)'}
                  title="Under Review"
                  desc="Admin is reviewing your application"
                  done={['Approved','Rejected','For Resubmission'].includes(result.status)}
                />
                <TimelineItem
                  icon={<CheckCircle size={16} />}
                  color={result.status === 'Approved' ? 'var(--success)' : 'var(--text-muted)'}
                  title="Approved"
                  desc={result.status === 'Approved' ? formatDate(result.updated_at) : 'Pending approval'}
                  done={result.status === 'Approved'}
                />
              </div>

              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>
                  Last updated: {formatDate(result.updated_at)}
                </p>
              </div>
            </div>
          </>
        )}

        {/* Footer links */}
        <div style={{ padding: '16px 28px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/register')}>
            New Application
          </button>
        </div>
      </div>
    </div>
  );
}

function TimelineItem({ icon, color, title, desc, done }) {
  return (
    <div className="timeline-item">
      <div className="timeline-dot" style={{ background: done ? color : '#F4F6F7', color: done ? '#fff' : 'var(--text-muted)' }}>
        {icon}
      </div>
      <div className="timeline-info">
        <h4 style={{ color: done ? 'var(--text)' : 'var(--text-muted)' }}>{title}</h4>
        <p>{desc}</p>
      </div>
    </div>
  );
}

function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
