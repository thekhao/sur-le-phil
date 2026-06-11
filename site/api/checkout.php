<?php
// GET /api/checkout.php?offre=cafe|credits|illimite (page soutien)
//  ou ?plan=hour|full (ancien paywall) — crée une session Stripe Checkout et redirige.
require __DIR__ . '/common.php';

$plans = [
  // Offres de la page soutien
  'cafe'     => ['amount' => 100, 'name' => "Le Cahier de Philo — L'Obole (un café)",            'acces' => '',     'retour' => 'soutien'],
  'credits'  => ['amount' => 199, 'name' => 'Le Cahier de Philo — Les Drachmes (crédits)',        'acces' => '',     'retour' => 'soutien'],
  'illimite' => ['amount' => 499, 'name' => 'Le Cahier de Philo — Le Banquet (accès illimité)',   'acces' => 'full', 'retour' => 'soutien'],
  // Anciennes offres (compatibilité avec le paywall en mode payant)
  'hour'     => ['amount' => 100, 'name' => 'Le Cahier de Philo — Accès 1 heure',                 'acces' => 'hour', 'retour' => 'accueil'],
  'full'     => ['amount' => 499, 'name' => 'Le Cahier de Philo — Accès illimité',                'acces' => 'full', 'retour' => 'accueil'],
];
$plan = $_GET['offre'] ?? ($_GET['plan'] ?? '');
if (!isset($plans[$plan])) {
  header('Location: ' . SITE_URL . '/?erreur=plan-inconnu', true, 303); exit;
}
$annulation = $plans[$plan]['retour'] === 'soutien'
  ? SITE_URL . '/soutien.html'
  : SITE_URL . '/?paiement=annule';
if (STRIPE_SECRET_KEY === '' || strpos(STRIPE_SECRET_KEY, 'A_REMPLACER') !== false) {
  header('Location: ' . ($plans[$plan]['retour'] === 'soutien'
    ? SITE_URL . '/soutien.html?erreur=paiement-non-configure'
    : SITE_URL . '/?erreur=paiement-non-configure'), true, 303); exit;
}
try {
  $session = stripe_request('POST', '/v1/checkout/sessions', [
    'mode' => 'payment',
    'line_items[0][quantity]' => 1,
    'line_items[0][price_data][currency]' => 'eur',
    'line_items[0][price_data][unit_amount]' => $plans[$plan]['amount'],
    'line_items[0][price_data][product_data][name]' => $plans[$plan]['name'],
    'metadata[plan]'   => $plan,
    'metadata[acces]'  => $plans[$plan]['acces'],
    'metadata[retour]' => $plans[$plan]['retour'],
    'success_url' => SITE_URL . '/api/activate.php?session_id={CHECKOUT_SESSION_ID}',
    'cancel_url'  => $annulation,
  ]);
  header('Location: ' . $session['url'], true, 303);
} catch (Exception $e) {
  error_log('checkout: ' . $e->getMessage());
  header('Location: ' . SITE_URL . '/?erreur=stripe', true, 303);
}
