<?php

require_once __DIR__ . '/../../config/bootstrap.php';

$admin = requireRole(['admin']);
requireMethod('POST');

$data          = requestData();
$achievementId = validId($data['achievement_id'] ?? null);

if (!$achievementId) {
    jsonResponse(false, 'Invalid achievement ID.', [], 422);
}

$stmt = $pdo->prepare('SELECT id, status, featured FROM achievements WHERE id = ? LIMIT 1');
$stmt->execute([$achievementId]);
$achievement = $stmt->fetch();

if (!$achievement) {
    jsonResponse(false, 'Achievement not found.', [], 404);
}
if ($achievement['status'] !== 'approved') {
    jsonResponse(false, 'Only approved achievements can be featured.', [], 422);
}

$newValue = (int)$achievement['featured'] === 1 ? 0 : 1;

$stmt = $pdo->prepare('UPDATE achievements SET featured = ?, updated_at = NOW() WHERE id = ?');
$stmt->execute([$newValue, $achievementId]);

jsonResponse(
    true,
    $newValue ? 'Achievement is now featured on the homepage.' : 'Achievement removed from featured.',
    ['achievement_id' => (int)$achievementId, 'featured' => $newValue]
);
