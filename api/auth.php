<?php
// ============================================================
// MRD – Auth API
// Handles: debug, login, logout, me, profile
// ============================================================
require_once __DIR__ . '/config.php';

// ============================================================
// CORS — uses FRONTEND_URL env var set on Render.
// Falls back to localhost for local XAMPP development.
// Requests with no Origin header (Postman, PowerShell, curl)
// are never blocked — they receive Access-Control-Allow-Origin: *
// ============================================================
$frontendUrl = getenv('FRONTEND_URL') ?: 'http://localhost:5174';
$origin      = $_SERVER['HTTP_ORIGIN'] ?? '';

$localOrigins = [
    'http://localhost:5174',
    'http://localhost',
    'http://127.0.0.1:5174',
    'http://127.0.0.1',
];

$originAllowed = in_array($origin, $localOrigins, true) || $origin === $frontendUrl;

if ($originAllowed && $origin !== '') {
    header('Access-Control-Allow-Origin: ' . $origin);
} else {
    header('Access-Control-Allow-Origin: *');
}

header('Access-Control-Allow-Credentials: false');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Session-Token, Authorization');
header('Content-Type: application/json; charset=utf-8');

// Handle CORS preflight — return 200 immediately, no PHP logic needed
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ============================================================
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// ============================================================
// GET /auth.php?action=debug
// Deployment probe — verifies this exact file version is live.
// ============================================================
if ($action === 'debug') {
    jsonResponse([
        'success'  => true,
        'marker'   => 'AUTH_DEBUG_FIXED',
        'file'     => __FILE__,
        'php'      => PHP_VERSION,
        'db_host'  => DB_HOST,
        'db_port'  => DB_PORT,
        'db_name'  => DB_NAME,
        'frontend' => $frontendUrl,
    ]);
}

// ============================================================
// POST /auth.php?action=login
// PUBLIC — no authGuard, roleGuard, or session token required.
// ============================================================
if ($method === 'POST' && $action === 'login') {
    try {
        $raw  = (string) file_get_contents('php://input');
        $body = json_decode($raw, true);
        if (!is_array($body)) $body = [];

        $email    = trim((string)($body['email']    ?? ''));
        $password = trim((string)($body['password'] ?? ''));

        if ($email === '' || $password === '') {
            jsonResponse([
                'success'      => false,
                'message'      => 'Email and password are required.',
                'debug_reason' => 'missing_credentials',
            ], 400);
        }

        $db   = getDB();
        $stmt = $db->prepare(
            'SELECT id, name, email, role, password, is_active, avatar
             FROM users
             WHERE email = ?
             LIMIT 1'
        );
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        // --- User not found ---
        if (!$user) {
            jsonResponse([
                'success'      => false,
                'message'      => 'Invalid email or password.',
                'debug_reason' => 'user_not_found',
            ], 401);
        }

        // --- Account inactive ---
        // Returns 401 (not 403) so the response is always JSON and never
        // confused with Apache's own 403 Forbidden page.
        if (!(int)$user['is_active']) {
            jsonResponse([
                'success'      => false,
                'message'      => 'Account is inactive. Please contact the administrator.',
                'debug_reason' => 'account_inactive',
            ], 401);
        }

        // --- Password not stored as bcrypt hash ---
        // Catches the case where the DB still has a plain-text password.
        if (!str_starts_with((string)$user['password'], '$2')) {
            jsonResponse([
                'success'      => false,
                'message'      => 'Invalid email or password.',
                'debug_reason' => 'password_not_bcrypt_hash',
            ], 401);
        }

        // --- Wrong password ---
        if (!password_verify($password, (string)$user['password'])) {
            jsonResponse([
                'success'      => false,
                'message'      => 'Invalid email or password.',
                'debug_reason' => 'invalid_password',
            ], 401);
        }

        // --- Role check ---
        // Only 'admin' accounts may log in through this portal.
        // If this triggers, the DB row still has an old role (superadmin, mrd_admin, etc.)
        // Run: UPDATE users SET role='admin' WHERE email='admin@mrd.gov.ph';
        if ((string)$user['role'] !== 'admin') {
            jsonResponse([
                'success'      => false,
                'message'      => 'Invalid email or password.',
                'debug_reason' => 'role_not_admin',
                'actual_role'  => (string)$user['role'],
            ], 401);
        }

        // --- All checks passed — create session ---
        ini_set('session.use_cookies',      '0');
        ini_set('session.use_only_cookies', '0');
        session_name('mrd_admin');
        session_start();

        $_SESSION['user_id']   = $user['id'];
        $_SESSION['user_name'] = $user['name'];
        $_SESSION['user_role'] = $user['role'];

        $token = session_id();
        session_write_close();

        // Best-effort last-login update — never blocks the success response.
        try {
            $db->prepare('UPDATE users SET last_login = NOW() WHERE id = ?')
               ->execute([(int)$user['id']]);
        } catch (Throwable $_) {}

        jsonResponse([
            'success'       => true,
            'message'       => 'Login successful.',
            'session_token' => $token,
            'user'          => [
                'id'     => (int)$user['id'],
                'name'   => (string)$user['name'],
                'email'  => (string)$user['email'],
                'role'   => (string)$user['role'],
                'avatar' => $user['avatar'] ?? null,
            ],
        ]);

    } catch (Throwable $e) {
        // Catch-all — never expose internal exception details in production.
        jsonResponse([
            'success'      => false,
            'message'      => 'Login failed. Please try again later.',
            'debug_reason' => 'exception_thrown',
        ], 500);
    }
}

