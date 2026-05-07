# MRD – Monthly Rice Distribution Program

A complete web-based system for registration, verification, approval, and monitoring of
TODA / tricycle franchise holders receiving monthly rice assistance.

---

## Tech Stack

| Layer    | Technology                              |
|----------|-----------------------------------------|
| Frontend | React 18, React Router v6, Vite 5       |
| Charts   | Recharts                                |
| QR Code  | qrcode.react                            |
| Icons    | Lucide React                            |
| Toast    | react-hot-toast                         |
| Backend  | PHP 8+, PDO                             |
| Database | MySQL / MariaDB                         |
| Server   | Apache (XAMPP)                          |

---

## Quick Setup

### 1. Database

1. Open phpMyAdmin → `http://localhost/phpmyadmin`
2. Import: `database/mrd.sql`

**Default Admin Login:**
- Email: `admin@mrd.gov.ph`
- Password: `password`

### 2. Access the System

| URL | Description |
|-----|-------------|
| `http://localhost/MRD/public/#/register` | Public Registration Form |
| `http://localhost/MRD/public/#/track` | Application Status Tracking |
| `http://localhost/MRD/public/#/admin/login` | Admin Login |
| `http://localhost/MRD/public/#/admin/dashboard` | Admin Dashboard |

### 3. Frontend Development (Hot Reload)

```powershell
cd frontend
npm install
npm run dev
```

Then open `http://localhost:5174/`

After changes, rebuild:
```powershell
npm run build
```

---

## System Flow

1. Admin generates QR Code → `Admin > QR Code`
2. TODA member scans QR → Opens Registration Form
3. Member fills the form (3-step wizard)
4. Member uploads required documents
5. Application submitted → Status: **Pending**
6. Admin receives notification
7. Admin reviews application + documents
8. Admin approves, rejects, or requests resubmission
9. If approved → added to Beneficiary Master List
10. Releasing Officer marks as Claimed when rice is distributed
11. Admin monitors Claimed vs Not Yet Claimed lists

---

## Project Structure

```
MRD/
├── api/                    # PHP API endpoints
│   ├── config.php          # DB connection + helpers + auth
│   ├── cors.php            # CORS headers
│   ├── auth.php            # Login / logout / profile
│   ├── applications.php    # Submit, track, approve, reject
│   ├── upload.php          # File upload handler
│   ├── beneficiaries.php   # Beneficiary list + mark claimed
│   ├── dashboard.php       # Dashboard analytics
│   ├── notifications.php   # Notification system
│   ├── activity_logs.php   # Audit trail
│   ├── qr_codes.php        # QR Code management
│   ├── reports.php         # Report generation
│   ├── users.php           # User management
│   └── settings.php        # System settings
├── database/
│   └── mrd.sql             # Database schema + default data
├── frontend/               # React source (Vite)
│   ├── src/
│   │   ├── components/     # Shared components
│   │   ├── hooks/          # useAuth context
│   │   ├── pages/
│   │   │   ├── admin/      # Admin pages
│   │   │   └── public/     # Public pages (Register, Track)
│   │   ├── App.jsx         # Routes
│   │   ├── api.js          # Axios instance
│   │   └── index.css       # Design system
│   ├── package.json
│   └── vite.config.js
├── public/                 # Built React app (served by Apache)
│   ├── index.html
│   ├── .htaccess
│   └── assets/
├── uploads/                # Applicant documents
│   ├── drivers_license/
│   ├── franchise_receipt/
│   ├── cedula/
│   ├── id_picture/
│   └── valid_id/
└── README.md
```

---

## User Roles

| Role              | Permissions                                      |
|-------------------|--------------------------------------------------|
| Super Admin       | Full access, user management, settings           |
| MRD Admin         | Applications, beneficiaries, reports             |
| Verifier          | Review applications, update attachment status    |
| Releasing Officer | Mark beneficiaries as claimed                    |
| Viewer            | Reports only                                     |

---

## API Endpoints

### Public (No Auth Required)
- `POST /api/applications.php?action=submit` — Submit application
- `GET  /api/applications.php?action=track` — Track by ref no. or phone
- `POST /api/applications.php?action=resubmit` — Resubmit documents
- `POST /api/upload.php` — Upload attachment

### Admin (Auth Required)
- `GET  /api/dashboard.php` — Dashboard analytics
- `GET  /api/applications.php?action=list` — List applications
- `GET  /api/applications.php?action=detail&id=1` — Application details
- `POST /api/applications.php?action=approve&id=1` — Approve
- `POST /api/applications.php?action=reject&id=1` — Reject
- `POST /api/applications.php?action=request_resubmission&id=1` — Request resubmission
- `GET  /api/beneficiaries.php?action=list` — Beneficiary list
- `POST /api/beneficiaries.php?action=mark_claimed&id=1` — Mark claimed
- `GET  /api/reports.php` — Generate reports
- `POST /api/qr_codes.php?action=generate` — Generate QR code

---

## Security

- Session-based admin auth (cookie-free, per-tab token via X-Session-Token header)
- Password hashing with PHP `password_hash()`
- Role-based access control on all admin endpoints
- PDO prepared statements (SQL injection protection)
- Input sanitization with `htmlspecialchars()`
- File upload validation: MIME type, extension, size limit (5MB)
- PHP execution blocked in uploads directory via .htaccess
- No private files exposed without auth
