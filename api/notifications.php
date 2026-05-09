<?php
require_once 'cors.php';
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// GET list
if ($method === 'GET' && $action === 'list') {
    $auth = authGuard();
    $db   = getDB();

    $page  = max(1, (int)($_GET['page'] ?? 1));
    $limit = 20;
    $off   = ($page - 1) * $limit;

    $total = $db->prepare("SELECT COUNT(*) FROM notifications WHERE user_id = ? OR user_id IS NULL");
    $total->execute([$auth['id']]);
    $totalCount = (int)$total->fetchColumn();

    $stmt = $db->prepare("
        SELECT * FROM notifications
        WHERE user_id = ? OR user_id IS NULL
        ORDER BY created_at DESC
        LIMIT $limit OFFSET $off
    ");
    $stmt->execute([$auth['id']]);
    $notifications = $stmt->fetchAll();

    jsonResponse([
        'data'  => $notifications,
        'total' => $totalCount,
        'unread'=> array_reduce($notifications, fn($c, $n) => $c + (!$n['is_read'] ? 1 : 0), 0),
    ]);
}

// POST mark_read
if ($method === 'POST' && $action === 'mark_read') {
    $auth = authGuard();
    $db   = getDB();
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $id   = (int)($body['id'] ?? 0);

    if ($id) {
        $db->prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND (user_id = ? OR user_id IS NULL)")
           ->execute([$id, $auth['id']]);
    } else {
        // mark all read
        $db->prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ? OR user_id IS NULL")
           ->execute([$auth['id']]);
    }

    jsonResponse(['success' => true]);
}

// DELETE notification
if ($method === 'DELETE' && $action === 'delete') {
    $auth = authGuard();
    $db   = getDB();
    $id   = (int)($_GET['id'] ?? 0);

    if (!$id) {
        jsonResponse(['error' => 'Notification ID is required.'], 400);
    }

    $db->prepare("DELETE FROM notifications WHERE id = ? AND (user_id = ? OR user_id IS NULL)")
       ->execute([$id, $auth['id']]);

    jsonResponse(['success' => true, 'message' => 'Notification deleted.']);
}

jsonResponse(['error' => 'Invalid request.'], 400);
