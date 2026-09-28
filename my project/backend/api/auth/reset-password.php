<?php

require_once __DIR__ . '/../../config/bootstrap.php';

requireMethod('POST');

$data = requestData();

$token = trim((string)($data['token'] ?? ''));
$password = (string)($data['password'] ?? '');
$confirm = (string)($data['confirm_password'] ?? '');

if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
    jsonResponse(false, 'Invalid or expired password reset link.', [], 422);
}

if (strlen($password) < 8) {
    jsonResponse(false, 'Password must contain at least 8 characters.', [], 422);
}

if ($password !== $confirm) {
    jsonResponse(false, 'Passwords do not match.', [], 422);
}

$tokenHash = hash('sha256', $token);

$stmt = $pdo->prepare("
    SELECT pr.id, pr.user_id, u.status, u.role
    FROM password_resets pr
    INNER JOIN users u ON u.id = pr.user_id
    WHERE pr.token_hash = ?
      AND pr.expires_at > NOW()
    LIMIT 1
");
$stmt->execute([$tokenHash]);
$reset = $stmt->fetch();

if (!$reset || $reset['status'] !== 'active' || !in_array($reset['role'], ['student', 'alumni'], true)) {
    jsonResponse(false, 'Invalid or expired password reset link.', [], 422);
}

$stmt = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
$stmt->execute([
    password_hash($password, PASSWORD_DEFAULT),
    $reset['user_id']
]);

$stmt = $pdo->prepare("DELETE FROM password_resets WHERE user_id = ?");
$stmt->execute([$reset['user_id']]);

jsonResponse(true, 'Password reset successfully. You can now sign in.');
