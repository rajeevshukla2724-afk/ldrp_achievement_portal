<?php

require_once __DIR__ . '/../../config/bootstrap.php';

$actor = requireRole(['admin', 'mentor']);

requireMethod('POST');

$data = requestData();
$userId = validId($data['user_id'] ?? null);

if (!$userId) {
    jsonResponse(false, 'Invalid user ID.', [], 422);
}

if ((int)$userId === (int)$actor['id']) {
    jsonResponse(false, 'You cannot delete your own account.', [], 422);
}

$stmt = $pdo->prepare("
    SELECT id, name, email, role
    FROM users
    WHERE id = ?
    LIMIT 1
");
$stmt->execute([$userId]);
$user = $stmt->fetch();

if (!$user) {
    jsonResponse(false, 'User not found.', [], 404);
}

if (!in_array($user['role'], ['student', 'alumni'], true)) {
    jsonResponse(false, 'Only student or alumni accounts can be deleted from this screen.', [], 403);
}

/*
 * Before the database CASCADE removes achievements, collect uploaded
 * certificate/photo paths so their physical files can also be removed.
 */
$stmt = $pdo->prepare("
    SELECT certificate_path
    FROM achievements
    WHERE user_id = ?
      AND certificate_path IS NOT NULL
      AND certificate_path <> ''
");
$stmt->execute([$userId]);
$files = $stmt->fetchAll();

$pdo->beginTransaction();

try {
    $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
    $stmt->execute([$userId]);

    if ($stmt->rowCount() !== 1) {
        throw new RuntimeException('User could not be deleted.');
    }

    $pdo->commit();

    $uploadRoot = dirname(__DIR__, 2) . '/uploads/';
    foreach ($files as $file) {
        $relative = ltrim((string)$file['certificate_path'], '/');
        $fullPath = $uploadRoot . str_replace(['../', '..\\'], '', $relative);

        if (is_file($fullPath)) {
            @unlink($fullPath);
        }
    }
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    throw $e;
}

jsonResponse(true, 'User deleted successfully.', [
    'user_id' => (int)$userId,
    'name' => $user['name'],
    'role' => $user['role']
]);
