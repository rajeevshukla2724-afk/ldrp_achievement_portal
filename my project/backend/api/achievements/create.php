<?php

require_once __DIR__ . '/../../config/bootstrap.php';

$user = requireRole(['student', 'alumni']);
requireMethod('POST');

$title           = clean($_POST['title'] ?? '');
$description     = clean($_POST['description'] ?? '');
$categoryId      = validId($_POST['category_id'] ?? null);
$achievementDate = clean($_POST['achievement_date'] ?? '') ?: date('Y-m-d');
$organization    = clean($_POST['organization'] ?? '');
$position        = clean($_POST['position'] ?? '');

if ($title === '' || $description === '' || !$categoryId) {
    jsonResponse(false, 'Title, description and category are required.', [], 422);
}
if (mb_strlen($title) > 200) {
    jsonResponse(false, 'Title is too long (max 200 characters).', [], 422);
}
if (!validDate($achievementDate) || $achievementDate > date('Y-m-d')) {
    jsonResponse(false, 'Achievement date must be a valid date, not in the future.', [], 422);
}

$stmt = $pdo->prepare("SELECT id FROM categories WHERE id = ? AND status = 'active' LIMIT 1");
$stmt->execute([$categoryId]);
if (!$stmt->fetch()) {
    jsonResponse(false, 'Invalid category.', [], 422);
}

$certificatePath = isset($_FILES['certificate'])
    ? uploadCertificate($_FILES['certificate'])
    : null;

$stmt = $pdo->prepare("
    INSERT INTO achievements
        (user_id, category_id, title, description, achievement_date,
         organization, position, certificate_path, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())
");
$stmt->execute([
    $user['id'],
    $categoryId,
    $title,
    $description,
    $achievementDate,
    $organization ?: null,
    $position ?: null,
    $certificatePath,
]);

jsonResponse(
    true,
    'Achievement submitted successfully and is waiting for approval.',
    ['achievement_id' => (int)$pdo->lastInsertId()],
    201
);
