<?php

require_once __DIR__ . '/../../config/bootstrap.php';

// Public: approved achievements for the homepage (featured ones are flagged).
$stmt = $pdo->query("
    SELECT
        a.id,
        a.title,
        a.description,
        a.achievement_date,
        a.organization,
        a.position,
        a.status,
        a.featured,
        a.points,
        a.created_at,
        a.certificate_path,
        u.name       AS name,
        u.role       AS role,
        u.department AS department,
        c.id         AS category_id,
        c.name       AS category
    FROM achievements a
    INNER JOIN users u      ON u.id = a.user_id
    INNER JOIN categories c ON c.id = a.category_id
    WHERE a.status = 'approved'
      AND u.status = 'active'
      AND c.status = 'active'
    ORDER BY a.featured DESC, a.achievement_date DESC, a.created_at DESC
");

jsonResponse(true, 'Achievements loaded successfully.', $stmt->fetchAll());
