# Consignes pour les agents IA (Claude & autres)

## Règle n°1 — index.html
`site/index.html` fait ~470 Ko (le contenu pédagogique est dans des constantes JS :
NOTIONS, REPERES, PAQUETS, QUIZ…). **Ne jamais le réécrire entièrement via l'API
GitHub** (trop gros pour un appel d'outil). Pour modifier :
- styles → `site/custom.css` (chargé après, il surcharge tout)
- comportement / petites fonctionnalités → `site/custom.js`
- contenu pédagogique → modification locale ciblée (session Cowork/Claude Code), pas depuis le chat

## Style graphique (à respecter pour tout ajout)
Cahier d'écolier + tableau d'ardoise. Polices : Caveat (titres manuscrits),
Spectral (texte), Archivo (UI). Couleurs CSS : ardoise `#243832`, craie `#F7F4EA`,
jaune craie `#E5B43C`, papier `#FDFCF7`, encre `#1F2D3D`, rouge `#B33A3A`,
vert `#3E7A5E`. S'inspirer de `site/soutien.html` comme page de référence.

## Déploiement
Push sur `main` = mise en ligne automatique (FTP Infomaniak, ~1 min).
Pas de build : ce qui est dans `site/` est servi tel quel.
`site/api/config.php` n'existe pas dans le repo : généré au déploiement
depuis les secrets GitHub. Ne jamais committer de clé ou secret.

## Paywall
`site/paywall.js`, constante `MODE` en tête : `'libre'` (actuel, chrono sans blocage)
ou `'payant'` (essai 10 min serveur + Stripe). Le backend PHP est complet et fonctionne
dès qu'une vraie clé Stripe est dans le secret `STRIPE_SECRET_KEY`.

## Conventions
- Tout en français (textes, commentaires, commits).
- Pas de dépendance externe (ni npm, ni composer) sans nécessité réelle.
- Tester la syntaxe avant de committer quand c'est possible (`node --check`, `php -l`).
