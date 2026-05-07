<?php
// ============================================================
// MRD – Monthly Rice Distribution Program
// Database Configuration & Helpers
// ============================================================

// Suppress PHP error output so nothing can corrupt the JSON body.
ini_set('display_errors',         '0');
ini_set('display_startup_errors', '0');
error_reporting(E_ALL); // still logged server-side, never echoed

// ============================================================
// Database credentials
// Priority: Render / Aiven environment variables → XAMPP fallback
// Aiven uses DB_PASSWORD (not DB_PASS) and a non-standard DB_PORT.
// ============================================================
define('DB_HOST',    getenv('DB_HOST')     ?: 'localhost');
define('DB_PORT',    getenv('DB_PORT')     ?: '3306');
define('DB_NAME',    getenv('DB_NAME')     ?: 'mrd_db');
define('DB_USER',    getenv('DB_USER')     ?: 'root');
// Support both naming conventions: Aiven uses DB_PASSWORD, older config uses DB_PASS.
define('DB_PASS',    getenv('DB_PASSWORD') ?: (getenv('DB_PASS') ?: ''));
define('DB_CHARSET', 'utf8mb4');

// ============================================================
// Application paths (used for uploads and QR link building)
// ============================================================
define('APP_URL',       getenv('APP_URL')  ?: 'http://localhost/MRD');
define('UPLOAD_DIR',    __DIR__ . '/../uploads/');
define('UPLOAD_URL',    APP_URL . '/uploads/');
define('MAX_FILE_SIZE', 5 * 1024 * 1024);
define('ALLOWED_TYPES', ['image/jpeg','image/jpg','image/png','image/webp','application/pdf']);
define('ALLOWED_EXTS',  ['jpg','jpeg','png','webp','pdf']);

// ============================================================
// Database connection (singleton PDO)
// ============================================================
function getDB(): PDO {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    $dsn  = 'mysql:host=' . DB_HOST
          . ';port='       . DB_PORT
          . ';dbname='     . DB_NAME
          . ';charset='    . DB_CHARSET;

    $opts = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
        // Aiven requires SSL; skip server-cert verification inside the container.
        PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT => false,
    ];

    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $opts);
    } catch (PDOException $e) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => false, 'error' => 'Database connection failed.']);
        exit;
    }

    return $pdo;
}

// ============================================================
// JSON response helper — every response goes through here.
// ============================================================
function jsonResponse(mixed $data, int $code = 200): never {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// ============================================================
// Session helpers (cookie-free; token passed via X-Session-Token)
// ============================================================
function getMrdSessionToken(): string {
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $norm    = [];
    foreach ($headers as $k => $v) {
        $norm[strtolower(trim($k))] = trim($v);
    }
    $token = $norm['x-session-token'] ?? '';
    if ($token === '') {
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
    if ($token !== '' && preg_match('/^[a-zA-Z0-9,\-]{22,128}$/', $token)) {
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
// Input sanitizer
// ============================================================
function sanitize(string $val): string {
    return htmlspecialchars(trim($val), ENT_QUOTES, 'UTF-8');
}

// ============================================================
// Reference number generator — MRD-2026-000001
// ============================================================
function generateReferenceNumber(PDO $db): string {
    $year = date('Y');
    $stmt = $db->prepare('SELECT COUNT(*) FROM applications WHERE YEAR(submitted_at) = ?');
    $stmt->execute([$year]);
    $count = (int)$stmt->fetchColumn() + 1;
    return 'MRD-' . $year . '-' . str_pad($count, 6, '0', STR_PAD_LEFT);
}

// ============================================================
// Activity logger
// ============================================================
function logActivity(
    PDO     $db,
    ?int    $userId,
    ?string $userName,
    string  $action,
    ?string $refNumber = null,
    ?int    $appId     = null,
    ?string $oldStatus = null,
    ?string $newStatus = null,
    ?string $remarks   = null
): void {
    $ip   = $_SERVER['REMOTE_ADDR'] ?? null;
    $stmt = $db->prepare('
        INSERT INTO activity_logs
            (user_id, user_name, action, reference_number, application_id,
             old_status, new_status, remarks, ip_address)
        VALUES (?,?,?,?,?,?,?,?,?)
    ');
    $stmt->execute([
        $userId, $userName, $action, $refNumber, $appId,
        $oldStatus, $newStatus, $remarks, $ip,
    ]);
}

// ============================================================
// Notification creator
// ============================================================
function createNotification(
    PDO     $db,
    ?int    $userId,
    string  $type,
    string  $title,
    string  $message,
    ?string $refNumber = null
): void {
    $stmt = $db->prepare('
        INSERT INTO notifications (user_id, type, title, message, reference_number)
        VALUES (?,?,?,?,?)
    ');
    $stmt->execute([$userId, $type, $title, $message, $refNumber]);
}
