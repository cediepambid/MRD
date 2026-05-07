<?php
// ============================================================
// CORS – allows localhost AND any LAN (192.168.x.x / 10.x.x.x)
// Safe: auth uses X-Session-Token header, not cookies
// ============================================================

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

$isAllowed =
    // Local development
    in_array($origin, [
        'http://localhost:5174',
        'http://127.0.0.1:5174',
        'http://localhost',
        'http://127.0.0.1',
    ], true)
    ||
    // LAN origins: 192.168.x.x, 10.x.x.x, 172.16-31.x.x  (any port)
    preg_match(
        '#^https?://(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$#',
        $origin
    );

if ($isAllowed && $origin) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header('Access-Control-Allow-Origin: *');
}

header('Access-Control-Allow-Credentials: false');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Session-Token, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
