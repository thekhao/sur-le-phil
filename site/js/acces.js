// ============================================================================
// Accès au Cahier — 15 minutes gratuites, puis accès illimité (4,99 €).
//
// Le temps de présence sur la page (onglet visible uniquement) est compté et
// conservé dans TROIS endroits ; le temps consommé est le MAX des trois :
//   1. localStorage             → persiste sur l'appareil
//   2. cookie signé httpOnly    → via /api/time.php, infalsifiable en JS
//   3. Firestore users/{uid}    → suit le COMPTE d'un appareil à l'autre
// Effacer ses cookies ne suffit donc pas si on est connecté, et changer
// d'appareil ne remet pas le compteur à zéro non plus.
//
// Le champ Firestore "premium" (activé par l'admin après paiement) débloque
// tout, en direct (onSnapshot) — pas besoin de recharger la page.
// ============================================================================
import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {
  doc, onSnapshot, setDoc, updateDoc, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { etat, publier } from './etat.js';
import { blocAchat } from './stripe.js';
import { ouvrirCompte } from './compte.js';

const CLE_LOCALE = 'slp_temps_ms';
const API_TEMPS = '/api/time.php';

let usedMs = 0;
let secondes = 0;            // ticks écoulés (pour cadencer les synchros)
let dernierServeur = 0;      // dernière valeur envoyée au cookie serveur
let dernierFirestore = -1;   // dernière valeur connue côté Firestore
let stopSnapshot = null;
let badge = null;
let verrou = null;

// ---------- Styles (palette ardoise/craie/papier du site) ----------
const css = `
#slp-badge{position:fixed;bottom:14px;left:14px;z-index:99990;font-family:Archivo,sans-serif;
  font-size:.8rem;font-weight:600;background:#243832;color:#F7F4EA;border:1px dashed rgba(247,244,234,.5);
  border-radius:999px;padding:.5rem 1rem;box-shadow:0 4px 14px rgba(0,0,0,.25);cursor:pointer}
#slp-badge:hover{background:#1A2A25}
#slp-badge strong{font-family:Caveat,cursive;font-size:1.15rem;color:#E5B43C;margin-left:.35rem}
#slp-verrou{position:fixed;inset:0;z-index:99998;background:rgba(26,42,37,.6);backdrop-filter:blur(8px);
  -webkit-backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:1rem;overflow:auto}
#slp-verrou .slp-vcarte{background:#FDFCF7;color:#1F2D3D;max-width:480px;width:100%;border-radius:12px;
  padding:1.9rem 1.7rem;box-shadow:0 18px 50px rgba(0,0,0,.35);font-family:Spectral,Georgia,serif;text-align:center}
#slp-verrou h2{font-family:Caveat,cursive;font-size:2.2rem;line-height:1.1;color:#243832;margin:0 0 .4rem}
#slp-verrou p{font-size:.95rem;color:#5A6B7E;margin:0 0 1rem}
#slp-verrou .slp-vbtn{display:block;width:100%;text-align:center;font-family:Archivo,sans-serif;font-weight:700;
  font-size:.88rem;background:#243832;color:#F7F4EA;border:none;border-radius:8px;padding:.7rem 1.1rem;
  cursor:pointer;box-sizing:border-box;margin-bottom:.6rem}
#slp-verrou .slp-vbtn:hover{background:#1A2A25}
#slp-verrou .slp-vnote{font-family:Archivo,sans-serif;font-size:.72rem;color:#8A92A0;margin-top:.8rem}
#slp-verrou .slp-vnote a{color:#8A92A0}
#slp-toast{position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:100001;background:#3E7A5E;color:#fff;
  font-family:Archivo,sans-serif;font-size:.85rem;font-weight:600;border-radius:8px;padding:.7rem 1.2rem;
  box-shadow:0 6px 18px rgba(0,0,0,.3)}
@media (max-width:380px){#slp-badge{bottom:12px;left:12px}}
`;

// ---------- Aides ----------
function fmt(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}
function toast(msg) {
  const t = document.createElement('div');
  t.id = 'slp-toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 6000);
}
function majUsed(valeur) {
  if (valeur > usedMs) {
    usedMs = valeur;
    try { localStorage.setItem(CLE_LOCALE, String(usedMs)); } catch (e) {}
  }
  etat.usedMs = usedMs;
}

// ---------- Badge flottant (bas gauche — la pastille musique occupe le bas droit) ----------
function majBadge() {
  if (etat.premium) {
    if (badge) {
      badge.innerHTML = '✓ Accès illimité';
      setTimeout(() => { if (badge) { badge.remove(); badge = null; } }, 6000);
    }
    return;
  }
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'slp-badge';
    badge.title = 'Temps gratuit restant — clique pour gérer ton accès';
    badge.addEventListener('click', () => ouvrirCompte('acces'));
    document.body.appendChild(badge);
  }
  badge.innerHTML = '⏳ Gratuit<strong>' + fmt(etat.freeMs - usedMs) + '</strong>';
}

// ---------- Synchronisation serveur (cookie signé httpOnly, par appareil) ----------
function lireServeur() {
  fetch(API_TEMPS, { credentials: 'same-origin' })
    .then((r) => r.json())
    .then((d) => { majUsed(d.usedMs | 0); verifierVerrou(); })
    .catch(() => {});
}
function ecrireServeur(fiable) {
  if (usedMs <= dernierServeur) return;
  dernierServeur = usedMs;
  const corps = JSON.stringify({ usedMs });
  if (fiable && navigator.sendBeacon) {
    navigator.sendBeacon(API_TEMPS, new Blob([corps], { type: 'application/json' }));
    return;
  }
  fetch(API_TEMPS, { method: 'POST', credentials: 'same-origin', body: corps, keepalive: true }).catch(() => {});
}

