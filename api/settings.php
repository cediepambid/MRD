<?php
require_once 'cors.php';
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

// GET all settings
if ($method === 'GET') {
    $auth = authGuard();
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

jsonResponse(['error' => 'Method not allowed.'], 405);
