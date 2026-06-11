<?php
// GET /api/activate.php?session_id=... — vérifie le paiement Stripe puis pose le cookie d'accès.
require __DIR__ . '/common.php';

$id = $_GET['session_id'] ?? '';
if ($id === '') {
  header('Location: ' . SITE_URL . '/?erreur=activation', true, 303); exit;
}
try {
  $session = stripe_request('GET', '/v1/checkout/sessions/' . rawurlencode($id));
  if (($session['payment_status'] ?? '') !== 'paid') {
    header('Location: ' . SITE_URL . '/?erreur=paiement-incomplet', true, 303); exit;
  }
  $plan = (($session['metadata']['plan'] ?? '') === 'full') ? 'full' : 'hour';
  bp_set_paid($plan);
  header('Location: ' . SITE_URL . '/?paiement=ok&plan=' . $plan, true, 303);
} catch (Exception $e) {
  error_log('activate: ' . $e->getMessage());
  header('Location: ' . SITE_URL . '/?erreur=activation', true, 303);
}