// ============================================================
// POST /auth.php?action=logout
// ============================================================
if ($method === 'POST' && $action === 'logout') {
    try {
        startMrdSession();
        session_unset();
        session_destroy();
    } catch (Throwable $_) {}
    jsonResponse(['success' => true, 'message' => 'Logged out.']);
}

// ============================================================
// GET /auth.php?action=me
// ============================================================
if ($method === 'GET' && $action === 'me') {
    startMrdSession();
    if (empty($_SESSION['user_id'])) {
        session_write_close();
        jsonResponse(['authenticated' => false], 401);
    }
    $uid = (int)$_SESSION['user_id'];
    session_write_close();

    try {
        $db   = getDB();
        $stmt = $db->prepare(
            'SELECT id, name, email, role, avatar
             FROM users
             WHERE id = ? AND is_active = 1
             LIMIT 1'
        );
        $stmt->execute([$uid]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
    } catch (Throwable $_) {
        jsonResponse(['authenticated' => false], 500);
    }

    if (!$user) {
        jsonResponse(['authenticated' => false], 401);
    }

    jsonResponse(['authenticated' => true, 'user' => $user]);
}

// ============================================================
// PUT /auth.php?action=profile
// ============================================================
if ($method === 'PUT' && $action === 'profile') {
    $auth = authGuard();
    $body = json_decode((string)file_get_contents('php://input'), true) ?? [];

    $name  = sanitize((string)($body['name']  ?? ''));
    $email = sanitize((string)($body['email'] ?? ''));

    if ($name === '' || $email === '') {
        jsonResponse(['error' => 'Name and email are required.'], 400);
    }

    $db = getDB();
    $db->prepare('UPDATE users SET name = ?, email = ? WHERE id = ?')
       ->execute([$name, $email, (int)$auth['id']]);

    if (!empty($body['password'])) {
        if (strlen((string)$body['password']) < 8) {
            jsonResponse(['error' => 'Password must be at least 8 characters.'], 400);
        }
        $db->prepare('UPDATE users SET password = ? WHERE id = ?')
           ->execute([password_hash((string)$body['password'], PASSWORD_DEFAULT), (int)$auth['id']]);
    }

    jsonResponse(['success' => true, 'message' => 'Profile updated successfully.']);
}

// ============================================================
// Catch-all — no matching action/method
// ============================================================
jsonResponse(['error' => 'Invalid request.'], 400);
