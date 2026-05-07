<?php
require_once __DIR__ . '/cors.php';

http_response_code(200);
echo json_encode([
    'success' => true,
    'message' => 'MRD backend health check OK',
    'status'  => 'healthy',
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);