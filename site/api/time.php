<?php
// Compteur de temps gratuit côté serveur (par appareil/navigateur).
//   GET  /api/time.php                    → {"usedMs": N}
//   POST /api/time.php  {"usedMs": N}     → enregistre max(serveur, client), répond {"usedMs": N}
// Le total vit dans un cookie httpOnly signé (HMAC) : le visiteur ne peut ni le
// lire ni le falsifier en JS. Il ne peut que croître (jamais redescendre).
// Effacer ses cookies remet ce compteur-là à zéro — c'est pour ça que le temps
// est AUSSI suivi par compte dans Firestore (voir site/js/acces.js) : l'accès
// gratuit consommé est le MAX des deux sources.
require __DIR__ . '/common.php';

header('Content-Type: application/json');
header('Cache-Control: no-store');

const COOKIE_TEMPS = 'slp_temps';
const PLAFOND_MS   = 86400000; // garde-fou : 24 h, aucune valeur client au-delà

$usedMs = 0;
$payload = bp_verify($_COOKIE[COOKIE_TEMPS] ?? null);
if ($payload !== null) {
  $usedMs = max(0, (int)(explode(':', $payload)[1] ?? 0));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $body = json_decode(file_get_contents('php://input') ?: '', true);
  $client = (int)($body['usedMs'] ?? 0);
  $client = max(0, min($client, PLAFOND_MS));
  if ($client > $usedMs) {
    $usedMs = $client;
    bp_setcookie(COOKIE_TEMPS, bp_token('t:' . $usedMs), 365 * 24 * 3600);
  }
}

echo json_encode(['usedMs' => $usedMs]);
