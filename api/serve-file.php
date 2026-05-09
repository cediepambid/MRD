<?php
require_once 'cors.php';
require_once 'config.php';

// ============================================================
// GET /api/serve-file.php?path=drivers_license/MRD_...jpg
// Serve uploaded files from /tmp on Render (not publicly accessible dir)
// ============================================================

$path = $_GET['path'] ?? '';

// Sanitize: no path traversal
$path = ltrim(str_replace(['..', "\0"], '', $path), '/');

if (!$path) {
    http_response_code(400);
    exit('Bad request');
}

$fullPath = rtrim(UPLOAD_DIR, '/') . '/' . $path;

if (!file_exists($fullPath) || !is_file($fullPath)) {
    http_response_code(404);
    exit('File not found');
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime  = $finfo->file($fullPath);

if (!in_array($mime, ALLOWED_TYPES, true)) {
    http_response_code(403);
    exit('Forbidden');
}

// Clear any JSON content-type set by cors.php
header_remove('Content-Type');
header('Content-Type: ' . $mime);
header('Content-Length: ' . filesize($fullPath));
header('Cache-Control: public, max-age=86400');
readfile($fullPath);
