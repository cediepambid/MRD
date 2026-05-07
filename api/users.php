<?php
require_once 'cors.php';
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// GET list
if ($method === 'GET' && $action === 'list') {
    $auth = roleGuard(['admin']);
    $db   = getDB();

    $users = $db->query("SELECT id, name, email, role, is_active, last_login, created_at FROM users ORDER BY created_at DESC")->fetchAll();
    jsonResponse(['data' => $users]);
}

// POST create user
if ($method === 'POST' && $action === 'create') {
    $auth = roleGuard(['admin']);
    $body = json_decode(file_get_contents('php://input'), true) ?? [];

    $name     = sanitize($body['name']  ?? '');
    $email    = sanitize($body['email'] ?? '');
    $password = $body['password'] ?? '';
    $role     = $body['role']     ?? 'admin';

    $validRoles = ['admin'];
    if (!$name || !$email || !$password) {
        jsonResponse(['error' => 'Name, email, and password are required.'], 400);
    }
    if (strlen($password) < 8) {
        jsonResponse(['error' => 'Password must be at least 8 characters.'], 400);
    }
    if (!in_array($role, $validRoles)) {
        jsonResponse(['error' => 'Invalid role.'], 400);
    }

    $db = getDB();
    // Check duplicate email
    $exists = $db->prepare("SELECT id FROM users WHERE email = ?");
    $exists->execute([$email]);
    if ($exists->fetch()) {
        jsonResponse(['error' => 'Email already exists.'], 409);
    }

    $hashed = password_hash($password, PASSWORD_DEFAULT);
    $db->prepare("INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)")
       ->execute([$name, $email, $hashed, $role]);

    jsonResponse(['success' => true, 'message' => 'User created successfully.']);
}

// PUT update user
if ($method === 'PUT' && $action === 'update') {
    $auth = roleGuard(['admin']);
    $id   = (int)($_GET['id'] ?? 0);
    $body = json_decode(file_get_contents('php://input'), true) ?? [];

    if (!$id) jsonResponse(['error' => 'User ID required.'], 400);

    $name  = sanitize($body['name']      ?? '');
    $email = sanitize($body['email']     ?? '');
    $role  = $body['role']               ?? '';
    $active= isset($body['is_active']) ? (int)$body['is_active'] : 1;

    $db = getDB();
    $db->prepare("UPDATE users SET name = ?, email = ?, role = ?, is_active = ? WHERE id = ?")
       ->execute([$name, $email, $role, $active, $id]);

    if (!empty($body['password'])) {
        if (strlen($body['password']) < 8) {
            jsonResponse(['error' => 'Password must be at least 8 characters.'], 400);
        }
        $hashed = password_hash($body['password'], PASSWORD_DEFAULT);
        $db->prepare("UPDATE users SET password = ? WHERE id = ?")->execute([$hashed, $id]);
    }

    jsonResponse(['success' => true, 'message' => 'User updated.']);
}

// DELETE user
if ($method === 'DELETE') {
    $auth = roleGuard(['admin']);
    $id   = (int)($_GET['id'] ?? 0);
    if (!$id) jsonResponse(['error' => 'User ID required.'], 400);
    if ($id === $auth['id']) jsonResponse(['error' => 'Cannot delete your own account.'], 400);

    $db = getDB();
    $db->prepare("DELETE FROM users WHERE id = ?")->execute([$id]);

    jsonResponse(['success' => true, 'message' => 'User deleted.']);
}

jsonResponse(['error' => 'Invalid request.'], 400);
