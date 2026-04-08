# ESSA Web App

Site web de maquette pour l'Etoile Sportive St Amand Sur Sevre.

## Démarrage

```bash
npm run dev
```

Puis ouvrir `http://localhost:3000` ou `http://<votre-ip-lan>:3000` depuis un autre appareil sur le réseau.
Si besoin, définir `HOST=0.0.0.0` avant le lancement.

## Vérifications

```bash
npm test
npm run build
```

## Ce que propose cette base

- identité sombre jaune/noir
- page d'accueil éditoriale avec grand hero
- navigation principale + sous-navigation
- bloc actualités prêt, même vide
- résumé du club en page d'accueil
- pages `Accueil`, `Calendrier`, `Résultats`, `Classement`, `Équipes`, `Actualités`
- proxy local vers l'API FFF via `/api/*`
- classement calculé côté client à une date de référence (`?asOf=YYYY-MM-DD` pour ajuster)
- dernier chargement conservé en `localStorage` comme secours si l'API tombe
- cache local expirant après 24h, avec rafraîchissement manuel depuis l'accueil
- site public uniquement; les fonctions admin / login / CMS sont réservées aux versions futures

## `v1.0.0`

- site public livré sans espace admin
- données du club affichées sur les pages principales
- gestion des états de chargement et d'erreur sur la page d'accueil
- support mobile et clavier de base
- scripts `npm test` et `npm run build`

## `v1.1.0`

- cache local last-known-good avec expiration
- bouton de rafraîchissement manuel
- empty states plus explicites sur les pages publiques

## `v1.2.0`

- tests unitaires des transformations de données et du cache
- workflow CI pour `npm test` et `npm run build`

## `v1.3.0`

- hero mobile plus compact
- tableau de classement allégé sur petit écran

## `v1.3.1`

- identité visible alignée sur ESSA et Saint-Amantaise

## `v1.4.0`

- onglet `Le club` dédié
- accueil allégé avec un simple repère `Depuis 1938`
- infos pratiques déplacées vers la page du club

## `v1.4.1`

- footer social avec Instagram et Facebook

## `v1.5.0`

- switch de thème clair/sombre
- thème clair par défaut

## Données utilisées

- `GET /api/clubs/5844`
- `GET /api/clubs/5844/calendrier`
- `GET /api/clubs/5844/resultat`
- `GET /api/clubs/5844/matchs`
- `GET /api/clubs/5844/equipes`
