<?php

require_once __DIR__ . '/../../config/bootstrap.php';

// Public: active categories with the number of approved achievements in each.
$stmt = $pdo->query("
    SELECT
        c.id,
        c.name,
        c.description,
        c.icon,
        (
            SELECT COUNT(*)
            FROM achievements a
            WHERE a.category_id = c.id
              AND a.status = 'approved'
        ) AS entries
    FROM categories c
    WHERE c.status = 'active'
    ORDER BY c.id ASC
");

jsonResponse(true, 'Categories loaded successfully.', $stmt->fetchAll());
