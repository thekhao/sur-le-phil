# sur-le-phil.fr — Le Cahier de Philo

Site de révisions pour l'épreuve de philosophie du bac : 17 notions, repères,
méthode de dissertation, flashcards, quiz, générateur de sujets, chronos d'épreuve.
Style « cahier d'écolier / tableau d'ardoise ».

**En ligne :** https://sur-le-phil.fr · Hébergement Infomaniak (PHP + statique).

## Structure

```
site/                    ← racine web, déployée telle quelle par FTP
├── index.html           ← LE site (one-page, ~470 Ko, données incluses) — voir CLAUDE.md avant d'y toucher
├── paywall.js           ← chrono de révision + paywall Stripe (MODE 'libre'/'payant' en tête de fichier)
├── custom.css           ← point d'extension styles (chargé après les styles du site)
├── custom.js            ← point d'extension comportement (chargé après paywall.js)
├── soutien.html         ← page « Offre-moi un café » (1 € / 5 €)
├── mentions-legales.html
├── robots.txt · sitemap.xml
└── api/                 ← backend PHP (Stripe Checkout + cookies signés)
    ├── status.php       ← état d'accès du visiteur (JSON)
    ├── checkout.php     ← crée la session de paiement Stripe et redirige
    ├── activate.php     ← vérifie le paiement, pose le cookie d'accès
    ├── common.php       ← cookies signés HMAC + client Stripe (zéro dépendance)
    ├── config.php.example
    └── config.php       ← ABSENT du repo : généré au déploiement depuis les secrets GitHub
.github/workflows/deploy.yml  ← push sur main = mise en ligne automatique
```

## Déployer / modifier

Un push sur `main` déclenche l'envoi FTP vers Infomaniak (~1 min). Rien d'autre à faire.
Secrets requis dans Settings → Secrets and variables → Actions : `FTP_PASSWORD`,
`COOKIE_SECRET`, `STRIPE_SECRET_KEY` (mettre `sk_A_REMPLACER` tant que la clé n'existe pas —
les boutons de paiement renvoient alors une erreur propre).

## Paywall

Actuellement `MODE = 'libre'` (en tête de `site/paywall.js`) : badge qui compte le temps
de révision, aucun blocage, page soutien type « Buy me a coffee ». Pour activer le mode
payant (essai 10 min puis 1 € = 1 h / 5 € = illimité, déjà codé et testé) : passer
`MODE = 'payant'` et mettre la vraie clé dans le secret `STRIPE_SECRET_KEY`.

## Sécurité (volontairement simple)

Cookies signés HMAC-SHA256 (pas de base de données), secrets hors du repo,
FTPS pour le déploiement, contenu du site lisible dans la source (assumé).
