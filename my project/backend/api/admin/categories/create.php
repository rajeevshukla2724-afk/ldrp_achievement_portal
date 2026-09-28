<?php

require_once __DIR__ . '/../../../config/bootstrap.php';

requireRole(['admin']);

$data = requestData();

$name = clean($data['name'] ?? '');
$description = clean($data['description'] ?? '');

if ($name === '') {
    jsonResponse(
        false,
        'Category name is required.',
        [],
        422
    );
}

if (strlen($name) > 100) {
    jsonResponse(
        false,
        'Category name is too long.',
        [],
        422
    );
}

$stmt = $pdo->prepare("
    SELECT id
    FROM categories
    WHERE name = ?
    LIMIT 1
");

$stmt->execute([$name]);

if ($stmt->fetch()) {
    jsonResponse(
        false,
        'This category already exists.',
        [],
        409
    );
}

$stmt = $pdo->prepare("
    INSERT INTO categories
    (
        name,
        description,
        status,
        created_at
    )
    VALUES
    (
        ?, ?, 'active', NOW()
    )
");

$stmt->execute([
    $name,
    $description ?: null
]);

$categoryId = $pdo->lastInsertId();

jsonResponse(
    true,
    'Category created successfully.',
    [
        'category_id' => (int)$categoryId
    ],
    201
);