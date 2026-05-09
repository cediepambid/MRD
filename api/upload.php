<?php
require_once 'cors.php';
require_once 'config.php';

// ============================================================
// POST /api/upload.php
// Upload attachments for an MRD application
// ============================================================
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed.'], 405);
}

$refNum  = sanitize($_POST['reference_number'] ?? '');
$attType = sanitize($_POST['attachment_type']  ?? '');

if (!$refNum) jsonResponse(['error' => 'Reference number is required.'], 400);

$validTypes = ['drivers_license','franchise_receipt','cedula','id_picture','valid_id'];
if (!in_array($attType, $validTypes, true)) {
    jsonResponse(['error' => 'Invalid attachment type.'], 400);
}

// Get application
$db   = getDB();
$stmt = $db->prepare("SELECT id, status FROM applications WHERE reference_number = ? LIMIT 1");
$stmt->execute([$refNum]);
$app  = $stmt->fetch();

if (!$app) jsonResponse(['error' => 'Application not found.'], 404);

// Block uploads for already-approved applications (unless resubmission)
if ($app['status'] === 'Approved') {
    jsonResponse(['error' => 'Approved applications cannot have attachments modified.'], 400);
}

if (!isset($_FILES['file'])) {
    jsonResponse(['error' => 'No file uploaded.'], 400);
}

$file    = $_FILES['file'];
$error   = $file['error'];
$tmpPath = $file['tmp_name'];
$origName= $file['name'];
$size    = $file['size'];

if ($error !== UPLOAD_ERR_OK) {
    $errMsg = [
        UPLOAD_ERR_INI_SIZE   => 'File exceeds server size limit.',
        UPLOAD_ERR_FORM_SIZE  => 'File exceeds form size limit.',
        UPLOAD_ERR_PARTIAL    => 'File was only partially uploaded.',
        UPLOAD_ERR_NO_FILE    => 'No file was uploaded.',
        UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder.',
        UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk.',
    ];
    jsonResponse(['error' => $errMsg[$error] ?? 'Upload error.'], 400);
}

if ($size > MAX_FILE_SIZE) {
    jsonResponse(['error' => 'File size exceeds the 5MB limit.'], 400);
}

// Validate MIME type using finfo (more secure than extension check alone)
$finfo    = new finfo(FILEINFO_MIME_TYPE);
$mimeType = $finfo->file($tmpPath);

if (!in_array($mimeType, ALLOWED_TYPES, true)) {
    jsonResponse(['error' => 'Invalid file type. Only JPG, PNG, WEBP, and PDF files are allowed.'], 400);
}

// Validate extension
$ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
if (!in_array($ext, ALLOWED_EXTS, true)) {
    jsonResponse(['error' => 'Invalid file extension.'], 400);
}

// Generate safe filename
$safeName  = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $refNum);
$timestamp = time();
$newName   = $safeName . '_' . $attType . '_' . $timestamp . '.' . $ext;
$subDir    = $attType . '/';
$fullDir   = UPLOAD_DIR . $subDir;

if (!is_dir($fullDir)) {
    if (!mkdir($fullDir, 0777, true)) {
        $err = error_get_last();
        $debug = " Dir: " . __DIR__ . " | UPLOAD_DIR: " . UPLOAD_DIR . " | fullDir: " . $fullDir;
        jsonResponse(['error' => 'Failed to create directory. ' . ($err['message'] ?? '') . $debug], 500);
    }
}

$destPath = $fullDir . $newName;
if (!move_uploaded_file($tmpPath, $destPath)) {
    $err = error_get_last();
    jsonResponse(['error' => 'Failed to save the file. ' . ($err['message'] ?? '')], 500);
}

// Delete old attachment of same type for this application
$oldStmt = $db->prepare("SELECT file_path FROM application_attachments WHERE application_id = ? AND attachment_type = ?");
$oldStmt->execute([$app['id'], $attType]);
$old = $oldStmt->fetch();
if ($old && file_exists(UPLOAD_DIR . $old['file_path'])) {
    @unlink(UPLOAD_DIR . $old['file_path']);
}
$db->prepare("DELETE FROM application_attachments WHERE application_id = ? AND attachment_type = ?")
   ->execute([$app['id'], $attType]);

// Save to DB
$relPath = $subDir . $newName;
$db->prepare("
    INSERT INTO application_attachments
        (application_id, attachment_type, file_name, file_path, file_size, mime_type, status)
    VALUES (?,?,?,?,?,?,'Pending')
")->execute([$app['id'], $attType, $origName, $relPath, $size, $mimeType]);

$attId = $db->lastInsertId();

jsonResponse([
    'success'    => true,
    'id'         => $attId,
    'file_name'  => $origName,
    'file_path'  => $relPath,
    'url'        => UPLOAD_URL . $relPath,
    'mime_type'  => $mimeType,
    'message'    => 'File uploaded successfully.',
]);
