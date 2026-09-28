<?php

require_once __DIR__ . '/../../config/bootstrap.php';

$user = requireRole(['mentor', 'admin']);

$data = requestData();

$achievementId = validId($data['achievement_id'] ?? null);
$status = strtolower(trim($data['status'] ?? ''));
$points = isset($data['points']) ? (int)$data['points'] : 0;
$rejectionReason = clean($data['rejection_reason'] ?? '');

if (!$achievementId) {
    jsonResponse(false, 'Invalid achievement ID.', [], 422);
}

if (!in_array($status, ['approved', 'rejected'], true)) {
    jsonResponse(false, 'Invalid status.', [], 422);
}

if ($status === 'approved') {
    if ($points < 0 || $points > 1000) {
        jsonResponse(false, 'Points must be between 0 and 1000.', [], 422);
    }
}

if ($status === 'rejected' && $rejectionReason === '') {
    jsonResponse(false, 'Rejection reason is required.', [], 422);
}

$stmt = $pdo->prepare("
    SELECT
        a.id,
        a.user_id,
        a.status
    FROM achievements a
    WHERE a.id = ?
    LIMIT 1
");

$stmt->execute([$achievementId]);

$achievement = $stmt->fetch();

if (!$achievement) {
    jsonResponse(false, 'Achievement not found.', [], 404);
}

if ($achievement['status'] !== 'pending') {
    jsonResponse(false, 'This achievement has already been reviewed.', [], 409);
}

if ($user['role'] === 'mentor') {

    $stmt = $pdo->prepare("
        SELECT id
        FROM mentor_assignments
        WHERE mentor_id = ?
          AND student_id = ?
          AND status = 'active'
        LIMIT 1
    ");

    $stmt->execute([
        $user['id'],
        $achievement['user_id']
    ]);

    if (!$stmt->fetch()) {
        jsonResponse(
            false,
            'You are not assigned to this student.',
            [],
            403
        );
    }
}

$stmt = $pdo->prepare("
    UPDATE achievements
    SET
        status = ?,
        points = ?,
        rejection_reason = ?,
        reviewed_by = ?,
        reviewed_at = NOW(),
        updated_at = NOW()
    WHERE id = ?
");

$stmt->execute([
    $status,
    $status === 'approved' ? $points : 0,
    $status === 'rejected' ? $rejectionReason : null,
    $user['id'],
    $achievementId
]);

jsonResponse(
    true,
    $status === 'approved'
        ? 'Achievement approved successfully.'
        : 'Achievement rejected successfully.'
);