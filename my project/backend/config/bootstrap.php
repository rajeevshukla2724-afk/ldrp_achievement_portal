<?php
/**
 * Shared bootstrap for every API endpoint:
 * session, JSON helpers, auth guards, validation, file upload.
 */

ini_set('display_errors', '0');
error_reporting(E_ALL);

/*
 * Change APP_URL when deploying the portal to a different domain/path.
 * MAIL_FROM must be an address accepted by your hosting mail server.
 */
define('APP_URL', 'https://ldrp-achievement.free.je');
define('MAIL_FROM', 'no-reply@ldrp.edu');

session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

header('Content-Type: application/json; charset=utf-8');

function jsonResponse($success, $message = '', $data = [], $status = 200)
{
    http_response_code($status);
    echo json_encode(
        ['success' => (bool)$success, 'message' => $message, 'data' => $data],
        JSON_UNESCAPED_UNICODE
    );
    exit;
}

// Any uncaught error (bad SQL, bad date, ...) becomes a clean JSON 500.
set_exception_handler(function ($e) {
    error_log('[LDRP] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error. Please try again.', 'data' => []]);
    exit;
});

require_once __DIR__ . '/database.php';

function requestData()
{
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (stripos($contentType, 'application/json') !== false) {
        $data = json_decode(file_get_contents('php://input'), true);
        return is_array($data) ? $data : [];
    }
    return $_POST;
}

function requireMethod($method)
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== $method) {
        jsonResponse(false, 'Invalid request method.', [], 405);
    }
}

/**
 * Logged-in user, re-read from the database on every request so that
 * blocking a user or changing a role takes effect immediately.
 */
function requireLogin()
{
    global $pdo;

    if (!isset($_SESSION['user']['id'])) {
        jsonResponse(false, 'Authentication required.', [], 401);
    }

    $stmt = $pdo->prepare(
        'SELECT id, name, email, role, enrollment_no, department, semester, status
         FROM users WHERE id = ? LIMIT 1'
    );
    $stmt->execute([$_SESSION['user']['id']]);
    $user = $stmt->fetch();

    if (!$user || $user['status'] !== 'active') {
        $_SESSION = [];
        session_destroy();
        jsonResponse(false, 'Your account is blocked or no longer exists.', [], 401);
    }

    $_SESSION['user'] = $user;
    return $user;
}

function requireRole($roles)
{
    $user = requireLogin();
    if (!is_array($roles)) {
        $roles = [$roles];
    }
    if (!in_array($user['role'], $roles, true)) {
        jsonResponse(false, 'You do not have permission to perform this action.', [], 403);
    }
    return $user;
}

/**
 * Trim only. Text is stored raw and escaped by the frontend when rendered,
 * so "O'Brien" or "R&D" are never double-escaped.
 */
function clean($value)
{
    return $value === null ? '' : trim((string)$value);
}

function validId($value)
{
    return filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
}

function validDate($value)
{
    $d = DateTime::createFromFormat('Y-m-d', (string)$value);
    return $d && $d->format('Y-m-d') === $value;
}

function uploadCertificate($file)
{
    if (!isset($file) || $file['error'] === UPLOAD_ERR_NO_FILE) {
        return null;
    }
    if ($file['error'] !== UPLOAD_ERR_OK) {
        jsonResponse(false, 'Certificate upload failed.', [], 400);
    }
    if ($file['size'] > 5 * 1024 * 1024) {
        jsonResponse(false, 'Certificate must be less than 5 MB.', [], 400);
    }

    $finfo    = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    $extensionMap = [
        'application/pdf' => 'pdf',
        'image/jpeg'      => 'jpg',
        'image/png'       => 'png',
    ];
    if (!isset($extensionMap[$mimeType])) {
        jsonResponse(false, 'Only PDF, JPG and PNG certificates are allowed.', [], 400);
    }

    $dir = dirname(__DIR__) . '/uploads/certificates/';
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }

    $filename = bin2hex(random_bytes(16)) . '.' . $extensionMap[$mimeType];
    if (!move_uploaded_file($file['tmp_name'], $dir . $filename)) {
        jsonResponse(false, 'Unable to save certificate.', [], 500);
    }

    return 'uploads/certificates/' . $filename;
}
