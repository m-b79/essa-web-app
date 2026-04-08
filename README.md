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
- site public uniquement pour `v1.0.0`; les fonctions admin / login / CMS sont réservées aux versions futures

## `v1.0.0`

- site public livré sans espace admin
- données du club affichées sur les pages principales
- gestion des états de chargement et d'erreur sur la page d'accueil
- support mobile et clavier de base
- scripts `npm test` et `npm run build`

## Données utilisées

- `GET /api/clubs/5844`
- `GET /api/clubs/5844/calendrier`
- `GET /api/clubs/5844/resultat`
- `GET /api/clubs/5844/matchs`
- `GET /api/clubs/5844/equipes`
