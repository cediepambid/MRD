<?php
require_once __DIR__ . '/cors.php';

http_response_code(200);
echo json_encode([
    'success' => true,
    'message' => 'MRD API backend is running',
    'service' => 'MRD Backend',
    'status'  => 'online',
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
