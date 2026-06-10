<?php
// Fonctions partagées : cookies signés (HMAC) + client Stripe minimal. Aucune dépendance.
require __DIR__ . '/config.php';

const TRIAL_S = 600;        // essai gratuit : 10 min
const HOUR_S  = 3600;       // accès 1 € : 1 h
const FULL_S  = 315360000;  // accès 5 € : "illimité" (10 ans)

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
// État d'accès du visiteur ; pose le cookie d'essai pour un nouveau visiteur.
function bp_access_state(): array {
  $now = time();
  $paid = bp_verify($_COOKIE['bp_access'] ?? null);
  if ($paid !== null) {
    $parts = explode(':', $paid);
    $plan = $parts[0] ?? '';
    $exp  = (int)($parts[1] ?? 0);
    if ($exp > $now) {
      return ['access' => 'paid', 'plan' => $plan,
              'remainingMs' => $plan === 'full' ? null : ($exp - $now) * 1000];
    }
  }
  $trial = bp_verify($_COOKIE['bp_trial'] ?? null);
  if ($trial !== null) {
    $start = (int)(explode(':', $trial)[1] ?? 0);
    $elapsed = $now - $start;
    if ($elapsed < TRIAL_S) {
      return ['access' => 'trial', 'plan' => null, 'remainingMs' => (TRIAL_S - $elapsed) * 1000];
    }
    return ['access' => 'none', 'plan' => null, 'remainingMs' => 0];
  }
  bp_setcookie('bp_trial', bp_token('trial:' . $now), 90 * 24 * 3600);
  return ['access' => 'trial', 'plan' => null, 'remainingMs' => TRIAL_S * 1000];
}
function bp_set_paid(string $plan): void {
  $dur = $plan === 'full' ? FULL_S : HOUR_S;
  bp_setcookie('bp_access', bp_token($plan . ':' . (time() + $dur)), $dur);
}
function stripe_request(string $method, string $path, array $params = []): array {
  $ch = curl_init('https://api.stripe.com' . $path);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . STRIPE_SECRET_KEY],
    CURLOPT_TIMEOUT        => 20,
  ]);
  if ($method === 'POST') {
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
  }
  $body = curl_exec($ch);
  $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
  curl_close($ch);
  $data = json_decode($body !== false ? $body : '', true);
  if ($status >= 400 || !is_array($data)) {
    throw new Exception('Stripe ' . $path . ' HTTP ' . $status);
  }
  return $data;
}
