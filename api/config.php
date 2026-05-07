<?php
// ============================================================
// MRD – Monthly Rice Distribution Program
// Database Configuration & Helpers
// ============================================================

// Never print PHP errors into the response body — they corrupt JSON.
ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');
error_reporting(E_ALL);         // still log everything, just don't echo it

// Read DB credentials from Render environment variables first,
// fall back to local XAMPP defaults so dev still works without any .env.
define('DB_HOST',    getenv('DB_HOST') ?: 'localhost');
define('DB_NAME',    getenv('DB_NAME') ?: 'mrd_db');
define('DB_USER',    getenv('DB_USER') ?: 'root');
define('DB_PASS',    getenv('DB_PASS') ?: '');
define('DB_CHARSET', 'utf8mb4');

define('APP_URL',        'http://localhost/MRD');
define('UPLOAD_DIR',     __DIR__ . '/../uploads/');
define('UPLOAD_URL',     APP_URL . '/uploads/');
define('MAX_FILE_SIZE',  5 * 1024 * 1024); // 5 MB
define('ALLOWED_TYPES',  ['image/jpeg','image/jpg','image/png','image/webp','application/pdf']);
define('ALLOWED_EXTS',   ['jpg','jpeg','png','webp','pdf']);

// ============================================================
// Database connection (singleton)
// ============================================================
function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $opts = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $opts);
        } catch (PDOException $e) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['success' => false, 'error' => 'Database connection failed.']);
            exit;
        }
    }
    return $pdo;
}

// ============================================================
// JSON response helper
// ============================================================
function jsonResponse(mixed $data, int $code = 200): never {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// ============================================================
// Session helpers (cookie-free, per-tab token via header)
// ============================================================
function getMrdSessionToken(): string {
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $norm    = [];
    foreach ($headers as $k => $v) {
        $norm[strtolower($k)] = $v;
    }
    $token = $norm['x-session-token'] ?? '';
    if (!$token) {
        $auth = $norm['authorization'] ?? '';
        if (preg_match('/^Bearer\s+(\S+)$/i', $auth, $m)) {
            $token = $m[1];
        }
    }
    return $token;
}

function startMrdSession(): void {
    if (session_status() !== PHP_SESSION_NONE) return;
    ini_set('session.use_cookies',      '0');
    ini_set('session.use_only_cookies', '0');
    session_name('mrd_admin');
    $token = getMrdSessionToken();
    if ($token && preg_match('/^[a-zA-Z0-9,\-]{22,128}$/', $token)) {
        session_id($token);
    }
    session_start();
}

function authGuard(): array {
    startMrdSession();
    if (empty($_SESSION['user_id'])) {
        session_write_close();
        jsonResponse(['error' => 'Unauthorized'], 401);
    }
    $auth = [
        'id'   => $_SESSION['user_id'],
        'name' => $_SESSION['user_name'],
        'role' => $_SESSION['user_role'],
    ];
    session_write_close();
    return $auth;
}

function roleGuard(array $allowedRoles): array {
    $auth = authGuard();
    if (!in_array($auth['role'], $allowedRoles, true)) {
        jsonResponse(['error' => 'Forbidden: insufficient permissions.'], 403);
    }
    return $auth;
}

// ============================================================
// Input sanitize
// ============================================================
function sanitize(string $val): string {
    return htmlspecialchars(trim($val), ENT_QUOTES, 'UTF-8');
}

// ============================================================
// Reference number generator  MRD-2026-000001
// ============================================================
function generateReferenceNumber(PDO $db): string {
    $year = date('Y');
    $stmt = $db->prepare(
        "SELECT COUNT(*) FROM applications WHERE YEAR(submitted_at) = ?"
    );
    $stmt->execute([$year]);
    $count = (int)$stmt->fetchColumn() + 1;
    return 'MRD-' . $year . '-' . str_pad($count, 6, '0', STR_PAD_LEFT);
}

// ============================================================
// Activity logger
// ============================================================
function logActivity(
    PDO $db,
    ?int $userId,
    ?string $userName,
    string $action,
    ?string $refNumber = null,
    ?int $appId        = null,
    ?string $oldStatus = null,
    ?string $newStatus = null,
    ?string $remarks   = null
): void {
    $ip = $_SERVER['REMOTE_ADDR'] ?? null;
    $stmt = $db->prepare("
        INSERT INTO activity_logs
            (user_id, user_name, action, reference_number, application_id,
             old_status, new_status, remarks, ip_address)
        VALUES (?,?,?,?,?,?,?,?,?)
    ");
    $stmt->execute([
        $userId, $userName, $action, $refNumber, $appId,
        $oldStatus, $newStatus, $remarks, $ip
    ]);
}

// ============================================================
// Notification creator
// ============================================================
function createNotification(
    PDO $db,
    ?int $userId,
    string $type,
    string $title,
    string $message,
    ?string $refNumber = null
): void {
    $stmt = $db->prepare("
        INSERT INTO notifications (user_id, type, title, message, reference_number)
        VALUES (?,?,?,?,?)
    ");
    $stmt->execute([$userId, $type, $title, $message, $refNumber]);
}
