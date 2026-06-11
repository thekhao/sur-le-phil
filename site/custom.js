/* ============================================================
   custom.js — point d'extension comportement (sur-le-phil.fr)
   Chargé après paywall.js. Tout en français.
   ============================================================ */

/* ------------------------------------------------------------
   Badge « Révision » + minuteur : déplacé en BAS À GAUCHE
   (la pastille musique 🎵 occupe le bas droit).
   Méthode défensive : on ne connaît pas le sélecteur exact du
   badge créé par paywall.js, on repère donc tout élément fixé
   contenant « Révision » (hors pastille musique) et on force
   son ancrage à gauche. Réessais + observateur pendant 12 s,
   car paywall.js peut injecter le badge tardivement.
   ------------------------------------------------------------ */
(function () {
  function estFixe(el) {
    try { return getComputedStyle(el).position === 'fixed'; }
    catch (e) { return false; }
  }
  function ancrerAGauche(el) {
    if (!el || el.dataset.ancreGauche) return;
    el.dataset.ancreGauche = '1';
    var mobile = matchMedia('(max-width: 640px)').matches;
    el.style.setProperty('right', 'auto', 'important');
    el.style.setProperty('left', mobile ? '12px' : '18px', 'important');
    if (!el.style.bottom) el.style.setProperty('bottom', mobile ? '12px' : '18px', 'important');
  }
  function chercherBadge() {
    var candidats = document.querySelectorAll('body > *, body > * > *');
    for (var i = 0; i < candidats.length; i++) {
      var el = candidats[i];
      if (el.id === 'mus-pill' || el.closest && el.closest('#mus-pill')) continue;
      if (!estFixe(el)) continue;
      var txt = (el.textContent || '');
      if (/r[ée]vision/i.test(txt) && txt.length < 200) { ancrerAGauche(el); return true; }
    }
    return false;
  }
  var essais = 0;
  var minuterie = setInterval(function () {
    essais++;
    if (chercherBadge() || essais > 24) clearInterval(minuterie); // ~12 s max
  }, 500);
  if (document.readyState !== 'loading') chercherBadge();
  else document.addEventListener('DOMContentLoaded', chercherBadge);
})();
