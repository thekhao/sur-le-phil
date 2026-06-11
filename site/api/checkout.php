<?php
// GET /api/checkout.php?plan=hour|full — crée une session Stripe Checkout et redirige.
require __DIR__ . '/common.php';

$plans = [
  'hour' => ['amount' => 100, 'name' => 'Le Cahier de Philo — Accès 1 heure'],
  'full' => ['amount' => 500, 'name' => 'Le Cahier de Philo — Accès illimité'],
];
$plan = $_GET['plan'] ?? '';
if (!isset($plans[$plan])) {
  header('Location: ' . SITE_URL . '/?erreur=plan-inconnu', true, 303); exit;
}
if (STRIPE_SECRET_KEY === '' || strpos(STRIPE_SECRET_KEY, 'A_REMPLACER') !== false) {
  header('Location: ' . SITE_URL . '/?erreur=paiement-non-configure', true, 303); exit;
}
try {
  $session = stripe_request('POST', '/v1/checkout/sessions', [
    'mode' => 'payment',
    'line_items[0][quantity]' => 1,
    'line_items[0][price_data][currency]' => 'eur',
    'line_items[0][price_data][unit_amount]' => $plans[$plan]['amount'],
    'line_items[0][price_data][product_data][name]' => $plans[$plan]['name'],
    'metadata[plan]' => $plan,
    'success_url' => SITE_URL . '/api/activate.php?session_id={CHECKOUT_SESSION_ID}',
    'cancel_url'  => SITE_URL . '/?paiement=annule',
  ]);
  header('Location: ' . $session['url'], true, 303);
} catch (Exception $e) {
  error_log('checkout: ' . $e->getMessage());
  header('Location: ' . SITE_URL . '/?erreur=stripe', true, 303);
}
