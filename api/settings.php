<?php
require_once 'cors.php';
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

// GET all settings (Public for logo/name)
if ($method === 'GET') {
    $db   = getDB();
    $rows = $db->query("SELECT `key`, value FROM settings")->fetchAll();
    $out  = [];
    foreach ($rows as $r) {
        $out[$r['key']] = $r['value'];
    }
    jsonResponse($out);
}

// PUT update settings
if ($method === 'PUT') {
    $auth = roleGuard(['admin']);
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $db   = getDB();

    foreach ($body as $key => $value) {
        $key = sanitize($key);
        if (!$key) continue;
        $db->prepare("INSERT INTO settings (`key`, value) VALUES (?,?) ON DUPLICATE KEY UPDATE value = ?")
           ->execute([$key, $value, $value]);
    }

    jsonResponse(['success' => true, 'message' => 'Settings updated.']);
}

// POST upload logo
if ($method === 'POST' && ($_GET['action'] ?? '') === 'upload_logo') {
    $auth = roleGuard(['admin']);
    $db   = getDB();

    if (!isset($_FILES['logo']) || $_FILES['logo']['error'] !== UPLOAD_ERR_OK) {
        jsonResponse(['error' => 'No file uploaded or upload error.'], 400);
    }

    $file = $_FILES['logo'];
    $ext  = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, ['png', 'jpg', 'jpeg', 'svg', 'webp'])) {
        jsonResponse(['error' => 'Invalid file type. Only PNG, JPG, SVG, and WEBP are allowed.'], 400);
    }

    // Ensure directory exists
    $uploadDir = UPLOAD_DIR . 'system/';
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

    $fileName = 'logo_' . time() . '.' . $ext;
    $filePath = $uploadDir . $fileName;

    if (move_uploaded_file($file['tmp_name'], $filePath)) {
        $db->prepare("INSERT INTO settings (`key`, value) VALUES ('system_logo', ?) ON DUPLICATE KEY UPDATE value = ?")
           ->execute(['system/' . $fileName, 'system/' . $fileName]);
        
        jsonResponse(['success' => true, 'logo_url' => 'system/' . $fileName]);
    } else {
        jsonResponse(['error' => 'Failed to save logo.'], 500);
    }
}

jsonResponse(['error' => 'Method not allowed.'], 405);
