<?php

require_once __DIR__ . '/../../config/bootstrap.php';

$admin = requireRole(['admin']);
requireMethod('POST');

$data = requestData();

$userId = validId($data['user_id'] ?? null);
$password = (string)($data['password'] ?? '');

if (!$userId) {
    jsonResponse(false, 'Invalid user ID.', [], 422);
}

if ($password === '' || strlen($password) < 8) {
    jsonResponse(false, 'Password must contain at least 8 characters.', [], 422);
}

if ((int)$userId === (int)$admin['id']) {
    jsonResponse(false, 'Use Change Password in your own profile to change the admin password.', [], 422);
}

$stmt = $pdo->prepare("SELECT id, name, role, status FROM users WHERE id = ? LIMIT 1");
$stmt->execute([$userId]);
$user = $stmt->fetch();

if (!$user) {
    jsonResponse(false, 'User not found.', [], 404);
}

$stmt = $pdo->prepare("
    UPDATE users
    SET password = ?
    WHERE id = ?
");
$stmt->execute([
    password_hash($password, PASSWORD_DEFAULT),
    $userId
]);

/* Any existing reset links become invalid after an admin reset. */
$stmt = $pdo->prepare("DELETE FROM password_resets WHERE user_id = ?");
$stmt->execute([$userId]);

jsonResponse(true, 'Password reset successfully.', [
    'user_id' => (int)$userId
]);
