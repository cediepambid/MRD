<?php
require_once 'cors.php';
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// ============================================================
// PUBLIC: POST /api/applications.php?action=submit
// Submit a new MRD application
// ============================================================
if ($method === 'POST' && $action === 'submit') {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];

    // Required fields validation
    $required = [
        'surname','given_name','complete_address','barangay',
        'town_city','province','date_of_birth','age','gender',
        'cellphone','civil_status','is_certified'
    ];
    foreach ($required as $field) {
        if (empty($body[$field]) && $body[$field] !== 0) {
            jsonResponse(['error' => "Field '$field' is required."], 400);
        }
    }

    if (!$body['is_certified']) {
        jsonResponse(['error' => 'You must certify that the information is true and correct.'], 400);
    }

    // Sanitize
    $data = [
        'sector'                => sanitize($body['sector']    ?? 'Tricycle franchise holder / TODA Member'),
        'surname'               => sanitize($body['surname']),
        'given_name'            => sanitize($body['given_name']),
        'middle_name'           => sanitize($body['middle_name'] ?? ''),
        'complete_address'      => sanitize($body['complete_address']),
        'barangay'              => sanitize($body['barangay']),
        'town_city'             => sanitize($body['town_city']),
        'province'              => sanitize($body['province']),
        'date_of_birth'         => $body['date_of_birth'],
        'age'                   => (int)$body['age'],
        'gender'                => $body['gender'],
        'cellphone'             => sanitize($body['cellphone']),
        'civil_status'          => $body['civil_status'],
        'spouse_name'           => sanitize($body['spouse_name'] ?? ''),
        'educational_attainment'=> sanitize($body['educational_attainment'] ?? ''),
        'toda_name'             => sanitize($body['toda_name'] ?? ''),
        'franchise_number'      => sanitize($body['franchise_number'] ?? ''),
        'drivers_license_number'=> sanitize($body['drivers_license_number'] ?? ''),
        'is_certified'          => 1,
        'ip_address'            => $_SERVER['REMOTE_ADDR'] ?? null,
        'user_agent'            => $_SERVER['HTTP_USER_AGENT'] ?? null,
    ];

    $db  = getDB();

    // Duplicate check
    $dupStmt = $db->prepare("
        SELECT reference_number FROM applications
        WHERE (surname = ? AND given_name = ? AND date_of_birth = ?)
           OR cellphone = ?
        LIMIT 1
    ");
    $dupStmt->execute([
        $data['surname'], $data['given_name'], $data['date_of_birth'],
        $data['cellphone']
    ]);
    $duplicate = $dupStmt->fetch();
    if ($duplicate) {
        jsonResponse([
            'warning'          => true,
            'duplicate_ref'    => $duplicate['reference_number'],
            'message'          => 'A possible duplicate application was found with reference ' . $duplicate['reference_number'] . '. Please verify before submitting.',
        ], 409);
    }

    $refNum = generateReferenceNumber($db);

    $stmt = $db->prepare("
        INSERT INTO applications
            (reference_number, sector, surname, given_name, middle_name,
             complete_address, barangay, town_city, province,
             date_of_birth, age, gender, cellphone, civil_status,
             spouse_name, educational_attainment, toda_name,
             franchise_number, drivers_license_number, is_certified, ip_address, user_agent)
        VALUES
            (:reference_number,:sector,:surname,:given_name,:middle_name,
             :complete_address,:barangay,:town_city,:province,
             :date_of_birth,:age,:gender,:cellphone,:civil_status,
             :spouse_name,:educational_attainment,:toda_name,
             :franchise_number,:drivers_license_number,:is_certified,:ip_address,:user_agent)
    ");
    $stmt->execute(array_merge([':reference_number' => $refNum], array_combine(
        array_map(fn($k) => ":$k", array_keys($data)),
        array_values($data)
    )));

    $appId = $db->lastInsertId();

    // Notify all admins
    $admins = $db->query("SELECT id FROM users WHERE role IN ('admin') AND is_active = 1")->fetchAll();
    foreach ($admins as $adm) {
        createNotification(
            $db, $adm['id'], 'new_application',
            'New Application Submitted',
            "A new MRD application ($refNum) has been submitted and is awaiting review.",
            $refNum
        );
    }

    logActivity($db, null, 'Applicant', 'submit_application', $refNum, $appId, null, 'Pending', 'New application submitted');

    jsonResponse([
        'success'          => true,
        'reference_number' => $refNum,
        'application_id'   => $appId,
        'message'          => 'Your MRD application has been submitted and is pending for approval.',
    ], 201);
}

// ============================================================
// PUBLIC: GET /api/applications.php?action=track&ref=MRD-2026-000001
// Track application status (no login required)
// ============================================================
if ($method === 'GET' && $action === 'track') {
    $ref   = sanitize($_GET['ref']   ?? '');
    $phone = sanitize($_GET['phone'] ?? '');

    if (!$ref && !$phone) {
        jsonResponse(['error' => 'Reference number or cellphone number is required.'], 400);
    }

    $db = getDB();
    if ($ref) {
        $stmt = $db->prepare("SELECT * FROM applications WHERE reference_number = ? LIMIT 1");
        $stmt->execute([$ref]);
    } else {
        $stmt = $db->prepare("SELECT * FROM applications WHERE cellphone = ? ORDER BY submitted_at DESC LIMIT 1");
        $stmt->execute([$phone]);
    }
    $app = $stmt->fetch();

    if (!$app) {
        jsonResponse(['found' => false, 'message' => 'No application found with the provided information.'], 404);
    }

    // Get attachments
    $attStmt = $db->prepare("SELECT attachment_type, file_name, status FROM application_attachments WHERE application_id = ?");
    $attStmt->execute([$app['id']]);
    $attachments = $attStmt->fetchAll();

    // Get claim status if approved
    $claimStatus = null;
    if ($app['status'] === 'Approved') {
        $benStmt = $db->prepare("SELECT claim_status, claimed_at FROM beneficiaries WHERE application_id = ?");
        $benStmt->execute([$app['id']]);
        $ben = $benStmt->fetch();
        if ($ben) {
            $claimStatus = $ben['claim_status'];
        }
    }

    jsonResponse([
        'found'       => true,
        'application' => [
            'reference_number'  => $app['reference_number'],
            'full_name'         => $app['given_name'] . ' ' . $app['surname'],
            'status'            => $app['status'],
            'rejection_reason'  => $app['rejection_reason'],
            'resubmission_reason'=> $app['resubmission_reason'],
            'submitted_at'      => $app['submitted_at'],
            'updated_at'        => $app['updated_at'],
            'claim_status'      => $claimStatus,
            'attachments'       => $attachments,
        ],
    ]);
}

// ============================================================
// PUBLIC: POST /api/applications.php?action=resubmit
// Applicant re-uploads files after rejection/resubmission request
// ============================================================
if ($method === 'POST' && $action === 'resubmit') {
    $ref = sanitize($_GET['ref'] ?? $_POST['reference_number'] ?? '');
    if (!$ref) {
        jsonResponse(['error' => 'Reference number is required.'], 400);
    }

    $db   = getDB();
    $stmt = $db->prepare("SELECT * FROM applications WHERE reference_number = ? LIMIT 1");
    $stmt->execute([$ref]);
    $app = $stmt->fetch();

    if (!$app) {
        jsonResponse(['error' => 'Application not found.'], 404);
    }
    if (!in_array($app['status'], ['Rejected','For Resubmission'])) {
        jsonResponse(['error' => 'This application is not eligible for resubmission.'], 400);
    }

    // Update status back to Pending
    $db->prepare("UPDATE applications SET status = 'Pending', updated_at = NOW() WHERE id = ?")
       ->execute([$app['id']]);

    // Notify admins
    $admins = $db->query("SELECT id FROM users WHERE role IN ('admin') AND is_active = 1")->fetchAll();
    foreach ($admins as $adm) {
        createNotification(
            $db, $adm['id'], 'resubmission',
            'Application Resubmitted',
            "Application $ref has been resubmitted by the applicant.",
            $ref
        );
    }

    logActivity($db, null, 'Applicant', 'resubmit_application', $ref, $app['id'],
        $app['status'], 'Pending', 'Applicant resubmitted documents');

    jsonResponse(['success' => true, 'message' => 'Your documents have been resubmitted. Your application is now under review.']);
}

// ============================================================
// ADMIN: GET /api/applications.php?action=list
// ============================================================
if ($method === 'GET' && $action === 'list') {
    $auth = authGuard();

    $db     = getDB();
    $where  = ['1=1'];
    $params = [];

    if (!empty($_GET['status'])) {
        $where[]  = 'a.status = ?';
        $params[] = $_GET['status'];
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
        $where[]  = 'DATE(a.submitted_at) >= ?';
        $params[] = $_GET['date_from'];
    }
    if (!empty($_GET['date_to'])) {
        $where[]  = 'DATE(a.submitted_at) <= ?';
        $params[] = $_GET['date_to'];
    }

    $page  = max(1, (int)($_GET['page'] ?? 1));
    $limit = min(100, max(10, (int)($_GET['limit'] ?? 20)));
    $off   = ($page - 1) * $limit;
    $sort  = in_array($_GET['sort'] ?? '', ['submitted_at','surname','status']) ? $_GET['sort'] : 'submitted_at';
    $dir   = ($_GET['dir'] ?? 'desc') === 'asc' ? 'ASC' : 'DESC';

    $whereStr = implode(' AND ', $where);

    $total = $db->prepare("SELECT COUNT(*) FROM applications a WHERE $whereStr");
    $total->execute($params);
    $totalCount = (int)$total->fetchColumn();

    $stmt = $db->prepare("
        SELECT a.id, a.reference_number, a.surname, a.given_name, a.middle_name,
               a.barangay, a.toda_name, a.cellphone, a.status,
               a.submitted_at, a.updated_at,
               b.claim_status
        FROM applications a
        LEFT JOIN beneficiaries b ON b.application_id = a.id
        WHERE $whereStr
        ORDER BY a.$sort $dir
        LIMIT $limit OFFSET $off
    ");
    $stmt->execute($params);
    $applications = $stmt->fetchAll();

    jsonResponse([
        'data'        => $applications,
        'total'       => $totalCount,
        'page'        => $page,
        'limit'       => $limit,
        'total_pages' => ceil($totalCount / $limit),
    ]);
}

// ============================================================
// ADMIN: GET /api/applications.php?action=detail&id=1
// ============================================================
if ($method === 'GET' && $action === 'detail') {
    $auth = authGuard();
    $id   = (int)($_GET['id'] ?? 0);

    if (!$id) jsonResponse(['error' => 'Application ID required.'], 400);

    $db   = getDB();
    $stmt = $db->prepare("SELECT a.*, u.name AS approved_by_name FROM applications a LEFT JOIN users u ON u.id = a.approved_by WHERE a.id = ?");
    $stmt->execute([$id]);
    $app  = $stmt->fetch();

    if (!$app) jsonResponse(['error' => 'Application not found.'], 404);

    // Attachments
    $attStmt = $db->prepare("SELECT * FROM application_attachments WHERE application_id = ?");
    $attStmt->execute([$id]);
    $attachments = $attStmt->fetchAll();

    // Map attachments with URL
    foreach ($attachments as &$att) {
        $att['url'] = UPLOAD_URL . dirname($att['file_path']) . '/' . basename($att['file_path']);
    }
    unset($att);

    // Beneficiary info
    $benStmt = $db->prepare("SELECT b.*, u.name AS released_by_name FROM beneficiaries b LEFT JOIN users u ON u.id = b.released_by WHERE b.application_id = ?");
    $benStmt->execute([$id]);
    $beneficiary = $benStmt->fetch();

    jsonResponse([
        'application' => $app,
        'attachments' => $attachments,
        'beneficiary' => $beneficiary ?: null,
    ]);
}

// ============================================================
// ADMIN: POST /api/applications.php?action=approve&id=1
// ============================================================
if ($method === 'POST' && $action === 'approve') {
    $auth = roleGuard(['admin']);
    $id   = (int)($_GET['id'] ?? 0);
    if (!$id) jsonResponse(['error' => 'Application ID required.'], 400);

    $db   = getDB();
    $stmt = $db->prepare("SELECT * FROM applications WHERE id = ? LIMIT 1");
    $stmt->execute([$id]);
    $app  = $stmt->fetch();

    if (!$app) jsonResponse(['error' => 'Application not found.'], 404);
    if ($app['status'] === 'Approved') jsonResponse(['error' => 'Application is already approved.'], 400);

    $db->prepare("
        UPDATE applications
        SET status = 'Approved', approved_by = ?, approved_at = NOW(), updated_at = NOW()
        WHERE id = ?
    ")->execute([$auth['id'], $id]);

    // Add to beneficiaries
    $existing = $db->prepare("SELECT id FROM beneficiaries WHERE application_id = ?");
    $existing->execute([$id]);
    if (!$existing->fetch()) {
        $db->prepare("INSERT INTO beneficiaries (application_id, reference_number) VALUES (?,?)")
           ->execute([$id, $app['reference_number']]);
    }

    logActivity($db, $auth['id'], $auth['name'], 'approve_application',
        $app['reference_number'], $id, $app['status'], 'Approved', 'Application approved');

    jsonResponse(['success' => true, 'message' => 'Application approved and applicant added to beneficiary list.']);
}

// ============================================================
// ADMIN: POST /api/applications.php?action=reject&id=1
// ============================================================
if ($method === 'POST' && $action === 'reject') {
    $auth = roleGuard(['admin']);
    $id   = (int)($_GET['id'] ?? 0);
    $body = json_decode(file_get_contents('php://input'), true) ?? [];

    if (!$id) jsonResponse(['error' => 'Application ID required.'], 400);

    $reason = sanitize($body['reason'] ?? '');
    if (!$reason) jsonResponse(['error' => 'Rejection reason is required.'], 400);

    $db   = getDB();
    $stmt = $db->prepare("SELECT * FROM applications WHERE id = ? LIMIT 1");
    $stmt->execute([$id]);
    $app  = $stmt->fetch();

    if (!$app) jsonResponse(['error' => 'Application not found.'], 404);

    $db->prepare("UPDATE applications SET status = 'Rejected', rejection_reason = ?, updated_at = NOW() WHERE id = ?")
       ->execute([$reason, $id]);

    logActivity($db, $auth['id'], $auth['name'], 'reject_application',
        $app['reference_number'], $id, $app['status'], 'Rejected', $reason);

    jsonResponse(['success' => true, 'message' => 'Application has been rejected.']);
}

// ============================================================
// ADMIN: POST /api/applications.php?action=request_resubmission&id=1
// ============================================================
if ($method === 'POST' && $action === 'request_resubmission') {
    $auth = roleGuard(['admin']);
    $id   = (int)($_GET['id'] ?? 0);
    $body = json_decode(file_get_contents('php://input'), true) ?? [];

    if (!$id) jsonResponse(['error' => 'Application ID required.'], 400);

    $reason = sanitize($body['reason'] ?? '');
    if (!$reason) jsonResponse(['error' => 'Resubmission reason is required.'], 400);

    $db   = getDB();
    $stmt = $db->prepare("SELECT * FROM applications WHERE id = ? LIMIT 1");
    $stmt->execute([$id]);
    $app  = $stmt->fetch();

    if (!$app) jsonResponse(['error' => 'Application not found.'], 404);

    $db->prepare("UPDATE applications SET status = 'For Resubmission', resubmission_reason = ?, updated_at = NOW() WHERE id = ?")
       ->execute([$reason, $id]);

    logActivity($db, $auth['id'], $auth['name'], 'request_resubmission',
        $app['reference_number'], $id, $app['status'], 'For Resubmission', $reason);

    jsonResponse(['success' => true, 'message' => 'Resubmission request sent.']);
}

// ============================================================
// ADMIN: PUT /api/applications.php?action=update_attachment&att_id=1
// Update attachment status (Complete/Missing/Invalid)
// ============================================================
if ($method === 'PUT' && $action === 'update_attachment') {
    $auth  = roleGuard(['admin']);
    $attId = (int)($_GET['att_id'] ?? 0);
    $body  = json_decode(file_get_contents('php://input'), true) ?? [];

    if (!$attId) jsonResponse(['error' => 'Attachment ID required.'], 400);

    $status = $body['status'] ?? '';
    if (!in_array($status, ['Pending','Complete','Missing','Invalid'])) {
        jsonResponse(['error' => 'Invalid status.'], 400);
    }

    $db = getDB();
    $db->prepare("UPDATE application_attachments SET status = ? WHERE id = ?")
       ->execute([$status, $attId]);

    jsonResponse(['success' => true]);
}

jsonResponse(['error' => 'Invalid request.'], 400);
