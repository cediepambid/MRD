<?php
require_once 'cors.php';
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// ============================================================
// GET /api/beneficiaries.php?action=list
// All approved beneficiaries with claim status
// ============================================================
if ($method === 'GET' && $action === 'list') {
    $auth = authGuard();
    $db   = getDB();

    $where  = ['1=1'];
    $params = [];

    if (!empty($_GET['claim_status'])) {
        $where[]  = 'b.claim_status = ?';
        $params[] = $_GET['claim_status'];
    }
    if (!empty($_GET['barangay'])) {
        $where[]  = 'a.barangay = ?';
        $params[] = $_GET['barangay'];
    }
    if (!empty($_GET['toda_name'])) {
        $where[]  = 'a.toda_name LIKE ?';
        $params[] = '%' . $_GET['toda_name'] . '%';
    }
    if (!empty($_GET['search'])) {
        $s        = '%' . $_GET['search'] . '%';
        $where[]  = '(a.surname LIKE ? OR a.given_name LIKE ? OR a.reference_number LIKE ? OR a.cellphone LIKE ?)';
        $params   = array_merge($params, [$s,$s,$s,$s]);
    }
    if (!empty($_GET['date_from'])) {
        $where[]  = 'DATE(b.claimed_at) >= ?';
        $params[] = $_GET['date_from'];
    }
    if (!empty($_GET['date_to'])) {
        $where[]  = 'DATE(b.claimed_at) <= ?';
        $params[] = $_GET['date_to'];
    }

    $page  = max(1, (int)($_GET['page'] ?? 1));
    $limit = min(100, max(10, (int)($_GET['limit'] ?? 20)));
    $off   = ($page - 1) * $limit;

    $whereStr = implode(' AND ', $where);

    $total = $db->prepare("
        SELECT COUNT(*) FROM beneficiaries b
        JOIN applications a ON a.id = b.application_id
        WHERE $whereStr
    ");
    $total->execute($params);
    $totalCount = (int)$total->fetchColumn();

    $stmt = $db->prepare("
        SELECT b.id AS beneficiary_id, b.claim_status, b.claimed_at, b.release_remarks,
               a.reference_number, a.surname, a.given_name, a.middle_name,
               a.complete_address, a.barangay, a.town_city, a.province,
               a.cellphone, a.toda_name, a.franchise_number,
               a.approved_at, a.status AS application_status,
               u.name AS released_by_name
        FROM beneficiaries b
        JOIN applications a ON a.id = b.application_id
        LEFT JOIN users u ON u.id = b.released_by
        WHERE $whereStr
        ORDER BY a.surname ASC
        LIMIT $limit OFFSET $off
    ");
    $stmt->execute($params);
    $list = $stmt->fetchAll();

    jsonResponse([
        'data'        => $list,
        'total'       => $totalCount,
        'page'        => $page,
        'limit'       => $limit,
        'total_pages' => ceil($totalCount / $limit),
    ]);
}

// ============================================================
// POST /api/beneficiaries.php?action=mark_claimed&id=1
// Mark a beneficiary as claimed
// ============================================================
if ($method === 'POST' && $action === 'mark_claimed') {
    $auth = roleGuard(['admin']);
    $id   = (int)($_GET['id'] ?? 0);
    $body = json_decode(file_get_contents('php://input'), true) ?? [];

    if (!$id) jsonResponse(['error' => 'Beneficiary ID required.'], 400);

    $db   = getDB();
    $stmt = $db->prepare("SELECT b.*, a.reference_number FROM beneficiaries b JOIN applications a ON a.id = b.application_id WHERE b.id = ? LIMIT 1");
    $stmt->execute([$id]);
    $ben  = $stmt->fetch();

    if (!$ben) jsonResponse(['error' => 'Beneficiary not found.'], 404);

    if ($ben['claim_status'] === 'Claimed') {
        jsonResponse([
            'warning' => true,
            'message' => 'Warning: This beneficiary has already claimed their rice assistance on ' . date('F j, Y', strtotime($ben['claimed_at'])) . '.',
        ], 409);
    }

    $remarks = sanitize($body['remarks'] ?? '');

    $db->prepare("
        UPDATE beneficiaries
        SET claim_status = 'Claimed', claimed_at = NOW(), released_by = ?, release_remarks = ?
        WHERE id = ?
    ")->execute([$auth['id'], $remarks, $id]);

    logActivity($db, $auth['id'], $auth['name'], 'mark_claimed',
        $ben['reference_number'], $ben['application_id'], 'Not Yet Claimed', 'Claimed', $remarks);

    jsonResponse(['success' => true, 'message' => 'Beneficiary has been marked as claimed.']);
}

// ============================================================
// POST /api/beneficiaries.php?action=mark_unclaimed&id=1
// Reverse a claim (admin correction)
// ============================================================
if ($method === 'POST' && $action === 'mark_unclaimed') {
    $auth = roleGuard(['admin']);
    $id   = (int)($_GET['id'] ?? 0);

    if (!$id) jsonResponse(['error' => 'Beneficiary ID required.'], 400);

    $db   = getDB();
    $stmt = $db->prepare("SELECT b.*, a.reference_number FROM beneficiaries b JOIN applications a ON a.id = b.application_id WHERE b.id = ? LIMIT 1");
    $stmt->execute([$id]);
    $ben  = $stmt->fetch();

    if (!$ben) jsonResponse(['error' => 'Beneficiary not found.'], 404);

    $db->prepare("UPDATE beneficiaries SET claim_status = 'Not Yet Claimed', claimed_at = NULL, released_by = NULL, release_remarks = NULL WHERE id = ?")
       ->execute([$id]);

    logActivity($db, $auth['id'], $auth['name'], 'mark_unclaimed',
        $ben['reference_number'], $ben['application_id'], 'Claimed', 'Not Yet Claimed', 'Claim reversed by admin');

    jsonResponse(['success' => true, 'message' => 'Claim has been reversed.']);
}

jsonResponse(['error' => 'Invalid request.'], 400);
