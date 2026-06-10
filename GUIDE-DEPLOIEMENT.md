# Guide — sur-le-phil.fr

## Mise en ligne (une fois le repo GitHub prêt)

1. **Secrets** : repo → Settings → Secrets and variables → Actions → New repository secret :
   - `FTP_PASSWORD` → mot de passe FTP Infomaniak
   - `COOKIE_SECRET` → chaîne aléatoire longue et secrète
   - `STRIPE_SECRET_KEY` → `sk_A_REMPLACER` tant que la clé n'existe pas
2. Un push sur `main` déclenche le déploiement automatique sur Infomaniak.
3. `index.html` (trop gros pour le connecteur) : à téléverser une fois sur GitHub
   par glisser-déposer dans le dossier `site/` du repo.
4. Vérifier https://sur-le-phil.fr

## Modifier le site ensuite

Depuis claude.ai chat avec le connecteur GitHub : « modifie X sur le repo sur-le-phil »
→ commit → déploiement auto en ~1 min. (Voir CLAUDE.md pour ce que les agents
peuvent toucher.) Les grosses modifications de contenu : plutôt en session Cowork.

## Activer les paiements plus tard

1. Clé Stripe (Dashboard → Développeurs → Clés API → clé restreinte,
   permission « Sessions Checkout : Écriture ») → remplacer le secret `STRIPE_SECRET_KEY`.
2. Dans `site/paywall.js` : `MODE = 'payant'` pour le paywall complet
   (essai 10 min puis 1 € = 1 h / 5 € = illimité). Sinon la page soutien
   « café » devient simplement fonctionnelle, sans blocage.

## Référencement Google

search.google.com/search-console → propriété `https://sur-le-phil.fr` → vérification
« Balise HTML » → soumettre `sitemap.xml` → « Demander une indexation ».
