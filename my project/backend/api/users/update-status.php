<?php

require_once __DIR__ . '/../../config/bootstrap.php';

$admin = requireRole(['admin']);

$data = requestData();

$userId = validId($data['user_id'] ?? null);
$status = strtolower(trim($data['status'] ?? ''));

if (!$userId) {
    jsonResponse(false, 'Invalid user ID.', [], 422);
}

if (!in_array($status, ['active', 'blocked'], true)) {
    jsonResponse(
        false,
        'Status must be active or blocked.',
        [],
        422
    );
}

if ((int)$userId === (int)$admin['id']) {
    jsonResponse(
        false,
        'You cannot block your own admin account.',
        [],
        422
    );
}

$stmt = $pdo->prepare("
    SELECT
        id,
        name,
        role,
        status
    FROM users
    WHERE id = ?
    LIMIT 1
");

$stmt->execute([$userId]);

$user = $stmt->fetch();

if (!$user) {
    jsonResponse(
        false,
        'User not found.',
        [],
        404
    );
}

$stmt = $pdo->prepare("
    UPDATE users
    SET status = ?
    WHERE id = ?
");

$stmt->execute([
    $status,
    $userId
]);

jsonResponse(
    true,
    $status === 'active'
        ? 'User activated successfully.'
        : 'User blocked successfully.',
    [
        'user_id' => (int)$userId,
        'status' => $status
    ]
);