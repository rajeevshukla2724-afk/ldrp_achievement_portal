<?php

require_once __DIR__ . '/../../config/bootstrap.php';

$user = requireLogin();
requireMethod('POST');

$data = requestData();

$current = (string)($data['current_password'] ?? '');
$new = (string)($data['new_password'] ?? '');
$confirm = (string)($data['confirm_password'] ?? '');

if ($current === '' || $new === '' || $confirm === '') {
    jsonResponse(false, 'Current password, new password and confirmation are required.', [], 422);
}

$stmt = $pdo->prepare("SELECT password FROM users WHERE id = ? LIMIT 1");
$stmt->execute([$user['id']]);
$hash = $stmt->fetchColumn();

if (!$hash || !password_verify($current, $hash)) {
    jsonResponse(false, 'Current password is incorrect.', [], 422);
}

if (strlen($new) < 8) {
    jsonResponse(false, 'New password must contain at least 8 characters.', [], 422);
}

if ($new !== $confirm) {
    jsonResponse(false, 'New passwords do not match.', [], 422);
}

if (password_verify($new, $hash)) {
    jsonResponse(false, 'New password must be different from the current password.', [], 422);
}

$newHash = password_hash($new, PASSWORD_DEFAULT);

$stmt = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
$stmt->execute([
    $newHash,
    $user['id']
]);

// Confirm that the new hash was actually stored before reporting success.
$verifyStmt = $pdo->prepare("SELECT password FROM users WHERE id = ? LIMIT 1");
$verifyStmt->execute([$user['id']]);
$storedHash = $verifyStmt->fetchColumn();

if (!$storedHash || !password_verify($new, $storedHash)) {
    jsonResponse(false, 'Password could not be saved. Please try again.', [], 500);
}

$stmt = $pdo->prepare("DELETE FROM password_resets WHERE user_id = ?");
$stmt->execute([$user['id']]);

jsonResponse(true, 'Password changed successfully.');
