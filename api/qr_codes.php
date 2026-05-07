<?php
require_once 'cors.php';
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// GET current QR code
if ($method === 'GET' && $action === 'current') {
    $auth = authGuard();
    $db   = getDB();

    $qr  = $db->query("SELECT * FROM qr_codes ORDER BY generated_at DESC LIMIT 1")->fetch();

    $settingStmt = $db->prepare("SELECT value FROM settings WHERE `key` = 'reg_url'");
    $settingStmt->execute();
    $regUrl = $settingStmt->fetchColumn() ?: APP_URL . '/public/#/register';

    jsonResponse(['qr' => $qr ?: null, 'reg_url' => $regUrl]);
}

// POST generate new QR
if ($method === 'POST' && $action === 'generate') {
    $auth = roleGuard(['superadmin','mrd_admin']);
    $db   = getDB();

    $settingStmt = $db->prepare("SELECT value FROM settings WHERE `key` = 'reg_url'");
    $settingStmt->execute();
    $regUrl = $settingStmt->fetchColumn() ?: APP_URL . '/public/#/register';

    $token = bin2hex(random_bytes(16));

    $db->query("UPDATE qr_codes SET is_active = 0");
    $db->prepare("INSERT INTO qr_codes (token, registration_url, is_active, generated_by) VALUES (?,?,1,?)")
       ->execute([$token, $regUrl, $auth['id']]);
    $id = $db->lastInsertId();

    logActivity($db, $auth['id'], $auth['name'], 'generate_qr_code', null, null, null, null, 'New QR code generated');

    jsonResponse(['success' => true, 'token' => $token, 'registration_url' => $regUrl, 'id' => $id]);
}

// POST toggle active
if ($method === 'POST' && $action === 'toggle') {
    $auth = roleGuard(['superadmin','mrd_admin']);
    $id   = (int)($_GET['id'] ?? 0);
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    if (!$id) jsonResponse(['error' => 'QR Code ID required.'], 400);
    $active = $body['is_active'] ? 1 : 0;
    getDB()->prepare("UPDATE qr_codes SET is_active = ? WHERE id = ?")->execute([$active, $id]);
    jsonResponse(['success' => true]);
}

jsonResponse(['error' => 'Invalid request.'], 400);
