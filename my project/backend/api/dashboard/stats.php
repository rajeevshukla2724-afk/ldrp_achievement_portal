<?php

require_once __DIR__ . '/../../config/bootstrap.php';

/**
 * Flat stats object; the keys are exactly what js/app.js reads.
 *   student/alumni : total, approved, pending, rejected, points
 *   mentor         : assigned_students, pending, approved, rejected
 *   admin          : total, pending, approved, rejected, featured, users, categories
 */
$user  = requireLogin();
$stats = [];

if (in_array($user['role'], ['student', 'alumni'], true)) {

    $stmt = $pdo->prepare("
        SELECT
            COUNT(*) AS total,
            COALESCE(SUM(status = 'approved'), 0) AS approved,
            COALESCE(SUM(status = 'pending'), 0)  AS pending,
            COALESCE(SUM(status = 'rejected'), 0) AS rejected,
            COALESCE(SUM(CASE WHEN status = 'approved' THEN points ELSE 0 END), 0) AS points
        FROM achievements
        WHERE user_id = ?
    ");
    $stmt->execute([$user['id']]);
    $r = $stmt->fetch();

    $stats = [
        'total'    => (int)$r['total'],
        'approved' => (int)$r['approved'],
        'pending'  => (int)$r['pending'],
        'rejected' => (int)$r['rejected'],
        'points'   => (int)$r['points'],
    ];

} elseif ($user['role'] === 'mentor') {

    $stmt = $pdo->prepare("SELECT COUNT(*) FROM mentor_assignments WHERE mentor_id = ? AND status = 'active'");
    $stmt->execute([$user['id']]);
    $assigned = (int)$stmt->fetchColumn();

    $stmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM achievements a
        INNER JOIN mentor_assignments ma
            ON ma.student_id = a.user_id AND ma.mentor_id = ? AND ma.status = 'active'
        WHERE a.status = 'pending'
    ");
    $stmt->execute([$user['id']]);
    $pending = (int)$stmt->fetchColumn();

    $stmt = $pdo->prepare("
        SELECT
            COALESCE(SUM(status = 'approved'), 0) AS approved,
            COALESCE(SUM(status = 'rejected'), 0) AS rejected
        FROM achievements
        WHERE reviewed_by = ?
    ");
    $stmt->execute([$user['id']]);
    $r = $stmt->fetch();

    $stats = [
        'assigned_students' => $assigned,
        'pending'           => $pending,
        'approved'          => (int)$r['approved'],
        'rejected'          => (int)$r['rejected'],
    ];

} else {

    $a = $pdo->query("
        SELECT
            COUNT(*) AS total,
            COALESCE(SUM(status = 'pending'), 0)  AS pending,
            COALESCE(SUM(status = 'approved'), 0) AS approved,
            COALESCE(SUM(status = 'rejected'), 0) AS rejected,
            COALESCE(SUM(featured = 1), 0)        AS featured
        FROM achievements
    ")->fetch();

    $users = (int)$pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
    $cats  = (int)$pdo->query("SELECT COUNT(*) FROM categories WHERE status = 'active'")->fetchColumn();

    $stats = [
        'total'      => (int)$a['total'],
        'pending'    => (int)$a['pending'],
        'approved'   => (int)$a['approved'],
        'rejected'   => (int)$a['rejected'],
        'featured'   => (int)$a['featured'],
        'users'      => $users,
        'categories' => $cats,
    ];
}

jsonResponse(true, 'Dashboard statistics loaded successfully.', $stats);
