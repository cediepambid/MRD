<?php
// ============================================================
// MRD – CORS headers
// Shared by all API endpoints except auth.php (which embeds its own).
// Allows: configured FRONTEND_URL, localhost dev origins, and LAN.
// ============================================================

$origin      = $_SERVER['HTTP_ORIGIN'] ?? '';
$frontendUrl = getenv('FRONTEND_URL') ?: 'https://mrd-7ls1.onrender.com';

$isAllowed =
    // Exact match against the configured production frontend
    $origin === $frontendUrl
    ||
    // Local development origins
    in_array($origin, [
        'http://localhost:5174',
        'http://127.0.0.1:5174',
        'http://localhost',
        'http://127.0.0.1',
    ], true)
    ||
    // LAN origins: 192.168.x.x / 10.x.x.x / 172.16–31.x.x (any port)
    (bool)preg_match(
        '#^https?://(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$#',
        $origin
    );

if ($isAllowed && $origin !== '') {
    header('Access-Control-Allow-Origin: ' . $origin);
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
