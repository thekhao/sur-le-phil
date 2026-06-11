<?php
// Fonctions partagées : cookies signés HMAC-SHA256. Aucune dépendance.
// Le paiement passe désormais par un Payment Link Stripe (voir README) :
// plus aucun appel à l'API Stripe côté serveur.
require __DIR__ . '/config.php';

function bp_sign(string $payload): string {
  return substr(hash_hmac('sha256', $payload, COOKIE_SECRET), 0, 32);
}
function bp_token(string $payload): string {
  return $payload . '.' . bp_sign($payload);
}
function bp_verify(?string $token): ?string {
  if (!$token) return null;
  $i = strrpos($token, '.');
  if ($i === false || $i === 0) return null;
  $payload = substr($token, 0, $i);
  $sig = substr($token, $i + 1);
  return hash_equals(bp_sign($payload), $sig) ? $payload : null;
}
function bp_setcookie(string $name, string $value, int $maxAge): void {
  setcookie($name, $value, [
    'expires'  => time() + $maxAge,
    'path'     => '/',
    'secure'   => true,
    'httponly' => true,
    'samesite' => 'Lax',
  ]);
}
