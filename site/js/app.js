// ============================================================================
// Point d'entrée des modules du Cahier (chargé par index.html, type="module").
//   compte.js → bouton « Compte » + connexion/inscription Firebase
//   acces.js  → 15 minutes gratuites puis accès illimité 4,99 € (Stripe)
// L'échec d'un module (CDN bloqué…) ne doit jamais casser le site lui-même.
// ============================================================================
import('./compte.js').catch((e) => console.warn('Module compte indisponible :', e));
import('./acces.js').catch((e) => console.warn('Module accès indisponible :', e));
