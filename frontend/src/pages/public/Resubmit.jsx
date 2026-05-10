import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Upload, CheckCircle, AlertCircle, FileText, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api';

const ALL_ATTACHMENTS = [
  { key: 'drivers_license',   label: "Driver's License",                required: true  },
  { key: 'franchise_receipt', label: "Franchise Receipt / Mayor's Permit", required: true  },
  { key: 'cedula',            label: 'Updated Cedula',                    required: true  },
  { key: 'id_picture',        label: '2x2 ID Picture',                    required: true  },
  { key: 'valid_id',          label: 'Valid Government ID',               required: false },
];

export default function Resubmit() {
  const { ref } = useParams();
  const navigate = useNavigate();
  const [app, setApp]             = useState(null);
  const [loading, setLoading]     = useState(true);
  const [files, setFiles]         = useState({});
  const [previews, setPreviews]   = useState({});
  const [uploaded, setUploaded]   = useState({});
  const [uploading, setUploading] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]           = useState(false);
  // Only the docs the admin flagged as needing resubmission
  const [needsUpload, setNeedsUpload] = useState([]);

  useEffect(() => {
    api.get('/applications.php?action=track', { params: { ref } })
      .then(res => {
        if (res.data.found) {
          const a = res.data.application;
          if (!['For Resubmission','Rejected'].includes(a.status)) {
            toast.error('This application is not eligible for resubmission.');
            navigate('/track');
          }
          setApp(a);

          // Determine which docs need re-uploading:
          // If admin marked specific attachments as Missing/Invalid, only show those.
          // Otherwise show all (fallback for older apps without attachment status).
          const existingAtts = a.attachments || [];
          const badStatuses  = ['Missing', 'Invalid', 'Pending'];

          // Build a map: key -> status
          const attStatusMap = {};
          existingAtts.forEach(att => {
            attStatusMap[att.attachment_type] = att.status;
          });

          // A doc needs upload if it's Missing, Invalid, or never uploaded.
          // It does NOT need upload if it's 'Complete' or 'Pending'.
          const toUpload = ALL_ATTACHMENTS.filter(att => {
            const st = attStatusMap[att.key];
            if (st === 'Complete' || st === 'Pending') return false;
            return true;
          });

          setNeedsUpload(toUpload);
        } else {
          toast.error('Application not found.');
          navigate('/track');
        }
      })
      .catch(() => navigate('/track'))
      .finally(() => setLoading(false));
  }, [ref]);

  const handleFile = async (attKey, file) => {
    if (!file) return;
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) { toast.error('File too large. Max 5MB.'); return; }
    const allowed = ['image/jpeg','image/jpg','image/png','image/webp','application/pdf'];
    if (!allowed.includes(file.type)) { toast.error('Invalid file type.'); return; }

    setFiles(f => ({ ...f, [attKey]: file }));
    if (file.type.startsWith('image/')) {
      setPreviews(p => ({ ...p, [attKey]: URL.createObjectURL(file) }));
    } else {
      setPreviews(p => ({ ...p, [attKey]: 'pdf' }));
    }

    setUploading(u => ({ ...u, [attKey]: true }));
    const fd = new FormData();
    fd.append('reference_number', ref);
    fd.append('attachment_type', attKey);
    fd.append('file', file);

    try {
      const res = await api.post('/upload.php', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data.success) {
        setUploaded(u => ({ ...u, [attKey]: true }));
        toast.success('File uploaded!');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed.');
      setFiles(f => { const c={...f}; delete c[attKey]; return c; });
      setPreviews(p => { const c={...p}; delete c[attKey]; return c; });
    } finally {
      setUploading(u => ({ ...u, [attKey]: false }));
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post(`/applications.php?action=resubmit&ref=${ref}`);
      setDone(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Resubmission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="public-page">
      <div style={{ textAlign: 'center', color: '#fff', padding: 60 }}>
        <div className="spinner" style={{ margin: '0 auto', borderTopColor: '#fff' }} />
        <p style={{ marginTop: 16 }}>Loading...</p>
      </div>
    </div>
  );

  if (done) return (
    <div className="public-page">
      <div className="public-card" style={{ maxWidth: 500, margin: '0 auto' }}>
        <div className="success-screen">
          <div className="success-icon"><CheckCircle size={44} /></div>
          <h2 style={{ color: 'var(--success)' }}>Requirements Updated!</h2>
          <p style={{ color: 'var(--text-muted)', margin: '12px auto 24px', maxWidth: 340 }}>
            Your missing/invalid documents have been resubmitted. Your application is now for review again.
          </p>
          <div className="ref-number-box">
            <div className="label">Reference Number</div>
            <div className="ref">{ref}</div>
          </div>
          <button className="btn btn-primary btn-lg" style={{ marginTop: 20 }} onClick={() => navigate('/track')}>
            Track Application
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="public-page">
      <div className="public-header">
        <div className="gov-logo">📎</div>
        <h1>Resubmit Documents</h1>
        <p>Reference: {ref}</p>
      </div>

      <div className="public-card" style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ padding: '24px 28px' }}>
          {app?.resubmission_reason && (
            <div className="alert alert-warning" style={{ marginBottom: 20 }}>
              <AlertCircle size={16} />
              <div>
                <strong>Documents Required:</strong><br />
                {app.resubmission_reason}
              </div>
            </div>
          )}

          {needsUpload.length < ALL_ATTACHMENTS.length && (
            <div className="alert alert-success" style={{ marginBottom: 16 }}>
              <CheckCircle size={16} />
              <div>
                <strong>Good news!</strong> Some documents are already complete.
                Only the documents below need to be re-uploaded.
              </div>
            </div>
          )}

          <div className="attachment-grid" style={{ display: 'grid', gap: 14 }}>
            {needsUpload.map(att => (
              <div key={att.key} className="attachment-item">
                <div className="attachment-label">
                  <h4><FileText size={16} color="var(--primary)" />{att.label}</h4>
                  <span className={`req-tag ${att.required ? 'required' : 'optional'}`}>
                    {att.required ? 'Required' : 'Optional'}
                  </span>
                </div>
                {!files[att.key] ? (
                  <label className="upload-area" style={{ display: 'block' }}>
                    <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf"
                      style={{ display: 'none' }}
                      onChange={e => handleFile(att.key, e.target.files[0])} />
                    <div className="upload-icon"><Upload size={24} /></div>
                    <p>Tap to upload</p>
                    <div className="upload-hint">JPG, PNG, WEBP, PDF · Max 5MB</div>
                  </label>
                ) : (
                  <div className="upload-preview">
                    {previews[att.key] === 'pdf'
                      ? <div className="pdf-icon">📄</div>
                      : <img src={previews[att.key]} alt="preview" />
                    }
                    <div className="upload-preview-info">
                      {uploading[att.key]
                        ? <div style={{ fontSize:'0.82rem', color:'var(--primary)', fontWeight:600 }}>Uploading...</div>
                        : <div style={{ fontSize:'0.82rem', color:'var(--success)', fontWeight:600 }}>✓ Uploaded</div>
                      }
                    </div>
                    <button
                      className="upload-remove-btn"
                      onClick={() => {
                        setFiles(f => { const c={...f}; delete c[att.key]; return c; });
                        setPreviews(p => { const c={...p}; delete c[att.key]; return c; });
                        setUploaded(u => { const c={...u}; delete c[att.key]; return c; });
                      }}
                      title="Remove"
                    >
                      <X size={18} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            className="btn btn-primary btn-block btn-lg"
            style={{ marginTop: 24 }}
            onClick={handleSubmit}
            disabled={submitting || needsUpload.some(a => a.required && !uploaded[a.key])}
          >
            {submitting ? <><div className="spinner-sm" /> Submitting...</> : 'Submit Resubmission'}
          </button>
        </div>
      </div>
    </div>
  );
}
