import { useState, useEffect } from 'react';
import { Bell, CheckCheck, Clock, FileText, CheckCircle, XCircle, RefreshCw, Package } from 'lucide-react';
import api from '../../api';

const TYPE_ICONS = {
  new_application:  FileText,
  approved:         CheckCircle,
  rejected:         XCircle,
  resubmission:     RefreshCw,
  mark_claimed:     Package,
};

export default function Notifications() {
  const [list, setList]     = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = () => {
    setLoading(true);
    api.get('/notifications.php?action=list')
      .then(res => setList(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const markRead = async (id) => {
    await api.post('/notifications.php?action=mark_read', { id });
    setList(l => l.map(n => n.id === id ? { ...n, is_read: 1 } : n));
  };

  const markAllRead = async () => {
    await api.post('/notifications.php?action=mark_read', { id: 0 });
    setList(l => l.map(n => ({ ...n, is_read: 1 })));
  };

  const unread = list.filter(n => !n.is_read).length;

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={24} color="var(--primary)" /> Notifications
            {unread > 0 && (
              <span className="badge badge-rejected" style={{ fontSize: '0.8rem' }}>{unread} unread</span>
            )}
          </h2>
          <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>Application and system notifications</p>
        </div>
        {unread > 0 && (
          <button className="btn btn-outline btn-sm" onClick={markAllRead}>
            <CheckCheck size={16} /> Mark All as Read
          </button>
        )}
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : list.length === 0 ? (
          <div className="empty-state">
            <Bell size={48} />
            <h3>No Notifications</h3>
            <p>You're all caught up!</p>
          </div>
        ) : (
          <div>
            {list.map(n => {
              const Icon = TYPE_ICONS[n.type] || Bell;
              return (
                <div
                  key={n.id}
                  style={{
                    display: 'flex', gap: 14, padding: '16px 20px',
                    borderBottom: '1px solid var(--border)',
                    background: n.is_read ? 'transparent' : '#EBF5FB',
                    cursor: n.is_read ? 'default' : 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onClick={() => !n.is_read && markRead(n.id)}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: n.is_read ? '#F4F6F7' : 'var(--primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, color: n.is_read ? 'var(--text-muted)' : '#fff'
                  }}>
                    <Icon size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: n.is_read ? 500 : 700, fontSize: '0.95rem' }}>{n.title}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>{n.message}</div>
                    {n.reference_number && (
                      <span style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600, marginTop: 4, display: 'inline-block' }}>
                        {n.reference_number}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      <Clock size={12} style={{ marginRight: 3 }} />
                      {new Date(n.created_at).toLocaleDateString('en-PH', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}
                    </span>
                    {!n.is_read && (
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', display: 'block' }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
