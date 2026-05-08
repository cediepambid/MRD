<?php
require_once __DIR__ . '/config.php';

header('Content-Type: application/json');

try {
    $pdo = getDB();

    $email = 'admin@mrd.gov.ph';
    $plainPassword = 'password';
    $hashedPassword = password_hash($plainPassword, PASSWORD_DEFAULT);

    $stmt = $pdo->prepare("
        UPDATE users
        SET password = ?, role = 'admin', is_active = 1
        WHERE email = ?
    ");
    $stmt->execute([$hashedPassword, $email]);

    $check = $pdo->prepare("
        SELECT id, name, email, role, is_active, password
        FROM users
        WHERE email = ?
        LIMIT 1
    ");
    $check->execute([$email]);
    $user = $check->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'message' => 'Admin password reset completed.',
        'affected_rows' => $stmt->rowCount(),
        'user' => [
            'id' => $user['id'] ?? null,
            'name' => $user['name'] ?? null,
            'email' => $user['email'] ?? null,
            'role' => $user['role'] ?? null,
            'is_active' => $user['is_active'] ?? null,
        ],
        'verify_test' => password_verify($plainPassword, $user['password'] ?? ''),
        'login_email' => $email,
        'login_password' => $plainPassword
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to reset admin password.',
        'error' => $e->getMessage()
    ]);
}