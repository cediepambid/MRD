<?php
require_once 'cors.php';
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// ============================================================
// GET /api/auth.php?action=debug
// Deployment probe — confirms the current file version is live.
// Remove this route once login is confirmed working.
// ============================================================
if ($action === 'debug') {
    jsonResponse([
        'success' => true,
        'marker'  => 'AUTH_DEBUG_2026_05_07',
        'file'    => __FILE__,
        'php'     => PHP_VERSION,
        'db_host' => getenv('DB_HOST') ?: 'localhost (fallback)',
    ]);
}

// ============================================================
// POST /api/auth.php?action=login
// ============================================================
if ($method === 'POST' && $action === 'login') {
    // Inline helper so this block can never return plain text.
    $loginJson = function(array $payload, int $code = 200): never {
        http_response_code($code);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    };

    try {
        $raw  = (string) file_get_contents('php://input');
        $body = json_decode($raw, true);
        if (!is_array($body)) $body = [];

        $email    = trim($body['email']    ?? '');
        $password = trim($body['password'] ?? '');

        if ($email === '' || $password === '') {
            $loginJson(['success' => false, 'message' => 'Email and password are required.'], 400);
        }

        $db = getDB();

        // Query without is_active filter so we can give a specific inactive message.
        $stmt = $db->prepare('SELECT id, name, email, role, password, is_active, avatar FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            $loginJson(['success' => false, 'message' => 'Invalid email or password.'], 401);
        }

        if (!(int)$user['is_active']) {
            $loginJson(['success' => false, 'message' => 'Account is inactive. Please contact the administrator.'], 403);
        }

        if (!password_verify($password, $user['password'])) {
            $loginJson(['success' => false, 'message' => 'Invalid email or password.'], 401);
        }

        // Cookie-free session — token sent via X-Session-Token header.
        ini_set('session.use_cookies',      '0');
        ini_set('session.use_only_cookies', '0');
        session_name('mrd_admin');
        session_start();

        $_SESSION['user_id']   = $user['id'];
        $_SESSION['user_name'] = $user['name'];
        $_SESSION['user_role'] = $user['role'];

        $token = session_id();
        session_write_close();

        // Best-effort last-login update — don't let it break the response.
        try {
            $db->prepare('UPDATE users SET last_login = NOW() WHERE id = ?')
               ->execute([(int)$user['id']]);
        } catch (Throwable $_) {}

        $loginJson([
            'success'       => true,
            'message'       => 'Login successful.',
            'session_token' => $token,
            'user' => [
                'id'    => (int)$user['id'],
                'name'  => (string)$user['name'],
                'email' => (string)$user['email'],
                'role'  => (string)$user['role'],
                'avatar'=> $user['avatar'] ?? null,
            ],
        ]);

    } catch (Throwable $e) {
        $loginJson(['success' => false, 'message' => 'Login failed. Please try again later.'], 500);
    }
}

// ============================================================
// POST /api/auth.php?action=logout
// ============================================================
if ($method === 'POST' && $action === 'logout') {
    startMrdSession();
    session_unset();
    session_destroy();
    jsonResponse(['success' => true]);
}

// ============================================================
// GET /api/auth.php?action=me
// ============================================================
if ($method === 'GET' && $action === 'me') {
    startMrdSession();
    if (empty($_SESSION['user_id'])) {
        session_write_close();
        jsonResponse(['authenticated' => false], 401);
    }
    $uid = $_SESSION['user_id'];
    session_write_close();

    $db   = getDB();
    $stmt = $db->prepare('SELECT id, name, email, role, avatar FROM users WHERE id = ? AND is_active = 1');
    $stmt->execute([$uid]);
    $user = $stmt->fetch();

    if (!$user) {
        jsonResponse(['authenticated' => false], 401);
    }

    jsonResponse(['authenticated' => true, 'user' => $user]);
}

// ============================================================
// PUT /api/auth.php?action=profile
// ============================================================
if ($method === 'PUT' && $action === 'profile') {
    $auth = authGuard();
    $body = json_decode(file_get_contents('php://input'), true) ?? [];

    $name  = sanitize($body['name']  ?? '');
    $email = sanitize($body['email'] ?? '');

    if (!$name || !$email) {
        jsonResponse(['error' => 'Name and email are required.'], 400);
    }

    $db = getDB();
    $db->prepare('UPDATE users SET name = ?, email = ? WHERE id = ?')
       ->execute([$name, $email, $auth['id']]);

    if (!empty($body['password'])) {
        if (strlen($body['password']) < 8) {
            jsonResponse(['error' => 'Password must be at least 8 characters.'], 400);
        }
        $hashed = password_hash($body['password'], PASSWORD_DEFAULT);
        $db->prepare('UPDATE users SET password = ? WHERE id = ?')
           ->execute([$hashed, $auth['id']]);
    }

    jsonResponse(['success' => true, 'message' => 'Profile updated successfully.']);
}

jsonResponse(['error' => 'Invalid request.'], 400);
