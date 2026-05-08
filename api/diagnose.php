<?php
require_once __DIR__ . '/config.php';
header('Content-Type: application/json; charset=utf-8');

$result = [];

// 1. DB connection test
try {
    $db = getDB();
    $result['db_connected'] = true;
} catch (Throwable $e) {
    echo json_encode(['db_connected' => false, 'db_error' => $e->getMessage()]);
    exit;
}

// 2. Check admin user in DB
try {
    $stmt = $db->prepare("SELECT id, name, email, role, is_active, password FROM users WHERE email = 'admin@mrd.gov.ph' LIMIT 1");
    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        $result['user_found'] = false;
    } else {
        $result['user_found']   = true;
        $result['user_id']      = $user['id'];
        $result['user_role']    = $user['role'];
        $result['is_active']    = (int)$user['is_active'];
        $result['hash_prefix']  = substr($user['password'], 0, 7);
        $result['is_bcrypt']    = str_starts_with($user['password'], '$2');
        $result['pass_Admin@2026'] = password_verify('Admin@2026', $user['password']);
        $result['pass_password']   = password_verify('password',   $user['password']);
        $result['pass_Admin2026']  = password_verify('Admin2026',  $user['password']);
    }
} catch (Throwable $e) {
    $result['user_query_error'] = $e->getMessage();
}

// 3. Check ENUM values allowed
try {
    $stmt = $db->query("SHOW COLUMNS FROM users LIKE 'role'");
    $col = $stmt->fetch(PDO::FETCH_ASSOC);
    $result['role_enum'] = $col['Type'] ?? 'unknown';
} catch (Throwable $e) {
    $result['enum_error'] = $e->getMessage();
}

echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
