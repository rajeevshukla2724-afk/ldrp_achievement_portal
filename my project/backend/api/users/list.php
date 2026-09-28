<?php

require_once __DIR__ . '/../../config/bootstrap.php';

requireRole(['admin', 'mentor']);

$search = trim($_GET['search'] ?? '');
$role   = strtolower(trim($_GET['role'] ?? ''));
$status = strtolower(trim($_GET['status'] ?? ''));

$sql = "
    SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.enrollment_no,
        u.department,
        u.semester,
        u.status,
        u.created_at,
        (SELECT COUNT(*) FROM achievements a WHERE a.user_id = u.id) AS achievement_count,
        (SELECT COALESCE(SUM(a.points), 0) FROM achievements a
          WHERE a.user_id = u.id AND a.status = 'approved') AS total_points
    FROM users u
    WHERE 1 = 1
";
$params = [];

if ($search !== '') {
    $sql .= " AND (u.name LIKE ? OR u.email LIKE ? OR u.enrollment_no LIKE ? OR u.department LIKE ?)";
    $like = '%' . $search . '%';
    array_push($params, $like, $like, $like, $like);
}
if (in_array($role, ['student', 'alumni', 'mentor', 'admin'], true)) {
    $sql .= " AND u.role = ?";
    $params[] = $role;
}
if (in_array($status, ['active', 'blocked'], true)) {
    $sql .= " AND u.status = ?";
    $params[] = $status;
}
$sql .= " ORDER BY u.created_at DESC";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);

jsonResponse(true, 'Users loaded successfully.', $stmt->fetchAll());
