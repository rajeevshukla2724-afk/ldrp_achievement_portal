<?php

require_once __DIR__ . '/../../config/bootstrap.php';

// requireLogin() re-reads the user from the database (blocked users are rejected).
$user = requireLogin();

jsonResponse(true, 'Authenticated user.', $user);
