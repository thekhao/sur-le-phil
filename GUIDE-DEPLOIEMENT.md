# Guide — sur-le-phil.fr

## Comment le site est mis en ligne

Un push sur `main` déclenche le déploiement automatique (FTPS Infomaniak, ~1 min,
onglet **Actions** du repo pour suivre). Secrets GitHub requis (Settings → Secrets
and variables → Actions) : `FTP_PASSWORD` et `COOKIE_SECRET`.
`STRIPE_SECRET_KEY` n'est plus utilisé (paiement par Payment Link) — il peut être supprimé.

## ✅ Ce qu'il reste à faire (configuration, ~15 min en tout)

### 1. Console Firebase — activer la connexion (obligatoire)
Sur [console.firebase.google.com](https://console.firebase.google.com) → projet **sur-le-phil** :
- **Authentication → Sign-in method** : activer **Google** ET **E-mail/Mot de passe**.
- **Authentication → Settings → Authorized domains** : ajouter **`sur-le-phil.fr`**
  (sinon la connexion Google échoue avec « domaine non autorisé »).
- (Conseillé) **Authentication → Templates** : passer la langue des emails en français.

### 2. Règles Firestore + email admin (obligatoire pour activer les paiements)
- Choisis l'email qui sera **admin** du site (ton compte Google de préférence — il est
  vérifié d'office).
- Dans `firestore.rules` (racine du repo) : remplacer `ADMIN_EMAIL_A_REMPLACER` par cet email,
  puis copier tout le fichier dans **console Firebase → Firestore Database → Règles → Publier**.
- Dans `site/js/firebase-init.js` : mettre le même email dans `ADMIN_EMAIL` (puis push).
- Connecte-toi sur le site avec cet email : l'onglet **Admin** apparaît dans la modale Compte.

### 3. Stripe — redirection après paiement (conseillé)
Dashboard Stripe (compte qui possède le Payment Link) → **Payment Links** → le lien 4,99 € →
**Après le paiement** → rediriger vers **`https://sur-le-phil.fr/merci.html`**.
Sans ça, l'acheteur voit la confirmation Stripe standard (fonctionnel mais moins guidé).

## Activer un accès illimité après un paiement (au quotidien)

1. Stripe t'envoie une notification de paiement (ou regarde le Dashboard → Paiements).
2. Note l'**email** de l'acheteur (et le `client_reference_id` s'il était connecté = uid Firebase).
3. Sur le site : **👤 Compte → onglet Admin** → cherche l'email → **Activer l'illimité**.
4. Chez l'acheteur, le déblocage est instantané (même page ouverte). C'est tout.

Si l'acheteur n'a pas encore de compte : il doit en créer un **avec l'email du paiement**,
puis tu actives. (Le site le lui explique à chaque étape.)

## Modifier le site ensuite

Depuis claude.ai chat avec le connecteur GitHub, Cowork ou Claude Code : « modifie X sur le
repo sur-le-phil » → commit → déploiement auto en ~1 min. Voir CLAUDE.md pour les règles
(en particulier : ne jamais réécrire `index.html` depuis le chat).

## Référencement Google

La propriété Search Console est vérifiée (fichier `googleb5986679555ee8ae.html`).
Reste à faire dans [search.google.com/search-console](https://search.google.com/search-console) :
soumettre `sitemap.xml` (rubrique Sitemaps) et « Demander une indexation » pour la page d'accueil.

## Pour aller plus loin (optionnel, pas nécessaire au lancement)

- **Activation automatique des paiements** : demander au propriétaire du compte Stripe
  une **clé restreinte** (lecture des sessions Checkout) + configurer un webhook vers un
  endpoint PHP qui marquerait `premium: true` tout seul. L'architecture actuelle (admin
  manuel) a été choisie parce qu'on ne dispose que d'un Payment Link, sans clé API.
- **Reçus / factures** : activables dans le Dashboard Stripe (Paramètres → Emails clients).
- **Nom d'expéditeur des emails Firebase** : personnalisable (Authentication → Templates),
  voire domaine d'envoi custom.
