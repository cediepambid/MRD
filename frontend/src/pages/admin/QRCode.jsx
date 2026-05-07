import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Download, Printer, Copy, RefreshCw, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api';

export default function QRCodePage() {
  const [qr, setQr]         = useState(null);
  const [regUrl, setRegUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchQR = () => {
    setLoading(true);
    api.get('/qr_codes.php?action=current')
      .then(res => {
        setQr(res.data.qr);
        setRegUrl(res.data.reg_url || '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchQR(); }, []);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await api.post('/qr_codes.php?action=generate');
      setRegUrl(res.data.registration_url);
      toast.success('New QR Code generated!');
      fetchQR();
    } catch {
      toast.error('Failed to generate QR Code.');
    } finally {
      setGenerating(false);
    }
  };

  const toggleActive = async () => {
    if (!qr) return;
    try {
      await api.post(`/qr_codes.php?action=toggle&id=${qr.id}`, { is_active: !qr.is_active });
      setQr(q => ({ ...q, is_active: !q.is_active }));
      toast.success(qr.is_active ? 'QR Code disabled.' : 'QR Code enabled.');
    } catch {
      toast.error('Failed to toggle QR Code.');
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(regUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Registration link copied!');
    });
  };

  const downloadQR = () => {
    const svg = document.getElementById('mrd-qr-svg');
    if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([data], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'MRD_Registration_QR.svg'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <QrCode size={24} color="var(--primary)" /> QR Code Management
        </h2>
        <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>
          Generate and manage the registration QR Code for TODA members
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* QR Display */}
        <div className="card" style={{ textAlign: 'center' }}>
          <h4 style={{ marginBottom: 20 }}>Registration QR Code</h4>

          {loading ? (
            <div style={{ padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : regUrl ? (
            <>
              <div style={{
                display: 'inline-flex', padding: 20, background: '#fff',
                border: '3px solid var(--primary)', borderRadius: 16, marginBottom: 20,
                opacity: qr && !qr.is_active ? 0.4 : 1
              }}>
                <QRCodeSVG
                  id="mrd-qr-svg"
                  value={regUrl}
                  size={220}
                  level="H"
                  includeMargin
                />
              </div>

              {qr && !qr.is_active && (
                <div className="alert alert-warning" style={{ textAlign: 'left', marginBottom: 16 }}>
                  ⚠️ This QR Code is currently <strong>disabled</strong>. Scanning it will not work.
                </div>
              )}

              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 20 }}>
                Scan this QR code to open the MRD Registration Form
              </p>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={downloadQR}>
                  <Download size={16} /> Download SVG
                </button>
                <button className="btn btn-outline" onClick={() => window.print()}>
                  <Printer size={16} /> Print
                </button>
                <button
                  className={`btn ${qr?.is_active ? 'btn-danger' : 'btn-success'}`}
                  onClick={toggleActive}
                >
                  {qr?.is_active ? 'Disable' : 'Enable'}
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <QrCode size={48} />
              <h3>No QR Code</h3>
              <p>Generate a QR Code to get started.</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Generate */}
          <div className="card">
            <h4 style={{ marginBottom: 12 }}>Generate New QR Code</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: 16 }}>
              Generating a new QR Code will deactivate the current one.
              All previously printed QR codes will stop working.
            </p>
            <button className="btn btn-primary btn-block" onClick={generate} disabled={generating}>
              {generating
                ? <><div className="spinner-sm" /> Generating...</>
                : <><RefreshCw size={16} /> Generate New QR Code</>
              }
            </button>
          </div>

          {/* Registration link */}
          <div className="card">
            <h4 style={{ marginBottom: 12 }}>Registration Link</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: 12 }}>
              Share this link directly with TODA members who cannot scan QR codes.
            </p>
            <div style={{
              background: '#F8F9FA', border: '1px solid var(--border)',
              borderRadius: 8, padding: '12px 14px',
              fontSize: '0.82rem', wordBreak: 'break-all',
              color: 'var(--primary)', marginBottom: 12
            }}>
              {regUrl || 'No registration URL configured'}
            </div>
            <button className="btn btn-outline btn-block" onClick={copyLink}>
              {copied ? <><CheckCircle size={16} /> Copied!</> : <><Copy size={16} /> Copy Link</>}
            </button>
          </div>

          {/* QR info */}
          {qr && (
            <div className="card">
              <h4 style={{ marginBottom: 12 }}>QR Code Info</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  ['Status',    qr.is_active ? '✅ Active' : '❌ Disabled'],
                  ['Generated', new Date(qr.generated_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{k}</span>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="card" style={{ background: '#EBF5FB' }}>
            <h4 style={{ marginBottom: 10 }}>📋 Instructions</h4>
            <ol style={{ paddingLeft: 18, fontSize: '0.88rem', lineHeight: 1.7, color: 'var(--text-muted)' }}>
              <li>Generate a QR Code from this page</li>
              <li>Print or display the QR Code at TODA offices</li>
              <li>Members scan the QR Code with their phone</li>
              <li>They fill up the registration form</li>
              <li>Review and approve applications in the admin panel</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
