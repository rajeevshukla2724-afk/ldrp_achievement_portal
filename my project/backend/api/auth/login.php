<?php

require_once __DIR__ . '/../../config/bootstrap.php';

requireMethod('POST');

$data = requestData();

$email = strtolower(trim($data['email'] ?? ''));
$password = $data['password'] ?? '';

if ($email === '' || $password === '') {
    jsonResponse(false, 'Email and password are required.', [], 422);
}

$stmt = $pdo->prepare("
    SELECT
        id,
        name,
        email,
        password,
        role,
        enrollment_no,
        department,
        semester,
        status
    FROM users
    WHERE email = ?
    LIMIT 1
");

$stmt->execute([$email]);

$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password'])) {
    jsonResponse(false, 'Invalid email or password.', [], 401);
}

if ($user['status'] !== 'active') {
    jsonResponse(false, 'Your account is currently blocked or inactive.', [], 403);
}

unset($user['password']);

session_regenerate_id(true);

$_SESSION['user'] = $user;

jsonResponse(
    true,
    'Login successful.',
    $user
);