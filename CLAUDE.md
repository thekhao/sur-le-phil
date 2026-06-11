# Consignes pour les agents IA (Claude & autres)

## Règle n°1 — index.html
`site/index.html` fait ~470 Ko (le contenu pédagogique est dans des constantes JS :
NOTIONS, REPERES, PAQUETS, QUIZ…). **Ne jamais le réécrire entièrement via l'API
GitHub** (trop gros pour un appel d'outil). Pour modifier :
- styles → `site/custom.css` (chargé après, il surcharge tout)
- comportement / petites fonctionnalités → `site/custom.js` ou un module dans `site/js/`
- contenu pédagogique → modification locale ciblée (session Cowork/Claude Code), pas depuis le chat

## Style graphique (à respecter pour tout ajout)
Cahier d'écolier + tableau d'ardoise. Polices : Caveat (titres manuscrits),
Spectral (texte), Archivo (UI). Couleurs CSS : ardoise `#243832`, craie `#F7F4EA`,
jaune craie `#E5B43C`, papier `#FDFCF7`, encre `#1F2D3D`, rouge `#B33A3A`,
vert `#3E7A5E`. S'inspirer de `site/soutien.html` comme page de référence.

## Architecture comptes & accès (résumé — détails dans README.md)
- Modules ES dans `site/js/` (chargés par `app.js`, seul script ajouté à index.html).
  Pas de build, pas de npm : Firebase est importé depuis le CDN gstatic.
- `firebase-init.js` : config publique Firebase + `ADMIN_EMAIL` (doit être identique
  à l'email admin dans `firestore.rules`).
- Accès : 15 min gratuites (max de localStorage / cookie signé `/api/time.php` /
  Firestore `users/{uid}.usedMs`), puis 4,99 € via Payment Link Stripe.
  `premium: true` sur la fiche Firestore = accès illimité, activé manuellement
  par l'admin (onglet Admin du site) après vérification du paiement dans Stripe.
- Ne JAMAIS introduire de clé secrète Stripe ou Firebase côté client.
  La protection vient de `firestore.rules` (premium inviolable, usedMs croissant).
- Tout texte visible : en français, tutoiement, ton léger assumé (références philo).

## Déploiement
Push sur `main` = mise en ligne automatique (FTPS Infomaniak, ~1 min).
Pas de build : ce qui est dans `site/` est servi tel quel.
`site/api/config.php` n'existe pas dans le repo : généré au déploiement
depuis les secrets GitHub (`COOKIE_SECRET`). Ne jamais committer de secret.
`firestore.rules` ne se déploie PAS par FTP : à publier dans la console Firebase.

## Conventions
- Tout en français (textes, commentaires, commits).
- Pas de dépendance externe (ni npm, ni composer) sans nécessité réelle.
- Tester la syntaxe avant de committer quand c'est possible (`node --check`, `php -l`).
