<?php

require_once __DIR__ . '/../../../config/bootstrap.php';

requireRole(['admin']);

$data = requestData();

$categoryId = validId($data['category_id'] ?? null);

if (!$categoryId) {
    jsonResponse(
        false,
        'Invalid category ID.',
        [],
        422
    );
}

$stmt = $pdo->prepare("
    SELECT id, name, status
    FROM categories
    WHERE id = ?
    LIMIT 1
");

$stmt->execute([$categoryId]);

$category = $stmt->fetch();

if (!$category) {
    jsonResponse(
        false,
        'Category not found.',
        [],
        404
    );
}

$stmt = $pdo->prepare("
    SELECT COUNT(*) AS total
    FROM achievements
    WHERE category_id = ?
");

$stmt->execute([$categoryId]);

$result = $stmt->fetch();

if ((int)$result['total'] > 0) {

    $stmt = $pdo->prepare("
        UPDATE categories
        SET status = 'inactive'
        WHERE id = ?
    ");

    $stmt->execute([$categoryId]);

    jsonResponse(
        true,
        'Category has existing achievements, so it was deactivated instead of deleted.'
    );
}

$stmt = $pdo->prepare("
    DELETE FROM categories
    WHERE id = ?
");

$stmt->execute([$categoryId]);

jsonResponse(
    true,
    'Category deleted successfully.'
);