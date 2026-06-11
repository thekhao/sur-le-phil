<?php
// GET /api/status.php — état d'accès du visiteur (essai, payé, expiré).
require __DIR__ . '/common.php';
header('Content-Type: application/json');
header('Cache-Control: no-store');
echo json_encode(bp_access_state());
