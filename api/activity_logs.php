<?php
require_once 'cors.php';
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') jsonResponse(['error' => 'Method not allowed.'], 405);

$auth = roleGuard(['admin']);
$db   = getDB();

$page  = max(1, (int)($_GET['page'] ?? 1));
$limit = 30;
$off   = ($page - 1) * $limit;

$where  = ['1=1'];
$params = [];

if (!empty($_GET['search'])) {
    $s        = '%' . $_GET['search'] . '%';
    $where[]  = '(user_name LIKE ? OR action LIKE ? OR reference_number LIKE ?)';
    $params   = array_merge($params, [$s,$s,$s]);
}
if (!empty($_GET['action_filter'])) {
    $where[]  = 'action = ?';
    $params[] = $_GET['action_filter'];
}
if (!empty($_GET['date_from'])) {
    $where[]  = 'DATE(created_at) >= ?';
    $params[] = $_GET['date_from'];
}
if (!empty($_GET['date_to'])) {
    $where[]  = 'DATE(created_at) <= ?';
    $params[] = $_GET['date_to'];
}

$whereStr = implode(' AND ', $where);

$total = $db->prepare("SELECT COUNT(*) FROM activity_logs WHERE $whereStr");
$total->execute($params);
$totalCount = (int)$total->fetchColumn();

$stmt = $db->prepare("
    SELECT * FROM activity_logs
    WHERE $whereStr
    ORDER BY created_at DESC
    LIMIT $limit OFFSET $off
");
$stmt->execute($params);
$logs = $stmt->fetchAll();

jsonResponse([
    'data'        => $logs,
    'total'       => $totalCount,
    'page'        => $page,
    'total_pages' => ceil($totalCount / $limit),
]);
