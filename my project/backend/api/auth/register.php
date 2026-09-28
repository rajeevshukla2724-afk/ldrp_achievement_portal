<?php

require_once __DIR__ . '/../../config/bootstrap.php';

requireMethod('POST');

$data = requestData();

$name = clean($data['name'] ?? '');
$email = strtolower(trim($data['email'] ?? ''));
$password = $data['password'] ?? '';
$role = strtolower(trim($data['role'] ?? 'student'));
$enrollmentNo = clean($data['enrollment_no'] ?? '');
$department = clean($data['department'] ?? '');
$semester = clean($data['semester'] ?? '');

if ($name === '' || $email === '' || $password === '') {
    jsonResponse(false, 'Name, email and password are required.', [], 422);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(false, 'Please enter a valid email address.', [], 422);
}

if (strlen($password) < 8) {
    jsonResponse(false, 'Password must contain at least 8 characters.', [], 422);
}

if (!in_array($role, ['student', 'alumni'], true)) {
    jsonResponse(false, 'Invalid registration role.', [], 422);
}

$stmt = $pdo->prepare("
    SELECT id
    FROM users
    WHERE email = ?
    LIMIT 1
");

$stmt->execute([$email]);

if ($stmt->fetch()) {
    jsonResponse(false, 'An account with this email already exists.', [], 409);
}

$passwordHash = password_hash($password, PASSWORD_DEFAULT);

$stmt = $pdo->prepare("
    INSERT INTO users
    (
        name,
        email,
        password,
        role,
        enrollment_no,
        department,
        semester,
        status,
        created_at
    )
    VALUES
    (
        ?, ?, ?, ?, ?, ?, ?, 'active', NOW()
    )
");

$stmt->execute([
    $name,
    $email,
    $passwordHash,
    $role,
    $enrollmentNo ?: null,
    $department ?: null,
    $semester ?: null
]);

$userId = $pdo->lastInsertId();

jsonResponse(
    true,
    'Registration successful.',
    [
        'user_id' => (int)$userId
    ],
    201
);