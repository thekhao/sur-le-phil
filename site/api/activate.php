<?php
// GET /api/activate.php?session_id=... — vérifie le paiement Stripe,
// pose le cookie d'accès si l'offre en donne un, puis redirige vers le remerciement.
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
  $meta  = $session['metadata'] ?? [];
  $acces = $meta['acces'] ?? '';
  if ($acces === 'full' || $acces === 'hour') {
    bp_set_paid($acces);
  }
  if (($meta['retour'] ?? '') === 'soutien') {
    header('Location: ' . SITE_URL . '/soutien.html?merci=1', true, 303);
  } else {
    header('Location: ' . SITE_URL . '/?paiement=ok&plan=' . ($meta['plan'] ?? ''), true, 303);
  }
} catch (Exception $e) {
  error_log('activate: ' . $e->getMessage());
  header('Location: ' . SITE_URL . '/?erreur=activation', true, 303);
}
