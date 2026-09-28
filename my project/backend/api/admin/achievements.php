<?php

require_once __DIR__ . '/../../config/bootstrap.php';

requireRole(['admin']);

$search     = trim($_GET['search'] ?? '');
$status     = strtolower(trim($_GET['status'] ?? ''));
$categoryId = validId($_GET['category_id'] ?? null);

$sql = "
    SELECT
        a.id,
        a.title,
        a.description,
        a.achievement_date,
        a.organization,
        a.position,
        a.certificate_path,
        a.status,
        a.rejection_reason,
        a.featured,
        a.points,
        a.created_at,
        a.reviewed_at,
        u.id            AS user_id,
        u.name          AS name,
        u.email         AS user_email,
        u.role          AS user_role,
        u.department    AS department,
        u.enrollment_no AS enrollment_no,
        c.id            AS category_id,
        c.name          AS category,
        reviewer.name   AS reviewer_name
    FROM achievements a
    INNER JOIN users u      ON u.id = a.user_id
    INNER JOIN categories c ON c.id = a.category_id
    LEFT JOIN users reviewer ON reviewer.id = a.reviewed_by
    WHERE 1 = 1
";
$params = [];

if ($search !== '') {
    $sql .= " AND (a.title LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR u.department LIKE ? OR a.organization LIKE ?)";
    $like = '%' . $search . '%';
    array_push($params, $like, $like, $like, $like, $like);
}
if (in_array($status, ['pending', 'approved', 'rejected'], true)) {
    $sql .= " AND a.status = ?";
    $params[] = $status;
}
if ($categoryId) {
    $sql .= " AND a.category_id = ?";
    $params[] = $categoryId;
}
$sql .= " ORDER BY a.created_at DESC";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);

jsonResponse(true, 'Admin achievements loaded successfully.', $stmt->fetchAll());
