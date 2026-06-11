// ============================================================================
// Petit état partagé entre les modules (compte.js ↔ acces.js), sans framework.
// ============================================================================
export const etat = {
  user: null,                  // utilisateur Firebase connecté (ou null)
  premium: false,              // accès illimité actif (champ Firestore "premium")
  usedMs: 0,                   // temps gratuit déjà consommé (max appareil/compte)
  freeMs: 15 * 60 * 1000,      // durée de l'accès gratuit : 15 minutes
};

const abonnes = [];

/** Notifie tous les modules qu'une valeur de l'état a changé. */
export function publier() {
  abonnes.forEach((f) => { try { f(etat); } catch (e) { console.error(e); } });
}

/** S'abonne aux changements d'état (appelé immédiatement avec l'état courant). */
export function ecouter(f) {
  abonnes.push(f);
  try { f(etat); } catch (e) { console.error(e); }
}
