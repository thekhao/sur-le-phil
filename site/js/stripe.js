// ============================================================================
// Paiement Stripe — via Payment Link / Buy Button (AUCUNE clé secrète requise).
// Le bouton et le lien pointent vers l'offre unique : accès illimité à 4,99 €.
// La clé "publishable" (pk_live_…) est publique par conception.
//
// ⚠ Limite assumée : sans clé secrète Stripe, le site ne peut pas vérifier un
// paiement automatiquement. L'activation de l'accès illimité est manuelle :
// le propriétaire voit le paiement (email + client_reference_id = uid Firebase)
// dans le Dashboard Stripe, puis active le compte depuis l'onglet Admin.
// ============================================================================
export const LIEN_PAIEMENT = 'https://buy.stripe.com/3cI8wQ0h34hd09K8Yjcwg02';
export const BUY_BUTTON_ID = 'buy_btn_1ThEX6JPEJRv5KYkZLT93y1q';
export const CLE_PUBLIABLE = 'pk_live_d8CYg8Vl2JsKv1mLWn3O7xqr';

/** Charge le script officiel du Buy Button une seule fois, à la demande. */
export function chargerBuyButton() {
  if (document.querySelector('script[src*="js.stripe.com/v3/buy-button"]')) return;
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://js.stripe.com/v3/buy-button.js';
  document.head.appendChild(s);
}

/** URL du Payment Link, enrichie de l'identité du compte si connecté
    (l'uid apparaît alors dans le Dashboard Stripe → activation facile). */
export function urlPaiement(user) {
  const u = new URL(LIEN_PAIEMENT);
  if (user) {
    u.searchParams.set('client_reference_id', user.uid);
    if (user.email) u.searchParams.set('prefilled_email', user.email);
  }
  return u.toString();
}

/** Bloc d'achat : Buy Button Stripe + lien de secours (si le script est bloqué). */
export function blocAchat(user) {
  chargerBuyButton();
  const div = document.createElement('div');
  div.className = 'slp-achat';
  const bouton = document.createElement('stripe-buy-button');
  bouton.setAttribute('buy-button-id', BUY_BUTTON_ID);
  bouton.setAttribute('publishable-key', CLE_PUBLIABLE);
  if (user) {
    bouton.setAttribute('client-reference-id', user.uid);
    if (user.email) bouton.setAttribute('customer-email', user.email);
  }
  div.appendChild(bouton);
  const secours = document.createElement('p');
  secours.className = 'slp-achat-secours';
  secours.innerHTML = 'Le bouton ne s’affiche pas ? <a href="' + urlPaiement(user) +
    '" target="_blank" rel="noopener">Payer directement sur Stripe →</a>';
  div.appendChild(secours);
  return div;
}
