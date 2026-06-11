// ============================================================================
// Initialisation Firebase — app, authentification, Firestore, analytics.
// Chargé en module ES depuis le CDN officiel (pas de build, pas de npm).
// La configuration ci-dessous est PUBLIQUE par conception (Firebase l'expose
// à tous les visiteurs) : la sécurité vient des règles Firestore, pas du secret.
// ============================================================================
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { getAnalytics, isSupported } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-analytics.js';

export const firebaseConfig = {
  apiKey: 'AIzaSyADevpsD3EyjnT_GKa9lqUsakiKkK8-5es',
  authDomain: 'sur-le-phil.firebaseapp.com',
  projectId: 'sur-le-phil',
  storageBucket: 'sur-le-phil.firebasestorage.app',
  messagingSenderId: '210241822399',
  appId: '1:210241822399:web:2e138ace04f8885457b00a',
  measurementId: 'G-N13CNMSCLQ',
};

// Email du propriétaire du site : donne accès à l'onglet « Admin » (activation
// des accès illimités après paiement). DOIT être identique à l'email admin
// déclaré dans firestore.rules. Vide = onglet Admin désactivé.
export const ADMIN_EMAIL = '';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
auth.languageCode = 'fr'; // emails Firebase (vérification, mot de passe) en français

// Analytics : optionnel, ne doit jamais bloquer le site (adblock, vieux navigateurs…)
isSupported().then((ok) => { if (ok) getAnalytics(app); }).catch(() => {});
