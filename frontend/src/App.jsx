import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';

// ── Eager import: Login is the GTmetrix-tested entry point – keep it tiny ──
import AdminLogin from './pages/admin/Login';

// ── Lazy: public pages (loaded only when the user visits those routes) ──
const Register = lazy(() => import('./pages/public/Register'));
const Track    = lazy(() => import('./pages/public/Track'));
const Resubmit = lazy(() => import('./pages/public/Resubmit'));

// ── Lazy: admin layout shell ──
const AdminLayout = lazy(() => import('./components/AdminLayout'));

// ── Lazy: every admin page is its own async chunk ──
const Dashboard      = lazy(() => import('./pages/admin/Dashboard'));
const Applications   = lazy(() => import('./pages/admin/Applications'));
const PendingReviews = lazy(() => import('./pages/admin/PendingReviews'));
const Beneficiaries  = lazy(() => import('./pages/admin/Beneficiaries'));
const Distribution   = lazy(() => import('./pages/admin/Distribution'));
const ClaimedList    = lazy(() => import('./pages/admin/ClaimedList'));
const NotYetClaimed  = lazy(() => import('./pages/admin/NotYetClaimed'));
const Reports        = lazy(() => import('./pages/admin/Reports'));
const QRCode         = lazy(() => import('./pages/admin/QRCode'));
const Notifications  = lazy(() => import('./pages/admin/Notifications'));
const Users          = lazy(() => import('./pages/admin/Users'));
const Settings       = lazy(() => import('./pages/admin/Settings'));

// ── Lightweight fallback shown while a lazy chunk is downloading ──
function PageLoader() {
  return (
    <div className="loading-overlay">
      <div className="spinner" style={{ width: 44, height: 44 }} />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return user ? children : <Navigate to="/admin/login" replace />;
}

function GuestOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  // Show login form immediately instead of a blank screen.
  // If the user turns out to be authenticated, the Navigate below redirects them.
  if (loading) return children;
  return user ? <Navigate to="/admin/dashboard" replace /> : children;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ── Public Routes ────────────────────────────────── */}
        <Route path="/"          element={<Navigate to="/admin/login" replace />} />
        <Route path="/register"  element={<Register />} />
        <Route path="/track"     element={<Track />} />
        <Route path="/resubmit/:ref" element={<Resubmit />} />

        {/* ── Admin Auth ───────────────────────────────────── */}
        <Route
          path="/admin/login"
          element={<GuestOnlyRoute><AdminLogin /></GuestOnlyRoute>}
        />

        {/* ── Admin Protected ──────────────────────────────── */}
        <Route
          path="/admin"
          element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard"       element={<Dashboard />} />
          <Route path="applications"    element={<Applications />} />
          <Route path="pending"         element={<PendingReviews />} />
          <Route path="beneficiaries"   element={<Beneficiaries />} />
          <Route path="distribution"    element={<Distribution />} />
          <Route path="claimed"         element={<ClaimedList />} />
          <Route path="not-yet-claimed" element={<NotYetClaimed />} />
          <Route path="reports"         element={<Reports />} />
          <Route path="qr-code"         element={<QRCode />} />
          <Route path="notifications"   element={<Notifications />} />
          <Route path="users"           element={<Users />} />
          <Route path="settings"        element={<Settings />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/admin/login" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#fff',
            color: '#1C2833',
            borderRadius: '10px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            fontSize: '0.93rem',
            fontWeight: 500,
            padding: '14px 18px',
          },
          success: { iconTheme: { primary: '#1E8449', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#C0392B', secondary: '#fff' } },
        }}
      />
    </AuthProvider>
  );
}
