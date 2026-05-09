<?php
// ============================================================
// MRD – CORS headers
// Shared by all API endpoints except auth.php (which embeds its own).
// Allows: configured FRONTEND_URL, localhost dev origins, and LAN.
// ============================================================

$origin      = $_SERVER['HTTP_ORIGIN'] ?? '';
$frontendUrl = getenv('FRONTEND_URL') ?: 'https://mrd-7ls1.onrender.com';

// If Apache / a reverse proxy injects CORS headers, remove them first so we never
// end up with multiple Access-Control-Allow-Origin values (browser will block).
header_remove('Access-Control-Allow-Origin');
header_remove('Access-Control-Allow-Credentials');
header_remove('Access-Control-Allow-Methods');
header_remove('Access-Control-Allow-Headers');

$isAllowed = (
    $origin === $frontendUrl
    ||
    in_array($origin, [
        'http://localhost:5174',
        'http://127.0.0.1:5174',
        'http://localhost',
        'http://127.0.0.1',
    ], true)
    || preg_match('/^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/', $origin)
    || preg_match('/^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/', $origin)
    || preg_match('/^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+(:\d+)?$/', $origin)
);

// Browser requests include Origin. PowerShell/curl/Postman often do not.
// - If Origin is present, allow ONLY known/expected origins.
// - If Origin is missing, allow all (so non-browser clients are never blocked).
if ($origin === '') {
    header('Access-Control-Allow-Origin: *');
} elseif ($isAllowed) {
    header('Access-Control-Allow-Origin: ' . $origin);
}

header('Access-Control-Allow-Credentials: false');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Session-Token, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
