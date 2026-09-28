<?php

require_once __DIR__ . '/../../config/bootstrap.php';

requireMethod('POST');

$data = requestData();
$email = strtolower(trim($data['email'] ?? ''));

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(false, 'Please enter a valid email address.', [], 422);
}

/*
 * Do not reveal whether an email exists.
 * Reset is available to student/alumni accounts.
 */
$stmt = $pdo->prepare("
    SELECT id, name, email, role, status
    FROM users
    WHERE email = ?
      AND role IN ('student', 'alumni')
    LIMIT 1
");
$stmt->execute([$email]);
$user = $stmt->fetch();

if ($user && $user['status'] === 'active') {
    $pdo->prepare("DELETE FROM password_resets WHERE user_id = ?")->execute([$user['id']]);

    $token = bin2hex(random_bytes(32));
    $tokenHash = hash('sha256', $token);

    $stmt = $pdo->prepare("
        INSERT INTO password_resets (user_id, token_hash, expires_at)
        VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE))
    ");
    $stmt->execute([$user['id'], $tokenHash]);

    $resetUrl = APP_URL . '/?reset=' . urlencode($token);

    $subject = 'LDRP-ITR Achievement Portal - Password Reset';
    $message =
        "Hello {$user['name']},\n\n" .
        "A password reset was requested for your LDRP-ITR Achievement Portal account.\n\n" .
        "Open this link within 30 minutes to create a new password:\n" .
        $resetUrl . "\n\n" .
        "If you did not request this, you can ignore this email.\n\n" .
        "LDRP-ITR Achievement Portal";

    $headers = [
        'From: ' . MAIL_FROM,
        'Content-Type: text/plain; charset=UTF-8'
    ];

    $sent = @mail(
        $user['email'],
        $subject,
        $message,
        implode("\r\n", $headers)
    );

    /*
     * On local XAMPP, mail() may not be configured. The reset URL is written
     * to the PHP error log so the server owner can test the flow without
     * exposing it to the browser.
     */
    if (!$sent) {
        error_log('[LDRP PASSWORD RESET - configure SMTP/mail for production] ' . $resetUrl);
    }
}

/* Same response whether the email exists or not. */
jsonResponse(
    true,
    'If an active student or alumni account exists for that email, a password reset link has been sent.'
);
