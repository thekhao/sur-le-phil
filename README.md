# sur-le-phil.fr — Le Cahier de Philo

Site de révisions pour l'épreuve de philosophie du bac : 17 notions, repères,
méthode de dissertation, flashcards, quiz, générateur de sujets, chronos d'épreuve.
Style « cahier d'écolier / tableau d'ardoise ».

**En ligne :** https://sur-le-phil.fr · Hébergement Infomaniak (PHP + statique) ·
Comptes Google Firebase · Paiement Stripe (Payment Link).

## Modèle d'accès

- **15 minutes gratuites** de présence sur la page (onglet visible), comptées
  dans trois endroits dont on prend le **maximum** :
  appareil (`localStorage`), cookie httpOnly signé HMAC (`/api/time.php`),
  et compte Firestore (`users/{uid}.usedMs`, qui suit l'utilisateur d'un appareil à l'autre).
- Ensuite : **accès illimité à 4,99 €** (paiement unique via un Payment Link /
  Buy Button Stripe — aucune clé secrète côté serveur).
- **Activation manuelle** : le paiement apparaît dans le Dashboard Stripe
  (email + `client_reference_id` = uid Firebase si l'acheteur était connecté) ;
  le propriétaire active alors le compte depuis l'onglet **Admin** du site
  (champ Firestore `premium: true`). Le déblocage est instantané chez
  l'utilisateur (écoute temps réel `onSnapshot`).

## Comptes (Firebase)

Connexion **Google** ou **email + mot de passe**, avec vérification d'email,
mot de passe oublié (email Firebase), déconnexion et suppression de compte.
Interface : bouton flottant « 👤 Compte » → modale à onglets
(Connexion / Compte / Accès / En savoir plus / Admin).

La sécurité repose sur `firestore.rules` (à publier dans la console Firebase) :
personne ne peut s'octroyer `premium`, le temps consommé ne peut pas diminuer,
l'admin est identifié par son email vérifié.

## Structure

```
site/                       ← racine web, déployée telle quelle par FTP
├── index.html              ← LE site (one-page, ~470 Ko, données incluses) — voir CLAUDE.md avant d'y toucher
├── js/
│   ├── app.js              ← point d'entrée (module ES, seul script ajouté à index.html)
│   ├── firebase-init.js    ← config Firebase + ADMIN_EMAIL (admin du site)
│   ├── compte.js           ← bouton « Compte », connexion/inscription, onglets
│   ├── acces.js            ← 15 min gratuites, badge, écran de blocage, sync temps
│   ├── stripe.js           ← Payment Link / Buy Button (4,99 €), aucune clé secrète
│   └── etat.js             ← mini état partagé entre modules
├── custom.css · custom.js  ← points d'extension (chargés après tout le reste)
├── soutien.html            ← page « Le Banquet » (4,99 € accès illimité)
├── merci.html              ← retour après paiement (à configurer dans Stripe)
├── mentions-legales.html
├── robots.txt · sitemap.xml · googleb5986679555ee8ae.html (Search Console)
└── api/                    ← backend PHP minimal
    ├── time.php            ← compteur de temps par appareil (cookie httpOnly signé)
    ├── common.php          ← signature HMAC des cookies (zéro dépendance)
    ├── config.php.example
    └── config.php          ← ABSENT du repo : généré au déploiement depuis les secrets GitHub
firestore.rules             ← règles de sécurité à publier dans la console Firebase
.github/workflows/deploy.yml ← push sur main = mise en ligne automatique (FTPS)
```

## Déployer / modifier

Un push sur `main` déclenche l'envoi FTP vers Infomaniak (~1 min). Rien d'autre à faire.
Secrets GitHub requis (Settings → Secrets and variables → Actions) :
`FTP_PASSWORD`, `COOKIE_SECRET`. (`STRIPE_SECRET_KEY` n'est **plus** utilisé :
le paiement passe par un Payment Link, sans clé secrète.)

## Configuration restante (voir GUIDE-DEPLOIEMENT.md, section « Ce qu'il reste à faire »)

1. Console Firebase : activer les fournisseurs Google et Email/Mot de passe,
   autoriser le domaine `sur-le-phil.fr`.
2. Publier `firestore.rules` avec l'email admin renseigné (+ le même email
   dans `site/js/firebase-init.js` → `ADMIN_EMAIL`).
3. Dashboard Stripe : configurer la redirection du Payment Link vers
   `https://sur-le-phil.fr/merci.html`.

## Sécurité (volontairement simple)

Niveau assumé « anti-triche de base, pas blindage » : cookies signés HMAC-SHA256
côté serveur, temps consommé non décroissant et `premium` verrouillé par les règles
Firestore, secrets hors du repo, FTPS pour le déploiement. Le contenu pédagogique
reste lisible dans la source de la page (assumé). La vérification automatique des
paiements nécessiterait une clé API Stripe (voir GUIDE, « Pour aller plus loin »).
