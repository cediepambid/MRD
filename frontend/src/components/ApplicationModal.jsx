import { useEffect, useState } from 'react';
import {
  X, CheckCircle, XCircle, RefreshCw, Download,
  AlertCircle, User, MapPin, Phone, FileText, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';
import { getFileUrl } from '../api';
import StatusBadge from './StatusBadge';

const ATTACHMENT_LABELS = {
  drivers_license:   "Driver's License",
  franchise_receipt: "Franchise Receipt / Mayor's Permit",
  cedula:            'Updated Cedula',
  id_picture:        '2x2 ID Picture',
  valid_id:          'Valid Government ID',
};

const ATT_STATUSES = ['Pending','Complete','Missing','Invalid'];

export default function ApplicationModal({ id, onClose }) {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [action, setAction]     = useState(''); // 'approve'|'reject'|'resubmit'
  const [reason, setReason]     = useState('');
  const [processing, setProcessing] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);

  const fetch = () => {
    setLoading(true);
    api.get(`/applications.php?action=detail&id=${id}`)
      .then(res => setData(res.data))
      .catch(() => toast.error('Failed to load application'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, [id]);

  const handleAction = async () => {
    if ((action === 'reject' || action === 'resubmit') && !reason.trim()) {
      toast.error('Please enter a reason.');
      return;
    }
    setProcessing(true);
    try {
      const endpoint =
        action === 'approve'  ? `/applications.php?action=approve&id=${id}` :
        action === 'reject'   ? `/applications.php?action=reject&id=${id}` :
                                `/applications.php?action=request_resubmission&id=${id}`;
      const body = action !== 'approve' ? { reason } : undefined;

      const res = await api.post(endpoint, body);
      toast.success(res.data.message);
      setAction('');
      setReason('');
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed.');
    } finally {
      setProcessing(false);
    }
  };

  const updateAttStatus = async (attId, status) => {
    try {
      await api.put(`/applications.php?action=update_attachment&att_id=${attId}`, { status });
      fetch();
    } catch {
      toast.error('Failed to update attachment status.');
    }
  };

  const app = data?.application;
  const atts = data?.attachments || [];
  const ben  = data?.beneficiary;

  return (
    <>
      {previewImg && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setPreviewImg(null)}>
          <div style={{ maxWidth: '90vw', maxHeight: '90vh', position: 'relative' }}>
            <img src={previewImg} alt="preview" style={{ maxWidth: '85vw', maxHeight: '85vh', borderRadius: 10 }} />
            <button onClick={() => setPreviewImg(null)} style={{
              position: 'absolute', top: -16, right: -16,
              background: '#fff', border: 'none', borderRadius: '50%',
              width: 32, height: 32, cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center'
            }}><X size={18} /></button>
          </div>
        </div>
      )}

      <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
        <div className="modal modal-lg">
          <div className="modal-header">
            <h3>Application Details</h3>
            <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={20} /></button>
          </div>

          {loading ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto' }} />
            </div>
          ) : app ? (
            <div className="modal-body" style={{ padding: '0' }}>
              {/* Status bar */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 24px', background: '#F8F9FA', borderBottom: '1px solid var(--border)',
                flexWrap: 'wrap', gap: 10
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)' }}>
                    {app.reference_number}
                  </span>
                  <StatusBadge status={app.status} />
                  {ben && <StatusBadge status={ben.claim_status} />}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {app.status !== 'Approved' && (
                    <button className="btn btn-success btn-sm" onClick={() => setAction('approve')}>
                      <CheckCircle size={14} /> Approve
                    </button>
                  )}
                  {app.status !== 'Rejected' && (
                    <button className="btn btn-danger btn-sm" onClick={() => setAction('reject')}>
                      <XCircle size={14} /> Reject
                    </button>
                  )}
                  {!['Approved','For Resubmission'].includes(app.status) && (
                    <button className="btn btn-warning btn-sm" onClick={() => setAction('resubmit')}>
                      <RefreshCw size={14} /> Request Resubmission
                    </button>
                  )}
                </div>
              </div>

              {/* Action form */}
              {action && action !== 'approve' && (
                <div style={{ padding: '16px 24px', background: '#FEF9E7', borderBottom: '1px solid var(--border)' }}>
                  <h4 style={{ marginBottom: 10, color: 'var(--warning)' }}>
                    {action === 'reject' ? 'Rejection Reason' : 'Resubmission Note'}
                    <span className="required" style={{ color: 'var(--danger)', marginLeft: 4 }}>*</span>
                  </h4>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder={action === 'reject' ? 'Enter reason for rejection...' : 'Specify which documents need to be resubmitted...'}
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => { setAction(''); setReason(''); }}>Cancel</button>
                    <button
                      className={`btn btn-sm ${action === 'reject' ? 'btn-danger' : 'btn-warning'}`}
                      onClick={handleAction}
                      disabled={processing}
                    >
                      {processing ? <><div className="spinner-sm" /> Processing...</> : 'Confirm'}
                    </button>
                  </div>
                </div>
              )}
              {action === 'approve' && (
                <div style={{ padding: '16px 24px', background: '#EAFAF1', borderBottom: '1px solid var(--border)' }}>
                  <p style={{ color: 'var(--success)', fontWeight: 600, marginBottom: 10 }}>
                    <CheckCircle size={16} style={{ marginRight: 6, display: 'inline' }} />
                    Confirm approval of this application?
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => setAction('')}>Cancel</button>
                    <button className="btn btn-success btn-sm" onClick={handleAction} disabled={processing}>
                      {processing ? <><div className="spinner-sm" /> Processing...</> : 'Confirm Approve'}
                    </button>
                  </div>
                </div>
              )}

              <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {/* Left: Personal info */}
                <div>
                  <h4 style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <User size={16} color="var(--primary)" /> Personal Information
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      ['Sector', app.sector],
                      ['Surname', app.surname],
                      ['Given Name', app.given_name],
                      ['Middle Name', app.middle_name || '—'],
                      ['Date of Birth', app.date_of_birth],
                      ['Age', app.age],
                      ['Gender', app.gender],
                      ['Civil Status', app.civil_status],
                      ['Spouse Name', app.spouse_name || '—'],
                      ['Education', app.educational_attainment || '—'],
                    ].map(([label, val]) => (
                      <div key={label} className="detail-item">
                        <label>{label}</label>
                        <p>{val}</p>
                      </div>
                    ))}
                  </div>

                  <h4 style={{ margin: '20px 0 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={16} color="var(--primary)" /> Address &amp; Contact
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      ['Complete Address', app.complete_address],
                      ['Barangay', app.barangay],
                      ['Town/City', app.town_city],
                      ['Province', app.province],
                      ['Cellphone', app.cellphone],
                    ].map(([label, val]) => (
                      <div key={label} className="detail-item">
                        <label>{label}</label>
                        <p>{val || '—'}</p>
                      </div>
                    ))}
                  </div>

                  <h4 style={{ margin: '20px 0 14px' }}>🚲 TODA Information</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      ['TODA Name', app.toda_name || '—'],
                      ['Franchise No.', app.franchise_number || '—'],
                      ["Driver's License No.", app.drivers_license_number || '—'],
                    ].map(([label, val]) => (
                      <div key={label} className="detail-item" style={{ gridColumn: label === 'TODA Name' ? 'span 2' : '' }}>
                        <label>{label}</label>
                        <p>{val}</p>
                      </div>
                    ))}
                  </div>

                  {app.rejection_reason && (
                    <div className="alert alert-danger" style={{ marginTop: 16 }}>
                      <XCircle size={14} />
                      <div><strong>Rejection Reason:</strong> {app.rejection_reason}</div>
                    </div>
                  )}
                  {app.resubmission_reason && (
                    <div className="alert alert-warning" style={{ marginTop: 16 }}>
                      <RefreshCw size={14} />
                      <div><strong>Resubmission Note:</strong> {app.resubmission_reason}</div>
                    </div>
                  )}
                </div>

                {/* Right: Attachments */}
                <div>
                  <h4 style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileText size={16} color="var(--primary)" /> Uploaded Documents
                  </h4>

                  {Object.entries(ATTACHMENT_LABELS).map(([key, label]) => {
                    const att = atts.find(a => a.attachment_type === key);
                    return (
                      <div key={key} style={{
                        border: '1.5px solid var(--border)', borderRadius: 10,
                        padding: 14, marginBottom: 10
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{label}</span>
                          {att ? (
                            <select
                              value={att.status}
                              onChange={e => updateAttStatus(att.id, e.target.value)}
                              style={{ fontSize: '0.8rem', padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)' }}
                            >
                              {ATT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Not uploaded</span>
                          )}
                        </div>

                        {att ? (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {att.mime_type?.startsWith('image/') ? (
                              <img
                                src={getFileUrl(att.file_path)}
                                alt={label}
                                style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, cursor: 'pointer', border: '1px solid var(--border)' }}
                                onClick={() => setPreviewImg(getFileUrl(att.file_path))}
                              />
                            ) : (
                              <div style={{ width: 56, height: 56, background: '#FDEDEC', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                                📄
                              </div>
                            )}
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {att.file_name}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {att.mime_type} · {(att.file_size/1024).toFixed(1)} KB
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {att.mime_type?.startsWith('image/') && (
                                <button className="btn btn-ghost btn-icon btn-sm"
                                  onClick={() => setPreviewImg(getFileUrl(att.file_path))}>
                                  <Eye size={14} />
                                </button>
                              )}
                              <a
                                href={getFileUrl(att.file_path)}
                                download={att.file_name}
                                className="btn btn-ghost btn-icon btn-sm"
                              >
                                <Download size={14} />
                              </a>
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            No file uploaded
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Beneficiary info */}
                  {ben && (
                    <div style={{ marginTop: 16, padding: 16, background: '#EBF5FB', borderRadius: 10, border: '1px solid #85C1E9' }}>
                      <h4 style={{ marginBottom: 10, color: 'var(--info)' }}>🍚 Rice Claim Info</h4>
                      <div className="detail-item">
                        <label>Claim Status</label>
                        <p><strong>{ben.claim_status}</strong></p>
                      </div>
                      {ben.claimed_at && (
                        <div className="detail-item" style={{ marginTop: 8 }}>
                          <label>Claimed At</label>
                          <p>{new Date(ben.claimed_at).toLocaleDateString('en-PH')}</p>
                        </div>
                      )}
                      {ben.released_by_name && (
                        <div className="detail-item" style={{ marginTop: 8 }}>
                          <label>Released By</label>
                          <p>{ben.released_by_name}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer meta */}
              <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', background: '#F8F9FA', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <span>Submitted: {new Date(app.submitted_at).toLocaleString('en-PH')}</span>
                {app.approved_at && <span>Approved: {new Date(app.approved_at).toLocaleString('en-PH')}</span>}
                {app.approved_by_name && <span>Approved by: {app.approved_by_name}</span>}
                <span>IP: {app.ip_address || '—'}</span>
              </div>
            </div>
          ) : (
            <div className="modal-body">
              <div className="alert alert-danger"><AlertCircle size={16} /> Failed to load application.</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
