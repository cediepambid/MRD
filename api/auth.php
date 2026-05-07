<?php
require_once 'cors.php';
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// ============================================================
// POST /api/auth.php?action=login
// ============================================================
if ($method === 'POST' && $action === 'login') {
    $body     = json_decode(file_get_contents('php://input'), true) ?? [];
    $email    = trim($body['email']    ?? '');
    $password = trim($body['password'] ?? '');

    if (!$email || !$password) {
        jsonResponse(['success' => false, 'message' => 'Email and password are required.'], 400);
    }

    $db   = getDB();
    $stmt = $db->prepare('SELECT * FROM users WHERE email = ? AND is_active = 1 LIMIT 1');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password'])) {
        jsonResponse(['success' => false, 'message' => 'Invalid email or password.'], 401);
    }

    ini_set('session.use_cookies',      '0');
    ini_set('session.use_only_cookies', '0');
    session_name('mrd_admin');
    session_start();

    $_SESSION['user_id']   = $user['id'];
    $_SESSION['user_name'] = $user['name'];
    $_SESSION['user_role'] = $user['role'];

    $token = session_id();
    session_write_close();

    // Update last login
    $db->prepare('UPDATE users SET last_login = NOW() WHERE id = ?')->execute([$user['id']]);

    jsonResponse([
        'success'       => true,
        'session_token' => $token,
        'user' => [
            'id'    => $user['id'],
            'name'  => $user['name'],
            'email' => $user['email'],
            'role'  => $user['role'],
            'avatar'=> $user['avatar'],
        ],
    ]);
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
