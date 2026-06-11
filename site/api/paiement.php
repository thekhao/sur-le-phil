<?php
// Vérification automatique d'un paiement Stripe (accès illimité 4,99 €).
//   GET /api/paiement.php?session_id=cs_...        → vérifie CETTE session (retour de merci.html)
//   GET /api/paiement.php?uid=...&email=...        → cherche un paiement correspondant au compte
// Réponse : {"paye":bool,"configure":bool}
//
// Nécessite une clé RESTREINTE Stripe (lecture seule des sessions Checkout) dans
// config.php : STRIPE_RESTRICTED_KEY (secret GitHub du même nom au déploiement).
// Sans clé : {"configure":false} et le site retombe sur l'activation manuelle (Admin).
//
// Quand un paiement est confirmé, un cookie httpOnly signé « slp_premium » est
// posé (10 ans) : l'appareil reste débloqué sans réinterroger Stripe. Le champ
// Firestore « premium » (activé via l'onglet Admin) reste la source durable
// rattachée au compte, valable sur tous les appareils.
require __DIR__ . '/common.php';

header('Content-Type: application/json');
header('Cache-Control: no-store');

const PRIX_CENTIMES = 499; // ne reconnaît que l'offre du Cahier (le compte Stripe peut servir à autre chose)

function repondre(bool $paye, bool $configure): void {
  echo json_encode(['paye' => $paye, 'configure' => $configure]);
  exit;
}

// Déjà validé sur cet appareil ?
$cookie = bp_verify($_COOKIE['slp_premium'] ?? null);
if ($cookie !== null && strpos($cookie, 'premium:') === 0) {
  repondre(true, true);
}

$cle = defined('STRIPE_RESTRICTED_KEY') ? STRIPE_RESTRICTED_KEY : '';
if ($cle === '' || strpos($cle, 'A_REMPLACER') !== false) {
  repondre(false, false);
}

function stripe_get(string $cle, string $path): ?array {
  $ch = curl_init('https://api.stripe.com' . $path);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $cle],
    CURLOPT_TIMEOUT        => 15,
  ]);
  $corps = curl_exec($ch);
  $statut = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
  curl_close($ch);
  $data = json_decode($corps !== false ? $corps : '', true);
  return ($statut < 400 && is_array($data)) ? $data : null;
}

function session_valide(array $s, ?string $uid, ?string $email): bool {
  if (($s['payment_status'] ?? '') !== 'paid') return false;
  if ((int)($s['amount_total'] ?? 0) !== PRIX_CENTIMES) return false;
  if ($uid === null && $email === null) return true; // mode session_id : la session suffit
  if ($uid !== null && ($s['client_reference_id'] ?? '') === $uid) return true;
  $emailSession = strtolower($s['customer_details']['email'] ?? ($s['customer_email'] ?? ''));
  return $email !== null && $emailSession !== '' && $emailSession === $email;
}

function accorder(): void {
  bp_setcookie('slp_premium', bp_token('premium:' . time()), 10 * 365 * 24 * 3600);
  repondre(true, true);
}

// --- Mode 1 : retour de paiement avec l'identifiant de session (merci.html) ---
$sessionId = $_GET['session_id'] ?? '';
if ($sessionId !== '' && preg_match('/^cs_[A-Za-z0-9_]+$/', $sessionId)) {
  $s = stripe_get($cle, '/v1/checkout/sessions/' . rawurlencode($sessionId));
  if ($s !== null && session_valide($s, null, null)) accorder();
  repondre(false, true);
}

// --- Mode 2 : recherche par compte (uid Firebase et/ou email du paiement) ---
$uid = $_GET['uid'] ?? '';
$uid = preg_match('/^[A-Za-z0-9_-]{10,128}$/', $uid) ? $uid : null;
$email = strtolower(trim($_GET['email'] ?? ''));
$email = filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : null;
if ($uid === null && $email === null) repondre(false, true);

// Anti-rafale : un parcours des sessions Stripe par appareil par minute maximum.
$dernier = bp_verify($_COOKIE['slp_pmchk'] ?? null);
if ($dernier !== null && time() - (int)(explode(':', $dernier)[1] ?? 0) < 60) {
  repondre(false, true);
}
bp_setcookie('slp_pmchk', bp_token('chk:' . time()), 3600);

$apres = '';
for ($page = 0; $page < 3; $page++) { // jusqu'à 300 sessions récentes
  $liste = stripe_get($cle, '/v1/checkout/sessions?limit=100' . ($apres ? '&starting_after=' . $apres : ''));
  if ($liste === null || empty($liste['data'])) break;
  foreach ($liste['data'] as $s) {
    if (session_valide($s, $uid, $email)) accorder();
  }
  if (empty($liste['has_more'])) break;
  $apres = end($liste['data'])['id'];
}
repondre(false, true);
