<?php

require_once __DIR__ . '/../../config/bootstrap.php';

/**
 * Mentor / admin review lists.
 *   (default)      -> pending achievements waiting for review
 *                     (mentor: only from their assigned students)
 *   ?scope=reviewed -> achievements this user has already approved/rejected
 */
$user  = requireRole(['mentor', 'admin']);
$scope = strtolower(trim($_GET['scope'] ?? 'pending'));

$select = "
    SELECT
        a.id,
        a.title,
        a.description,
        a.achievement_date,
        a.organization,
        a.position,
        a.certificate_path,
        a.status,
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
        c.name          AS category
    FROM achievements a
    INNER JOIN users u      ON u.id = a.user_id
    INNER JOIN categories c ON c.id = a.category_id
";

if ($scope === 'reviewed') {
    $sql = $select . "
        WHERE a.reviewed_by = ? AND a.status = 'approved'
        ORDER BY a.reviewed_at DESC
    ";
    $params = [$user['id']];
} elseif ($user['role'] === 'admin') {
    $sql = $select . "
        WHERE a.status = 'pending'
        ORDER BY a.created_at ASC
    ";
    $params = [];
} else {
    $sql = $select . "
        INNER JOIN mentor_assignments ma
            ON ma.student_id = u.id AND ma.mentor_id = ? AND ma.status = 'active'
        WHERE a.status = 'pending'
        ORDER BY a.created_at ASC
    ";
    $params = [$user['id']];
}

$stmt = $pdo->prepare($sql);
$stmt->execute($params);

jsonResponse(true, 'Review list loaded successfully.', $stmt->fetchAll());
