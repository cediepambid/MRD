<?php
require_once 'cors.php';
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'GET') jsonResponse(['error' => 'Method not allowed.'], 405);

$auth   = authGuard();
$db     = getDB();
$type   = $_GET['type'] ?? 'all';

$where  = ['1=1'];
$params = [];

if (!empty($_GET['barangay'])) {
    $where[]  = 'a.barangay = ?';
    $params[] = $_GET['barangay'];
}
if (!empty($_GET['toda_name'])) {
    $where[]  = 'a.toda_name LIKE ?';
    $params[] = '%' . $_GET['toda_name'] . '%';
}
if (!empty($_GET['date_from'])) {
    $where[]  = 'DATE(a.submitted_at) >= ?';
    $params[] = $_GET['date_from'];
}
if (!empty($_GET['date_to'])) {
    $where[]  = 'DATE(a.submitted_at) <= ?';
    $params[] = $_GET['date_to'];
}

switch ($type) {
    case 'pending':
        $where[] = "a.status = 'Pending'";
        break;
    case 'approved':
        $where[] = "a.status = 'Approved'";
        break;
    case 'rejected':
        $where[] = "a.status = 'Rejected'";
        break;
    case 'resubmission':
        $where[] = "a.status = 'For Resubmission'";
        break;
    case 'claimed':
        $where[] = "b.claim_status = 'Claimed'";
        break;
    case 'not_claimed':
        $where[] = "b.claim_status = 'Not Yet Claimed'";
        break;
}

$whereStr = implode(' AND ', $where);

$data = $db->prepare("
    SELECT a.reference_number, a.surname, a.given_name, a.middle_name,
           a.barangay, a.town_city, a.province, a.cellphone,
           a.toda_name, a.franchise_number, a.drivers_license_number,
           a.gender, a.civil_status, a.status AS application_status,
           a.submitted_at, a.approved_at,
           b.claim_status, b.claimed_at,
           u.name AS released_by_name
    FROM applications a
    LEFT JOIN beneficiaries b ON b.application_id = a.id
    LEFT JOIN users u ON u.id = b.released_by
    WHERE $whereStr
    ORDER BY a.surname ASC
");
$data->execute($params);
$rows = $data->fetchAll();

// Summary by barangay
$byBarangay = $db->prepare("
    SELECT a.barangay,
           COUNT(*) AS total,
           SUM(CASE WHEN a.status = 'Approved' THEN 1 ELSE 0 END) AS approved,
           SUM(CASE WHEN a.status = 'Pending' THEN 1 ELSE 0 END) AS pending,
           SUM(CASE WHEN a.status = 'Rejected' THEN 1 ELSE 0 END) AS rejected,
           SUM(CASE WHEN a.status = 'For Resubmission' THEN 1 ELSE 0 END) AS for_resubmission
    FROM applications a
    LEFT JOIN beneficiaries b ON b.application_id = a.id
    WHERE $whereStr
    GROUP BY a.barangay
    ORDER BY total DESC
");
$byBarangay->execute($params);
$barangaySummary = $byBarangay->fetchAll();

jsonResponse([
    'type'             => $type,
    'data'             => $rows,
    'barangay_summary' => $barangaySummary,
    'generated_at'     => date('Y-m-d H:i:s'),
    'generated_by'     => $auth['name'],
]);
