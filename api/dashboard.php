<?php
require_once 'cors.php';
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') jsonResponse(['error' => 'Method not allowed.'], 405);

$auth = authGuard();
$db   = getDB();

// ============================================================
// Summary cards
// ============================================================
$totals = $db->query("
    SELECT
        COUNT(*) AS total_applications,
        SUM(status = 'Pending')            AS pending,
        SUM(status = 'Approved')           AS approved,
        SUM(status = 'Rejected')           AS rejected,
        SUM(status = 'For Resubmission')   AS for_resubmission
    FROM applications
")->fetch();

$claimStats = $db->query("
    SELECT
        COUNT(*) AS total_beneficiaries,
        SUM(claim_status = 'Claimed')          AS claimed,
        SUM(claim_status = 'Not Yet Claimed')  AS not_yet_claimed
    FROM beneficiaries
")->fetch();

// ============================================================
// Applications by Barangay (top 10)
// ============================================================
$byBarangay = $db->query("
    SELECT barangay, COUNT(*) AS count
    FROM applications
    GROUP BY barangay
    ORDER BY count DESC
    LIMIT 10
")->fetchAll();

// ============================================================
// Monthly submissions (last 12 months)
// ============================================================
$monthly = $db->query("
    SELECT DATE_FORMAT(submitted_at, '%Y-%m') AS month,
           COUNT(*) AS count
    FROM applications
    WHERE submitted_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
    GROUP BY month
    ORDER BY month ASC
")->fetchAll();

// ============================================================
// Recent applications (last 5)
// ============================================================
$recent = $db->query("
    SELECT reference_number, surname, given_name, barangay, status, submitted_at
    FROM applications
    ORDER BY submitted_at DESC
    LIMIT 5
")->fetchAll();

// ============================================================
// Unread notifications count
// ============================================================
$unreadStmt = $db->prepare("SELECT COUNT(*) FROM notifications WHERE (user_id = ? OR user_id IS NULL) AND is_read = 0");
$unreadStmt->execute([$auth['id']]);
$unreadCount = (int)$unreadStmt->fetchColumn();

jsonResponse([
    'summary' => [
        'total_applications' => (int)$totals['total_applications'],
        'pending'            => (int)$totals['pending'],
        'approved'           => (int)$totals['approved'],
        'rejected'           => (int)$totals['rejected'],
        'for_resubmission'   => (int)$totals['for_resubmission'],
        'total_beneficiaries'=> (int)$claimStats['total_beneficiaries'],
        'claimed'            => (int)$claimStats['claimed'],
        'not_yet_claimed'    => (int)$claimStats['not_yet_claimed'],
    ],
    'by_barangay'    => $byBarangay,
    'monthly'        => $monthly,
    'recent'         => $recent,
    'unread_notifications' => $unreadCount,
]);
