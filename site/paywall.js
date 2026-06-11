// Le Cahier de Philo — chrono & accès.
// ============================================================================
// MODE :
//   'libre'  → aucun blocage. Badge discret qui compte le temps total de
//              révision (localStorage) ; clic → page soutien (/soutien.html).
//   'payant' → essai gratuit 10 min vérifié côté serveur, puis écran de
//              paiement Stripe : 1 € = 1 h, 5 € = illimité.
// Pour activer le paywall : passer MODE à 'payant' (et configurer la clé
// Stripe dans site/api/config.php — voir README).
// ============================================================================
(function () {
  'use strict';

  var MODE = 'libre';

  var remainingMs = null;
  var access = 'none';
  var tickTimer = null;

  // ---------- Styles (palette du site : ardoise, craie, papier) ----------
  var css = [
    '#bp-badge{position:fixed;bottom:14px;right:14px;z-index:99990;font-family:Archivo,sans-serif;',
    'font-size:.8rem;font-weight:600;background:#243832;color:#F7F4EA;border:1px dashed rgba(247,244,234,.5);',
    'border-radius:999px;padding:.5rem 1rem;box-shadow:0 4px 14px rgba(0,0,0,.25);cursor:default}',
    '#bp-badge.bp-clic{cursor:pointer}',
    '#bp-badge.bp-clic:hover{background:#1A2A25}',
    '#bp-badge strong{font-family:Caveat,cursive;font-size:1.15rem;color:#E5B43C;margin-left:.35rem}',
    '#bp-lock{position:fixed;inset:0;z-index:99999;background:rgba(26,42,37,.55);backdrop-filter:blur(7px);',
    '-webkit-backdrop-filter:blur(7px);display:flex;align-items:center;justify-content:center;padding:1rem;overflow:auto}',
    '#bp-lock .bp-card{background:#FDFCF7;color:#1F2D3D;max-width:520px;width:100%;border-radius:12px;',
    'padding:2rem 1.8rem;box-shadow:0 18px 50px rgba(0,0,0,.35);font-family:Spectral,Georgia,serif;text-align:center}',
    '#bp-lock h2{font-family:Caveat,cursive;font-size:2.3rem;line-height:1.1;color:#243832;margin-bottom:.4rem}',
    '#bp-lock p{font-size:.98rem;color:#5A6B7E;margin-bottom:1.3rem}',
    '.bp-offres{display:flex;gap:.8rem;flex-wrap:wrap;justify-content:center;margin-bottom:1.2rem}',
    '.bp-offre{flex:1;min-width:180px;border:1.5px solid #CFC8B2;border-radius:10px;padding:1rem;background:#fff}',
    '.bp-offre.bp-star{border-color:#E5B43C;background:#FFFBEF;position:relative}',
    '.bp-offre .bp-prix{font-family:Caveat,cursive;font-size:2.2rem;color:#243832;display:block}',
    '.bp-offre .bp-det{font-family:Archivo,sans-serif;font-size:.75rem;color:#5A6B7E;display:block;margin:.2rem 0 .8rem}',
    '.bp-btn{display:inline-block;font-family:Archivo,sans-serif;font-size:.85rem;font-weight:700;text-decoration:none;',
    'background:#243832;color:#F7F4EA;border:none;border-radius:8px;padding:.6rem 1.1rem;cursor:pointer;width:100%}',
    '.bp-btn.bp-jaune{background:#E5B43C;color:#1F2D3D}',
    '.bp-reco{position:absolute;top:-11px;left:50%;transform:translateX(-50%);background:#E5B43C;color:#1F2D3D;',
    'font-family:Archivo,sans-serif;font-size:.62rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;',
    'border-radius:999px;padding:.18rem .6rem;white-space:nowrap}',
    '.bp-note{font-family:Archivo,sans-serif;font-size:.7rem;color:#8A92A0}',
    '.bp-note a{color:#8A92A0}',
    '#bp-toast{position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:99995;background:#3E7A5E;color:#fff;',
    'font-family:Archivo,sans-serif;font-size:.85rem;font-weight:600;border-radius:8px;padding:.7rem 1.2rem;',
    'box-shadow:0 6px 18px rgba(0,0,0,.3)}'
  ].join('');
  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ---------- Helpers ----------
  function fmt(ms) {
    var s = Math.max(0, Math.round(ms / 1000));
    var m = Math.floor(s / 60);
    return m + ':' + String(s % 60).padStart(2, '0');
  }
  function fmtLong(s) {
    var m = Math.floor(s / 60), h = Math.floor(m / 60);
    if (h > 0) return h + ' h ' + String(m % 60).padStart(2, '0');
    return m + ':' + String(s % 60).padStart(2, '0');
  }
  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (html) e.innerHTML = html;
    return e;
  }
  function toast(msg, color) {
    var t = el('div', { id: 'bp-toast' }, msg);
    if (color) t.style.background = color;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 5000);
  }

  // ---------- Badge flottant ----------
  var badge = null;
  function showBadge(label) {
    if (!badge) { badge = el('div', { id: 'bp-badge' }); document.body.appendChild(badge); }
    badge.innerHTML = label;
  }

  // ---------- MODE LIBRE : chrono de temps de révision, sans blocage ----------
  function bootLibre() {
    var KEY = 'bp_temps_total';
    var total = 0;
    try { total = parseInt(localStorage.getItem(KEY) || '0', 10) || 0; } catch (e) {}
    function affiche() { showBadge('⏱ Révision <strong>' + fmtLong(total) + '</strong>'); }
    affiche();
    badge.classList.add('bp-clic');
    badge.title = 'Temps total passé à réviser — clique pour soutenir le site ☕';
    badge.addEventListener('click', function () { location.href = '/soutien.html'; });
    setInterval(function () {
      if (document.hidden) return; // ne compte pas quand l'onglet est en arrière-plan
      total++;
      try { localStorage.setItem(KEY, String(total)); } catch (e) {}
      affiche();
    }, 1000);
  }

  // ---------- MODE PAYANT : essai 10 min puis écran de paiement ----------
  var lock = null;
  function showLock(title, sub) {
    if (lock) return;
    if (badge) { badge.remove(); badge = null; }
    lock = el('div', { id: 'bp-lock' });
    lock.appendChild(el('div', { 'class': 'bp-card' },
      '<h2>' + title + '</h2>' +
      '<p>' + sub + '</p>' +
      '<div class="bp-offres">' +
      '<div class="bp-offre"><span class="bp-prix">1&nbsp;€</span>' +
      '<span class="bp-det">1 heure d’accès complet</span>' +
      '<a class="bp-btn" href="/api/checkout.php?plan=hour">Débloquer 1 h</a></div>' +
      '<div class="bp-offre bp-star"><span class="bp-reco">Le bon plan</span><span class="bp-prix">5&nbsp;€</span>' +
      '<span class="bp-det">Accès illimité, jusqu’au bac et après</span>' +
      '<a class="bp-btn bp-jaune" href="/api/checkout.php?plan=full">Accès illimité</a></div>' +
      '</div>' +
      '<p class="bp-note">Paiement sécurisé par Stripe · <a href="/mentions-legales.html">Mentions légales &amp; CGV</a></p>'
    ));
    document.body.appendChild(lock);
    document.body.style.overflow = 'hidden';
  }
  function startCountdown() {
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = setInterval(function () {
      if (remainingMs === null) return;
      remainingMs -= 1000;
      if (remainingMs <= 0) {
        clearInterval(tickTimer);
        fetch('/api/status.php', { credentials: 'same-origin' })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            if (d.access === 'none' || (d.remainingMs !== null && d.remainingMs <= 0)) {
              showLock(
                access === 'trial' ? 'Fin de l’essai gratuit' : 'Ton heure est écoulée',
                'Pour continuer à réviser, choisis une formule :'
              );
            } else { applyPayant(d); }
          })
          .catch(function () { /* erreur réseau : on laisse passer */ });
        return;
      }
      if (badge) {
        showBadge((access === 'trial' ? '⏳ Essai gratuit' : '⏱ Accès 1 h') +
          '<strong>' + fmt(remainingMs) + '</strong>');
      }
    }, 1000);
  }
  function applyPayant(d) {
    access = d.access;
    remainingMs = d.remainingMs;
    if (d.access === 'paid' && d.plan === 'full') {
      showBadge('✓ Accès illimité');
      setTimeout(function () { if (badge) { badge.remove(); badge = null; } }, 6000);
      return;
    }
    if (d.access === 'paid' || d.access === 'trial') {
      showBadge((d.access === 'trial' ? '⏳ Essai gratuit' : '⏱ Accès 1 h') +
        '<strong>' + fmt(remainingMs) + '</strong>');
      startCountdown();
      return;
    }
    showLock('Déjà de retour ?', 'Ton essai gratuit de 10 minutes est terminé. Pour continuer :');
  }
  function bootPayant() {
    fetch('/api/status.php', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(applyPayant)
      .catch(function () {
        console.warn('Paywall : /api/status.php injoignable. Site laissé en accès libre.');
      });
  }

  // ---------- Messages après redirection paiement ----------
  function handleParams() {
    var p = new URLSearchParams(location.search);
    if (p.get('paiement') === 'ok') {
      toast(p.get('plan') === 'full' ? '✓ Merci infiniment ! ☕' : '✓ Merci pour le café ! ☕');
      history.replaceState(null, '', location.pathname);
    } else if (p.get('paiement') === 'annule') {
      toast('Paiement annulé.', '#B33A3A');
      history.replaceState(null, '', location.pathname);
    } else if (p.get('erreur')) {
      toast('Le paiement n’est pas encore activé.', '#B33A3A');
      history.replaceState(null, '', location.pathname);
    }
  }

  // ---------- Démarrage ----------
  function boot() {
    handleParams();
    if (MODE === 'payant') bootPayant();
    else bootLibre();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
