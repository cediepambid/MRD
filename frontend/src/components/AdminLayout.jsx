import { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Clock, Users, Package,
  CheckSquare, Archive, BarChart2, QrCode,
  Bell, UserCog, Settings, Activity, LogOut, Menu, X,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import api from '../api';

// ── Sidebar navigation ─────────────────────────────────────────────
const NAV = [
  {
    section: 'Overview',
    items: [
      { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    section: 'Applications',
    items: [
      { to: '/admin/applications', icon: FileText, label: 'All Applications' },
      { to: '/admin/pending',      icon: Clock,    label: 'Pending Reviews', badgeKey: 'pending' },
    ],
  },
  {
    section: 'Beneficiaries',
    items: [
      { to: '/admin/beneficiaries',   icon: Users,       label: 'Beneficiary List' },
      { to: '/admin/distribution',    icon: Package,     label: 'Rice Distribution' },
      { to: '/admin/claimed',         icon: CheckSquare, label: 'Claimed List' },
      { to: '/admin/not-yet-claimed', icon: Archive,     label: 'Not Yet Claimed' },
    ],
  },
];

// ── Settings dropdown items (top-right header) ─────────────────────
const SETTINGS_ITEMS = [
  { to: '/admin/reports',       icon: BarChart2, label: 'Reports' },
  { to: '/admin/qr-code',       icon: QrCode,    label: 'QR Code' },
  { to: '/admin/users',         icon: UserCog,   label: 'Users',           roles: ['admin'] },
  { to: '/admin/activity-logs', icon: Activity,  label: 'Activity Logs',   roles: ['admin'] },
  { to: '/admin/settings',      icon: Settings,  label: 'System Settings', roles: ['admin'] },
];

// ── Polling interval (ms) for real-time notification badge ─────────
const POLL_MS = 30_000;

export default function AdminLayout() {
  const { user, logout }  = useAuth();
  const navigate           = useNavigate();

  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [badges, setBadges]             = useState({ pending: 0, notif: 0 });
  const settingsRef  = useRef(null);
  const fetchingRef  = useRef(false); // guard: skip poll if previous one is still in-flight

  // ── Fetch badge counts (pending apps + unread notifications) ──────
  const fetchBadges = useCallback(() => {
    if (fetchingRef.current) return; // skip if a request is already pending
    fetchingRef.current = true;
    api.get('/dashboard.php')
      .then(res => setBadges({
        pending: res.data.summary?.pending     || 0,
        notif:   res.data.unread_notifications || 0,
      }))
      .catch(() => {})
      .finally(() => { fetchingRef.current = false; });
  }, []);

  // Run once on mount: fetch immediately, then poll every 30 s.
  useEffect(() => {
    fetchBadges();
    const timer = setInterval(fetchBadges, POLL_MS);
    return () => clearInterval(timer);
  }, [fetchBadges]);

  // Close settings dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const canSee = (item) => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role);
  };

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
    : '?';

  return (
    <div className="app-layout">
      {/* Mobile sidebar overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <h1>🍚 MRD System</h1>
          <p>Monthly Rice Distribution</p>
          <span className="sidebar-badge">GOV'T PROGRAM</span>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(section => {
            const visibleItems = section.items.filter(canSee);
            if (visibleItems.length === 0) return null;
            return (
              <div key={section.section}>
                <div className="sidebar-section-label">{section.section}</div>
                {visibleItems.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon size={18} />
                    {item.label}
                    {item.badgeKey && badges[item.badgeKey] > 0 && (
                      <span className="badge-dot">{badges[item.badgeKey]}</span>
                    )}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        {/* Sidebar footer — user info only, no Sign Out button here */}
        <div className="sidebar-footer">
          <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.88rem' }}>{user?.name}</div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginTop: 3 }}>
            {user?.role?.replace(/_/g, ' ').toUpperCase()}
          </div>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────── */}
      <div className="main-content">

        {/* Top navbar */}
        <header className="topnav">
          <div className="topnav-left">
            <button className="hamburger-btn" onClick={() => setSidebarOpen(s => !s)}>
              {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: '1rem' }}>
              MRD Admin Portal
            </span>
          </div>

          <div className="topnav-right">

            {/* ── Bell icon with real-time badge ── */}
            <button
              onClick={() => navigate('/admin/notifications')}
              className="topnav-icon-btn"
              title="Notifications"
            >
              <Bell size={21} />
              {badges.notif > 0 && (
                <span style={{
                  position: 'absolute', top: 1, right: 1,
                  background: 'var(--danger)', color: '#fff',
                  borderRadius: '99px', fontSize: '0.62rem', fontWeight: 700,
                  minWidth: 17, height: 17,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px', lineHeight: 1,
                }}>
                  {badges.notif > 99 ? '99+' : badges.notif}
                </span>
              )}
            </button>

            {/* ── Settings dropdown ── */}
            <div ref={settingsRef} style={{ position: 'relative' }}>
              <button
                className="topnav-icon-btn"
                onClick={() => setSettingsOpen(o => !o)}
                title="Settings"
              >
                <Settings size={21} />
                <ChevronDown
                  size={13}
                  style={{
                    marginLeft: 2,
                    transform: settingsOpen ? 'rotate(180deg)' : 'rotate(0)',
                    transition: 'transform 0.2s',
                  }}
                />
              </button>

              {settingsOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  background: '#fff', border: '1px solid var(--border)',
                  borderRadius: 10, boxShadow: 'var(--shadow-lg)',
                  minWidth: 200, zIndex: 999,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '8px 14px 6px',
                    fontSize: '0.68rem', fontWeight: 700, letterSpacing: '1px',
                    color: 'var(--text-muted)', textTransform: 'uppercase',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    Settings
                  </div>
                  {SETTINGS_ITEMS.filter(canSee).map(item => (
                    <button
                      key={item.to}
                      onClick={() => { setSettingsOpen(false); navigate(item.to); }}
                      style={{
                        width: '100%', padding: '10px 16px',
                        background: 'none', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 10,
                        fontSize: '0.9rem', color: 'var(--text)', textAlign: 'left',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <item.icon size={16} color="var(--text-muted)" />
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Divider ── */}
            <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />

            {/* ── User avatar (display only) ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px' }}>
              <div className="topnav-avatar">{initials}</div>
              <div style={{ lineHeight: 1.2 }}>
                <div style={{
                  maxWidth: 120, overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)',
                }}>
                  {user?.name}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  {user?.role?.replace(/_/g, ' ').toUpperCase()}
                </div>
              </div>
            </div>

            {/* ── Sign Out button ── */}
            <button
              onClick={handleLogout}
              className="topnav-signout-btn"
              title="Sign Out"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>

          </div>
        </header>

        {/* Page content */}
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
