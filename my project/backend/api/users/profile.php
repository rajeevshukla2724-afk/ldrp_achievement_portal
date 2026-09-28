<?php

require_once __DIR__ . '/../../config/bootstrap.php';

$user = requireLogin();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {

    $stmt = $pdo->prepare("
        SELECT
            id,
            name,
            email,
            role,
            enrollment_no,
            department,
            semester,
            status,
            created_at
        FROM users
        WHERE id = ?
        LIMIT 1
    ");

    $stmt->execute([$user['id']]);

    $profile = $stmt->fetch();

    if (!$profile) {
        jsonResponse(false, 'User profile not found.', [], 404);
    }

    jsonResponse(
        true,
        'Profile loaded successfully.',
        [
            'profile' => $profile
        ]
    );
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Invalid request method.', [], 405);
}

$data = requestData();

$name = clean($data['name'] ?? '');
$enrollmentNo = clean($data['enrollment_no'] ?? '');
$department = clean($data['department'] ?? '');
$semester = clean($data['semester'] ?? '');

if ($name === '') {
    jsonResponse(false, 'Name is required.', [], 422);
}

$stmt = $pdo->prepare("
    UPDATE users
    SET
        name = ?,
        enrollment_no = ?,
        department = ?,
        semester = ?
    WHERE id = ?
");

$stmt->execute([
    $name,
    $enrollmentNo ?: null,
    $department ?: null,
    $semester ?: null,
    $user['id']
]);

$_SESSION['user']['name'] = $name;
$_SESSION['user']['enrollment_no'] = $enrollmentNo ?: null;
$_SESSION['user']['department'] = $department ?: null;
$_SESSION['user']['semester'] = $semester ?: null;

jsonResponse(
    true,
    'Profile updated successfully.'
);