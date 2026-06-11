// ============================================================================
// Compte utilisateur — bouton flottant + modale à onglets, style ardoise/cahier.
// Connexion Google et email/mot de passe, vérification d'email, mot de passe
// oublié, déconnexion, suppression de compte, onglet Admin (propriétaire).
// Voir README.md (section « Comptes ») pour le fonctionnement d'ensemble.
// ============================================================================
import { auth, db, ADMIN_EMAIL } from './firebase-init.js';
import {
  onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendEmailVerification, sendPasswordResetEmail, updateProfile, signOut, deleteUser,
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {
  doc, getDocs, updateDoc, deleteDoc, collection, query, where, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { etat, publier, ecouter } from './etat.js';
import { blocAchat, urlPaiement } from './stripe.js';

const CONTACT = 'kemberlyraid329@hotmail.com';

// ---------------------------------------------------------------------------
// Styles (palette du site : ardoise #243832, craie #F7F4EA, jaune #E5B43C,
// papier #FDFCF7, encre #1F2D3D — voir CLAUDE.md)
// ---------------------------------------------------------------------------
const css = `
#slp-compte-btn{position:fixed;top:12px;right:12px;z-index:99997;font-family:Archivo,sans-serif;
  font-size:.78rem;font-weight:600;background:#243832;color:#F7F4EA;border:1.5px dashed rgba(247,244,234,.55);
  border-radius:999px;padding:.45rem 1rem;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25)}
#slp-compte-btn:hover{background:#1A2A25}
#slp-modal{position:fixed;inset:0;z-index:100000;background:rgba(26,42,37,.55);backdrop-filter:blur(6px);
  -webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:1rem;overflow:auto}
#slp-modal .slp-carte{background:#FDFCF7;color:#1F2D3D;width:100%;max-width:470px;max-height:88vh;overflow:auto;
  border-radius:12px;box-shadow:0 18px 50px rgba(0,0,0,.35);font-family:Spectral,Georgia,serif}
.slp-entete{background:radial-gradient(ellipse at 25% 20%, rgba(255,255,255,.06), transparent 55%),#243832;
  color:#F7F4EA;padding:1.1rem 1.3rem .9rem;border-radius:12px 12px 0 0;position:relative}
.slp-entete h2{font-family:Caveat,cursive;font-size:1.9rem;line-height:1.05;margin:0}
.slp-fermer{position:absolute;top:.7rem;right:.8rem;background:none;border:none;color:#F7F4EA;
  font-size:1.5rem;line-height:1;cursor:pointer;opacity:.8}
.slp-fermer:hover{opacity:1}
.slp-onglets{display:flex;gap:.3rem;flex-wrap:wrap;padding:.6rem .9rem 0;background:#243832;border-bottom:0}
.slp-onglet{font-family:Archivo,sans-serif;font-size:.72rem;font-weight:600;border:none;cursor:pointer;
  padding:.5rem .8rem .45rem;border-radius:9px 9px 0 0;background:rgba(247,244,234,.16);color:#F7F4EA}
.slp-onglet:hover{background:rgba(247,244,234,.32)}
.slp-onglet[aria-selected="true"]{background:#FDFCF7;color:#1F2D3D}
.slp-corps{padding:1.3rem 1.4rem 1.5rem}
.slp-corps h3{font-weight:800;font-size:1.05rem;margin:0 0 .6rem}
.slp-corps p{font-size:.92rem;color:#5A6B7E;margin:0 0 .8rem}
.slp-corps p.slp-fort{color:#1F2D3D}
.slp-champ{display:block;width:100%;font-family:Spectral,Georgia,serif;font-size:.95rem;color:#1F2D3D;
  background:#fff;border:1.5px solid #CFC8B2;border-radius:8px;padding:.6rem .8rem;margin-bottom:.65rem;box-sizing:border-box}
.slp-champ:focus{outline:none;border-color:#243832}
.slp-btn{display:block;width:100%;text-align:center;font-family:Archivo,sans-serif;font-weight:700;font-size:.88rem;
  background:#243832;color:#F7F4EA;border:none;border-radius:8px;padding:.7rem 1.1rem;cursor:pointer;
  box-sizing:border-box;text-decoration:none;margin-bottom:.55rem}
.slp-btn:hover{background:#1A2A25}
.slp-btn.slp-jaune{background:#E5B43C;color:#1F2D3D}
.slp-btn.slp-jaune:hover{background:#D6A52F}
.slp-btn.slp-blanc{background:#fff;color:#1F2D3D;border:1.5px solid #CFC8B2}
.slp-btn.slp-blanc:hover{background:#F4F1E6}
.slp-btn.slp-danger{background:transparent;color:#B33A3A;border:1.5px solid #B33A3A}
.slp-btn.slp-danger:hover{background:#F7E7E7}
.slp-lien{background:none;border:none;padding:0;font-family:Archivo,sans-serif;font-size:.78rem;
  color:#5A6B7E;text-decoration:underline;cursor:pointer}
.slp-sep{display:flex;align-items:center;gap:.7rem;color:#8A92A0;font-family:Archivo,sans-serif;
  font-size:.72rem;margin:.8rem 0}
.slp-sep::before,.slp-sep::after{content:'';flex:1;border-top:1px dashed #CFC8B2}
.slp-message{font-family:Archivo,sans-serif;font-size:.8rem;border-radius:8px;padding:.6rem .8rem;margin-bottom:.7rem}
.slp-message.ok{background:#E8F2EC;color:#3E7A5E;border:1px solid #3E7A5E}
.slp-message.erreur{background:#F7E7E7;color:#B33A3A;border:1px solid #B33A3A}
.slp-ligne{display:flex;align-items:center;justify-content:space-between;gap:.6rem;
  border-bottom:1px dashed #E2DCC8;padding:.55rem 0;font-size:.92rem}
.slp-ligne .slp-etiq{font-family:Archivo,sans-serif;font-size:.68rem;font-weight:700;letter-spacing:.1em;
  text-transform:uppercase;color:#5A6B7E}
.slp-badge-ok{font-family:Archivo,sans-serif;font-size:.68rem;font-weight:700;color:#3E7A5E;
  border:1.5px solid #3E7A5E;border-radius:999px;padding:.12rem .55rem}
.slp-badge-attente{font-family:Archivo,sans-serif;font-size:.68rem;font-weight:700;color:#B33A3A;
  border:1.5px solid #B33A3A;border-radius:999px;padding:.12rem .55rem}
.slp-achat{text-align:center;margin:.6rem 0}
.slp-achat-secours{font-family:Archivo,sans-serif;font-size:.75rem;color:#8A92A0;margin-top:.5rem}
.slp-achat-secours a{color:#5A6B7E}
.slp-note{font-family:Archivo,sans-serif;font-size:.73rem;color:#8A92A0;margin-top:.6rem}
.slp-note a{color:#8A92A0}
@media (max-width:640px){#slp-compte-btn{top:auto;bottom:60px;right:12px}}
`;

// ---------------------------------------------------------------------------
// Aides DOM & messages d'erreur Firebase en français
// ---------------------------------------------------------------------------
function el(tag, attrs, html) {
  const e = document.createElement(tag);
  if (attrs) Object.keys(attrs).forEach((k) => e.setAttribute(k, attrs[k]));
  if (html !== undefined) e.innerHTML = html;
  return e;
}

const ERREURS = {
  'auth/invalid-email': 'Adresse email invalide.',
  'auth/email-already-in-use': 'Un compte existe déjà avec cet email — connecte-toi.',
  'auth/weak-password': 'Mot de passe trop court (6 caractères minimum).',
  'auth/wrong-password': 'Email ou mot de passe incorrect.',
  'auth/invalid-credential': 'Email ou mot de passe incorrect.',
  'auth/user-not-found': 'Aucun compte avec cet email.',
  'auth/too-many-requests': 'Trop de tentatives — réessaie dans quelques minutes.',
  'auth/popup-closed-by-user': 'Fenêtre Google fermée avant la fin.',
  'auth/cancelled-popup-request': 'Fenêtre Google fermée avant la fin.',
  'auth/network-request-failed': 'Problème de connexion internet.',
  'auth/requires-recent-login': 'Par sécurité, reconnecte-toi puis recommence.',
  'auth/unauthorized-domain': 'Domaine non autorisé dans Firebase (voir GUIDE-DEPLOIEMENT).',
  'auth/operation-not-allowed': 'Ce mode de connexion n’est pas activé dans Firebase (voir GUIDE-DEPLOIEMENT).',
};
function traduireErreur(e) {
  return ERREURS[e && e.code] || ('Erreur inattendue : ' + ((e && e.code) || e));
}

// ---------------------------------------------------------------------------
// Construction de la modale
// ---------------------------------------------------------------------------
let modal = null;
let ongletActif = null;       // 'connexion' | 'compte' | 'acces' | 'infos' | 'admin'
let modeInscription = false;  // formulaire email : connexion ↔ création de compte

function estAdmin() {
  const u = etat.user;
  return !!(ADMIN_EMAIL && u && u.email === ADMIN_EMAIL && u.emailVerified);
}

function fmtRestant() {
  const ms = Math.max(0, etat.freeMs - etat.usedMs);
  const s = Math.round(ms / 1000);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

export function ouvrirCompte(onglet) {
  ongletActif = onglet || (etat.user ? 'compte' : 'connexion');
  if (!modal) {
    modal = el('div', { id: 'slp-modal' });
    modal.addEventListener('click', (ev) => { if (ev.target === modal) fermer(); });
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
  rendre();
}
function fermer() { if (modal) modal.style.display = 'none'; }

function rendre() {
  if (!modal || modal.style.display === 'none') return;
  const connecte = !!etat.user;
  if (!connecte && (ongletActif === 'compte' || ongletActif === 'admin')) ongletActif = 'connexion';
  if (connecte && ongletActif === 'connexion') ongletActif = 'compte';

  const onglets = connecte
    ? [['compte', 'Compte'], ['acces', 'Accès'], ['infos', 'En savoir plus']]
    : [['connexion', 'Connexion'], ['acces', 'Accès'], ['infos', 'En savoir plus']];
  if (estAdmin()) onglets.push(['admin', 'Admin']);

  const carte = el('div', { class: 'slp-carte', role: 'dialog', 'aria-modal': 'true' });
  const entete = el('div', { class: 'slp-entete' }, '<h2>Le Cahier de Philo</h2>');
  const btnFermer = el('button', { class: 'slp-fermer', 'aria-label': 'Fermer' }, '×');
  btnFermer.addEventListener('click', fermer);
  entete.appendChild(btnFermer);
  const barre = el('div', { class: 'slp-onglets' });
  onglets.forEach(([id, label]) => {
    const b = el('button', { class: 'slp-onglet', 'aria-selected': String(id === ongletActif) }, label);
    b.addEventListener('click', () => { ongletActif = id; rendre(); });
    barre.appendChild(b);
  });
  entete.appendChild(barre);
  carte.appendChild(entete);

  const corps = el('div', { class: 'slp-corps' });
  ({ connexion: vueConnexion, compte: vueCompte, acces: vueAcces, infos: vueInfos, admin: vueAdmin }[ongletActif] || vueConnexion)(corps);
  carte.appendChild(corps);

  modal.innerHTML = '';
  modal.appendChild(carte);
}

function message(corps, texte, type) {
  corps.querySelectorAll('.slp-message').forEach((m) => m.remove());
  corps.prepend(el('div', { class: 'slp-message ' + (type || 'ok') }, texte));
}

// ---------------------------------------------------------------------------
// Onglet Connexion (visiteur non connecté)
// ---------------------------------------------------------------------------
function vueConnexion(corps) {
  corps.appendChild(el('h3', null, modeInscription ? 'Créer un compte' : 'Se connecter'));
  corps.appendChild(el('p', null,
    'Ton compte garde ton temps gratuit d’un appareil à l’autre, et c’est lui qui reçoit l’accès illimité après un soutien.'));

  const btnGoogle = el('button', { class: 'slp-btn slp-blanc' },
    '<svg width="15" height="15" viewBox="0 0 48 48" style="vertical-align:-2px;margin-right:.5rem"><path fill="#FFC107" d="M43.6 20H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.7-.4-4z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.7-.4-4z"/></svg>Continuer avec Google');
  btnGoogle.addEventListener('click', async () => {
    try { await signInWithPopup(auth, new GoogleAuthProvider()); fermer(); }
    catch (e) {
      if (e && e.code === 'auth/popup-blocked') { await signInWithRedirect(auth, new GoogleAuthProvider()); return; }
      message(corps, traduireErreur(e), 'erreur');
    }
  });
  corps.appendChild(btnGoogle);
  corps.appendChild(el('div', { class: 'slp-sep' }, 'ou par email'));

  let champNom = null;
  if (modeInscription) {
    champNom = el('input', { class: 'slp-champ', type: 'text', placeholder: 'Prénom (facultatif)', autocomplete: 'given-name' });
    corps.appendChild(champNom);
  }
  const champEmail = el('input', { class: 'slp-champ', type: 'email', placeholder: 'Adresse email', autocomplete: 'email' });
  const champMdp = el('input', { class: 'slp-champ', type: 'password',
    placeholder: modeInscription ? 'Mot de passe (6 caractères min.)' : 'Mot de passe',
    autocomplete: modeInscription ? 'new-password' : 'current-password' });
  corps.appendChild(champEmail);
  corps.appendChild(champMdp);

  const btnValider = el('button', { class: 'slp-btn slp-jaune' }, modeInscription ? 'Créer mon compte' : 'Se connecter');
  btnValider.addEventListener('click', async () => {
    const email = champEmail.value.trim(), mdp = champMdp.value;
    if (!email || !mdp) { message(corps, 'Email et mot de passe requis.', 'erreur'); return; }
    btnValider.disabled = true;
    try {
      if (modeInscription) {
        const cred = await createUserWithEmailAndPassword(auth, email, mdp);
        const nom = champNom && champNom.value.trim();
        if (nom) await updateProfile(cred.user, { displayName: nom });
        await sendEmailVerification(cred.user);
        ongletActif = 'compte'; rendre();
        const c = modal.querySelector('.slp-corps');
        if (c) message(c, 'Compte créé ! Un email de vérification t’a été envoyé — pense à vérifier les spams.');
        return;
      }
      await signInWithEmailAndPassword(auth, email, mdp);
      fermer();
    } catch (e) { message(corps, traduireErreur(e), 'erreur'); }
    finally { btnValider.disabled = false; }
  });
  champMdp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') btnValider.click(); });
  corps.appendChild(btnValider);

  const bascule = el('button', { class: 'slp-lien' },
    modeInscription ? 'Déjà un compte ? Se connecter' : 'Pas encore de compte ? En créer un');
  bascule.addEventListener('click', () => { modeInscription = !modeInscription; rendre(); });
  corps.appendChild(bascule);

  if (!modeInscription) {
    corps.appendChild(el('span', null, ' · '));
    const oubli = el('button', { class: 'slp-lien' }, 'Mot de passe oublié ?');
    oubli.addEventListener('click', async () => {
      const email = champEmail.value.trim();
      if (!email) { message(corps, 'Écris d’abord ton email dans le champ ci-dessus.', 'erreur'); return; }
      try {
        await sendPasswordResetEmail(auth, email);
        message(corps, 'Email de réinitialisation envoyé à ' + email + ' (vérifie les spams).');
      } catch (e) { message(corps, traduireErreur(e), 'erreur'); }
    });
    corps.appendChild(oubli);
  }
}

// ---------------------------------------------------------------------------
// Onglet Compte (utilisateur connecté) — profil & réglages
// ---------------------------------------------------------------------------
function vueCompte(corps) {
  const u = etat.user;
  if (!u) { vueConnexion(corps); return; }
  corps.appendChild(el('h3', null, 'Mon compte'));

  // Prénom / pseudo modifiable
  const ligneNom = el('div', { class: 'slp-ligne' });
  ligneNom.appendChild(el('span', { class: 'slp-etiq' }, 'Prénom'));
  const champNom = el('input', { class: 'slp-champ', type: 'text', value: u.displayName || '', placeholder: '—', style: 'margin:0;max-width:55%' });
  ligneNom.appendChild(champNom);
  corps.appendChild(ligneNom);

  // Email + statut de vérification
  const ligneEmail = el('div', { class: 'slp-ligne' });
  ligneEmail.appendChild(el('span', { class: 'slp-etiq' }, 'Email'));
  ligneEmail.appendChild(el('span', { style: 'font-size:.85rem;overflow-wrap:anywhere' },
    (u.email || '—') + ' ' + (u.emailVerified
      ? '<span class="slp-badge-ok">vérifié ✓</span>'
      : '<span class="slp-badge-attente">non vérifié</span>')));
  corps.appendChild(ligneEmail);

  if (!u.emailVerified) {
    const renvoyer = el('button', { class: 'slp-btn slp-blanc' }, 'Renvoyer l’email de vérification');
    renvoyer.addEventListener('click', async () => {
      try { await sendEmailVerification(u); message(corps, 'Email de vérification renvoyé (vérifie les spams).'); }
      catch (e) { message(corps, traduireErreur(e), 'erreur'); }
    });
    corps.appendChild(el('p', { class: 'slp-note', style: 'margin:.5rem 0' },
      'Clique sur le lien reçu par email, puis recharge la page.'));
    corps.appendChild(renvoyer);
  }

  const enregistrer = el('button', { class: 'slp-btn' }, 'Enregistrer le prénom');
  enregistrer.addEventListener('click', async () => {
    try {
      await updateProfile(u, { displayName: champNom.value.trim() });
      try { await updateDoc(doc(db, 'users', u.uid), { nom: champNom.value.trim(), majLe: serverTimestamp() }); } catch (e) {}
      message(corps, 'Prénom enregistré.');
    } catch (e) { message(corps, traduireErreur(e), 'erreur'); }
  });
  corps.appendChild(enregistrer);

  if (u.providerData.some((p) => p.providerId === 'password')) {
    const mdp = el('button', { class: 'slp-btn slp-blanc' }, 'Changer mon mot de passe');
    mdp.addEventListener('click', async () => {
      try { await sendPasswordResetEmail(auth, u.email); message(corps, 'Email de changement de mot de passe envoyé à ' + u.email + '.'); }
      catch (e) { message(corps, traduireErreur(e), 'erreur'); }
    });
    corps.appendChild(mdp);
  }

  const deco = el('button', { class: 'slp-btn slp-blanc' }, 'Se déconnecter');
  deco.addEventListener('click', async () => { await signOut(auth); fermer(); });
  corps.appendChild(deco);

  const suppr = el('button', { class: 'slp-btn slp-danger' }, 'Supprimer mon compte');
  suppr.addEventListener('click', async () => {
    if (!confirm('Supprimer définitivement ton compte ? Le temps gratuit déjà utilisé sur cet appareil reste compté.')) return;
    try {
      try { await deleteDoc(doc(db, 'users', u.uid)); } catch (e) {}
      await deleteUser(u);
      fermer();
    } catch (e) { message(corps, traduireErreur(e), 'erreur'); }
  });
  corps.appendChild(suppr);

  corps.appendChild(el('p', { class: 'slp-note' }, 'Identifiant technique (à fournir en cas de problème) : ' + u.uid));
}

// ---------------------------------------------------------------------------
// Onglet Accès — temps gratuit restant & accès illimité (4,99 €)
// ---------------------------------------------------------------------------
function vueAcces(corps) {
  corps.appendChild(el('h3', null, 'Mon accès'));
  if (etat.premium) {
    corps.appendChild(el('p', { class: 'slp-fort' }, '✓ <strong>Accès illimité actif</strong> — merci infiniment de faire vivre le Cahier ! ☕'));
    corps.appendChild(el('p', null, 'Tout le site est débloqué, sans limite de temps, sur tous tes appareils (connecte-toi simplement avec ce compte).'));
    return;
  }
  corps.appendChild(el('p', null,
    'Le Cahier offre <strong>15 minutes de révision gratuites</strong> (comptées à la fois sur cet appareil et sur ton compte). ' +
    'Temps restant : <strong>' + fmtRestant() + '</strong>.'));
  corps.appendChild(el('p', null,
    'Ensuite, l’accès illimité — à vie, sans abonnement — est à <strong>4,99 €</strong> (paiement unique, sécurisé par Stripe).'));
  if (!etat.user) {
    corps.appendChild(el('p', { class: 'slp-fort' },
      '💡 <strong>Crée ton compte avant de payer</strong> : l’accès illimité est rattaché à ton compte (même email que le paiement).'));
    const btn = el('button', { class: 'slp-btn' }, 'Créer un compte / me connecter');
    btn.addEventListener('click', () => { ongletActif = 'connexion'; rendre(); });
    corps.appendChild(btn);
  }
  corps.appendChild(blocAchat(etat.user));
  corps.appendChild(el('p', { class: 'slp-note' },
    'Après le paiement, ton accès est activé sur ton compte (sous 24 h max — généralement bien plus vite). ' +
    'Utilise le même email que ton compte. Un souci ? <a href="mailto:' + CONTACT + '">' + CONTACT + '</a>'));
}

// ---------------------------------------------------------------------------
// Onglet En savoir plus
// ---------------------------------------------------------------------------
function vueInfos(corps) {
  corps.appendChild(el('h3', null, 'En savoir plus'));
  corps.appendChild(el('p', null,
    '<strong>Le Cahier de Philo</strong> rassemble tout ce qu’il faut pour l’épreuve de philosophie du bac : ' +
    'les 17 notions du programme, les repères, la méthode de dissertation et d’explication de texte, ' +
    'des flashcards, des quiz et des entraînements chronométrés en conditions réelles.'));
  corps.appendChild(el('p', null,
    'La philosophie du site : <em>penser activement plutôt que relire passivement</em> — se tester, espacer ses révisions, reformuler avec ses propres mots.'));
  corps.appendChild(el('p', null,
    '<strong>Comment ça marche ?</strong> 15 minutes de découverte gratuites, puis un paiement unique de 4,99 € débloque tout, pour toujours. ' +
    'Pas d’abonnement, pas de publicité, pas de revente de données.'));
  corps.appendChild(el('p', null,
    '<strong>Tes données :</strong> ton compte (email, prénom) et ton temps d’utilisation sont stockés chez Google Firebase ; ' +
    'le paiement est traité par Stripe — le site ne voit jamais ta carte. Tu peux supprimer ton compte à tout moment depuis l’onglet Compte.'));
  corps.appendChild(el('p', null,
    'Contact : <a href="mailto:' + CONTACT + '">' + CONTACT + '</a><br>' +
    '<a href="/mentions-legales.html">Mentions légales &amp; CGV</a> · <a href="/soutien.html">Soutenir le Cahier</a>'));
}

// ---------------------------------------------------------------------------
// Onglet Admin (propriétaire uniquement) — activer un accès après paiement
// ---------------------------------------------------------------------------
function vueAdmin(corps) {
  if (!estAdmin()) { ongletActif = 'compte'; rendre(); return; }
  corps.appendChild(el('h3', null, 'Admin — activer un accès'));
  corps.appendChild(el('p', null,
    'Après un paiement vu dans le Dashboard Stripe : cherche le compte par email (celui du paiement) et active son accès illimité.'));
  const champ = el('input', { class: 'slp-champ', type: 'email', placeholder: 'email de l’acheteur' });
  corps.appendChild(champ);
  const resultats = el('div');
  const chercher = el('button', { class: 'slp-btn' }, 'Chercher');
  chercher.addEventListener('click', async () => {
    resultats.innerHTML = '';
    const email = champ.value.trim().toLowerCase();
    if (!email) return;
    try {
      const docs = await getDocs(query(collection(db, 'users'), where('email', '==', email)));
      if (docs.empty) {
        resultats.appendChild(el('p', { class: 'slp-note' },
          'Aucun compte avec cet email. L’acheteur doit d’abord créer son compte (avec l’email du paiement).'));
        return;
      }
      docs.forEach((d) => {
        const u = d.data();
        const ligne = el('div', { class: 'slp-ligne' });
        ligne.appendChild(el('span', { style: 'font-size:.85rem' },
          (u.email || d.id) + (u.premium ? ' <span class="slp-badge-ok">illimité ✓</span>' : '')));
        const btn = el('button', { class: 'slp-btn ' + (u.premium ? 'slp-danger' : 'slp-jaune'), style: 'width:auto;margin:0;padding:.45rem .8rem' },
          u.premium ? 'Désactiver' : 'Activer l’illimité');
        btn.addEventListener('click', async () => {
          try {
            await updateDoc(doc(db, 'users', d.id), { premium: !u.premium, majLe: serverTimestamp() });
            message(corps, (u.premium ? 'Accès désactivé pour ' : 'Accès illimité activé pour ') + (u.email || d.id) + '.');
            chercher.click();
          } catch (e) { message(corps, 'Échec (règles Firestore ?) : ' + traduireErreur(e), 'erreur'); }
        });
        ligne.appendChild(btn);
        resultats.appendChild(ligne);
      });
    } catch (e) { message(corps, 'Recherche refusée (règles Firestore à publier ?) : ' + traduireErreur(e), 'erreur'); }
  });
  corps.appendChild(chercher);
  corps.appendChild(resultats);
}

// ---------------------------------------------------------------------------
// Démarrage : styles, bouton flottant, suivi de session
// ---------------------------------------------------------------------------
function boot() {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const btn = el('button', { id: 'slp-compte-btn', 'aria-haspopup': 'dialog' }, '👤 Compte');
  btn.addEventListener('click', () => ouvrirCompte());
  document.body.appendChild(btn);

  onAuthStateChanged(auth, (user) => {
    etat.user = user;
    if (!user) etat.premium = false;
    publier();
    btn.innerHTML = user ? '👤 ' + (user.displayName || user.email || 'Compte') : '👤 Compte';
    rendre();
  });

  // Le badge de temps (acces.js) rafraîchit l'onglet Accès s'il est ouvert
  ecouter(() => {
    if (modal && modal.style.display !== 'none' && ongletActif === 'acces') { /* léger : pas de re-rendu par seconde */ }
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
