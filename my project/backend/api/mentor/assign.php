<?php

require_once __DIR__ . '/../../config/bootstrap.php';

requireRole(['admin']);

$data = requestData();

$mentorId = validId($data['mentor_id'] ?? null);
$studentId = validId($data['student_id'] ?? null);

if (!$mentorId || !$studentId) {
    jsonResponse(
        false,
        'Mentor ID and student ID are required.',
        [],
        422
    );
}

if ($mentorId === $studentId) {
    jsonResponse(
        false,
        'A user cannot be assigned as their own mentor.',
        [],
        422
    );
}

$stmt = $pdo->prepare("
    SELECT id, name, role, status
    FROM users
    WHERE id = ?
    LIMIT 1
");

$stmt->execute([$mentorId]);

$mentor = $stmt->fetch();

if (!$mentor) {
    jsonResponse(
        false,
        'Mentor not found.',
        [],
        404
    );
}

if ($mentor['role'] !== 'mentor') {
    jsonResponse(
        false,
        'Selected user is not a mentor.',
        [],
        422
    );
}

if ($mentor['status'] !== 'active') {
    jsonResponse(
        false,
        'Selected mentor is not active.',
        [],
        422
    );
}

$stmt = $pdo->prepare("
    SELECT id, name, role, status
    FROM users
    WHERE id = ?
    LIMIT 1
");

$stmt->execute([$studentId]);

$student = $stmt->fetch();

if (!$student) {
    jsonResponse(
        false,
        'Student or alumni not found.',
        [],
        404
    );
}

if (!in_array($student['role'], ['student', 'alumni'], true)) {
    jsonResponse(
        false,
        'Selected user must be a student or alumni.',
        [],
        422
    );
}

if ($student['status'] !== 'active') {
    jsonResponse(
        false,
        'Selected student/alumni is not active.',
        [],
        422
    );
}

$stmt = $pdo->prepare("
    SELECT id, mentor_id, status
    FROM mentor_assignments
    WHERE student_id = ?
    LIMIT 1
");

$stmt->execute([$studentId]);

$existingAssignment = $stmt->fetch();

if ($existingAssignment) {

    if (
        (int)$existingAssignment['mentor_id'] === (int)$mentorId &&
        $existingAssignment['status'] === 'active'
    ) {
        jsonResponse(
            false,
            'This mentor is already assigned to this student.',
            [],
            409
        );
    }

    $stmt = $pdo->prepare("
        UPDATE mentor_assignments
        SET
            mentor_id = ?,
            status = 'active',
            updated_at = NOW()
        WHERE id = ?
    ");

    $stmt->execute([
        $mentorId,
        $existingAssignment['id']
    ]);

    jsonResponse(
        true,
        'Mentor assignment updated successfully.',
        [
            'assignment_id' => (int)$existingAssignment['id'],
            'mentor_id' => (int)$mentorId,
            'student_id' => (int)$studentId
        ]
    );
}

$stmt = $pdo->prepare("
    INSERT INTO mentor_assignments
    (
        mentor_id,
        student_id,
        status,
        created_at,
        updated_at
    )
    VALUES
    (
        ?, ?, 'active', NOW(), NOW()
    )
");

$stmt->execute([
    $mentorId,
    $studentId
]);

$assignmentId = $pdo->lastInsertId();

jsonResponse(
    true,
    'Mentor assigned successfully.',
    [
        'assignment_id' => (int)$assignmentId,
        'mentor_id' => (int)$mentorId,
        'student_id' => (int)$studentId
    ],
    201
);