// ---------- Synchronisation Firestore (par compte) ----------
function suivreCompte(user) {
  if (stopSnapshot) { stopSnapshot(); stopSnapshot = null; }
  dernierFirestore = -1;
  // Connexion/déconnexion pendant le blocage : on reconstruit l'écran
  // (bouton d'achat rattaché au compte, plus d'invite à créer un compte).
  if (verrou) { deverrouiller(); verifierVerrou(); }
  if (!user) { etat.premium = false; publier(); verifierVerrou(); return; }
  const ref = doc(db, 'users', user.uid);
  stopSnapshot = onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      // Première connexion : création de la fiche (premium doit être false — règles Firestore)
      setDoc(ref, {
        email: (user.email || '').toLowerCase(),
        nom: user.displayName || '',
        usedMs,
        premium: false,
        creeLe: serverTimestamp(),
        majLe: serverTimestamp(),
      }).catch((e) => console.warn('Firestore (création fiche) :', e && e.code));
      return;
    }
    const d = snap.data();
    dernierFirestore = d.usedMs | 0;
    majUsed(dernierFirestore);
    const premiumAvant = etat.premium;
    etat.premium = !!d.premium;
    publier();
    if (etat.premium && !premiumAvant) {
      deverrouiller();
      toast('✓ Accès illimité activé — merci infiniment ! ☕');
    }
    verifierVerrou();
    majBadge();
  }, (e) => console.warn('Firestore (lecture fiche) :', e && e.code));
}
function ecrireFirestore() {
  const user = etat.user;
  if (!user || dernierFirestore < 0 || usedMs <= dernierFirestore) return;
  dernierFirestore = usedMs;
  updateDoc(doc(db, 'users', user.uid), { usedMs, majLe: serverTimestamp() })
    .catch((e) => console.warn('Firestore (temps) :', e && e.code));
}

// ---------- Verrouillage ----------
function verifierVerrou() {
  if (!etat.premium && usedMs >= etat.freeMs) verrouiller();
}
function verrouiller() {
  if (verrou || etat.premium) return;
  if (badge) { badge.remove(); badge = null; }
  verrou = document.createElement('div');
  verrou.id = 'slp-verrou';
  const carte = document.createElement('div');
  carte.className = 'slp-vcarte';
  carte.innerHTML =
    '<h2>Tes 15 minutes gratuites sont écoulées</h2>' +
    '<p>Le Cahier complet — notions, méthode, quiz, annales — reste à portée de main : ' +
    'l’<strong>accès illimité</strong> est à <strong>4,99 €</strong>, une fois, pour toujours. Pas d’abonnement.</p>';
  if (!etat.user) {
    carte.innerHTML +=
      '<p style="color:#1F2D3D">💡 <strong>Crée ton compte d’abord</strong> (gratuit) : c’est lui qui reçoit l’accès après le paiement.</p>';
    const btnCompte = document.createElement('button');
    btnCompte.className = 'slp-vbtn';
    btnCompte.textContent = 'Créer un compte / me connecter';
    btnCompte.addEventListener('click', () => ouvrirCompte('connexion'));
    carte.appendChild(btnCompte);
  }
  carte.appendChild(blocAchat(etat.user));
  const note = document.createElement('p');
  note.className = 'slp-vnote';
  note.innerHTML = 'Paie avec le même email que ton compte : l’accès est activé dessus sous 24 h max. ' +
    'Déjà payé ? Connecte-toi avec cet email.<br>' +
    '<a href="/mentions-legales.html">Mentions légales &amp; CGV</a>';
  carte.appendChild(note);
  verrou.appendChild(carte);
  document.body.appendChild(verrou);
  document.body.style.overflow = 'hidden';
  ecrireServeur(false);
  ecrireFirestore();
}
function deverrouiller() {
  if (!verrou) return;
  verrou.remove();
  verrou = null;
  document.body.style.overflow = '';
}

// ---------- Boucle principale : 1 tick par seconde quand l'onglet est visible ----------
function tick() {
  if (document.hidden || verrou || etat.premium) return;
  majUsed(usedMs + 1000);
  secondes++;
  majBadge();
  if (secondes % 30 === 0) ecrireServeur(false);
  if (secondes % 60 === 0) ecrireFirestore();
  verifierVerrou();
}

// ---------- Démarrage ----------
function boot() {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  try { usedMs = parseInt(localStorage.getItem(CLE_LOCALE) || '0', 10) || 0; } catch (e) {}
  etat.usedMs = usedMs;

  if (/[?&]merci=1/.test(location.search)) {
    toast('Merci pour ton soutien ! ☕ Ton accès sera activé très vite.');
    history.replaceState(null, '', location.pathname);
  }

  majBadge();
  lireServeur();
  verifierVerrou();
  setInterval(tick, 1000);

  // Sauvegarde fiable quand on quitte la page / change d'onglet
  addEventListener('pagehide', () => { ecrireServeur(true); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) ecrireServeur(true); });

  onAuthStateChanged(auth, suivreCompte);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
