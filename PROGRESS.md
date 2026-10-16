# Avancement ComptaTycoon

> Tenu à jour par Claude Code à la fin de chaque étape. C'est la mémoire entre deux sessions.

## Étapes
- [x] 01 Socle et déploiement
- [ ] 02 Cœur métier (économie, recrutement)
- [ ] 03 Carte et caméra
- [ ] 04 HUD et panneaux (prototype jouable)
- [ ] 05 Bâtiments et construction
- [ ] 06 Profils, sauvegarde et progression hors ligne
- [ ] 07 Départements, technologies, événements, objectifs
- [ ] 08 Polissage, performance et PWA
- [ ] 09 Recette finale et documentation
- [ ] 10 Comptes joueur : pseudo + mot de passe (Firebase)

## État actuel
Étape 1 terminée (16/10/2026).
- Vite 8, TypeScript 5.9 strict, Phaser 3.90.0, Vitest 5. Node ≥ 22.12.
- Écran : canvas Phaser plein écran (sol vert) + bandeau HTML « ComptaTycoon ».
- `npm run check` : typage OK, 2 fichiers de test / 2 tests OK, build OK.
- Build avec `VITE_BASE=/ComptaTycoon/` servi par `vite preview` : page, JS, CSS et favicon en 200 ; chargement dans Chromium headless en émulation iPhone 13 sans erreur console ni débordement horizontal.
- Poids : JS 1,2 Mo minifié / 319 Ko gzip (essentiellement Phaser), CSS 1 Ko.
- Workflow Pages écrit mais pas encore exécuté sur GitHub.

## Décisions prises
- TypeScript 5.9 plutôt que 7 (récent, outillage moins éprouvé).
- `chunkSizeWarningLimit` à 1300 Ko : Phaser pèse ~1,2 Mo à lui seul, l'avertissement n'apporte rien.
- Le workflow tourne aussi sur les pull requests (typage + tests + build, sans publier) pour vérifier chaque étape avant fusion.
- Branche principale : `main`. Une branche + une pull request par étape.

## À vérifier à la main (iPhone, navigateur)
- Ouvrir le site publié sur iPhone (Safari) : pas de zoom ni de défilement de la page, bandeau sous l'encoche.

## Idées / plus tard
_(Hors périmètre de l'étape en cours.)_
