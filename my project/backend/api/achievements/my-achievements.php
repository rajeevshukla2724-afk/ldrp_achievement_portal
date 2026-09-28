<?php

require_once __DIR__ . '/../../config/bootstrap.php';

$user = requireLogin();

$stmt = $pdo->prepare("
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
        c.id   AS category_id,
        c.name AS category,
        reviewer.name AS reviewer_name
    FROM achievements a
    INNER JOIN categories c ON c.id = a.category_id
    LEFT JOIN users reviewer ON reviewer.id = a.reviewed_by
    WHERE a.user_id = ?
    ORDER BY a.created_at DESC
");
$stmt->execute([$user['id']]);

jsonResponse(true, 'Your achievements loaded successfully.', $stmt->fetchAll());
