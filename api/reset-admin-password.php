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

    echo json_encode([
        'success' => true,
        'message' => 'Admin password reset successfully.',
        'email' => $email,
        'password' => $plainPassword,
        'affected_rows' => $stmt->rowCount()
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to reset admin password.'
    ]);
}