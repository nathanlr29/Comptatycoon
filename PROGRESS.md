# Avancement ComptaTycoon

> Tenu à jour par Claude Code à la fin de chaque étape. C'est la mémoire entre deux sessions.

## Étapes
- [x] 01 Socle et déploiement
- [x] 02 Cœur métier (économie, recrutement)
- [ ] 03 Carte et caméra
- [ ] 04 HUD et panneaux (prototype jouable)
- [ ] 05 Bâtiments et construction
- [ ] 06 Profils, sauvegarde et progression hors ligne
- [ ] 07 Départements, technologies, événements, objectifs
- [ ] 08 Polissage, performance et PWA
- [ ] 09 Recette finale et documentation
- [ ] 10 Comptes joueur : pseudo + mot de passe (Firebase)

## État actuel
Étape 2 terminée (16/10/2026). Pas encore d'interface pour jouer : le moteur existe et est testé, l'affichage arrive aux étapes 3 et 4.
- `src/data/` : `balance.ts` (constantes), `staff.ts` (collaborateurs), `upgrades.ts` (améliorations du clic).
- `src/core/` : `state.ts`, `economy.ts` (revenu/s, clic, coûts, familles de multiplicateurs dans `getMultipliers`), `recruitment.ts` (capacité, refus motivés, démission), `actions.ts` (`applyAction` pur), `store.ts` (`simulate` à pas fixes de 250 ms + `GameStore`), `format.ts`.
- `npm run check` : typage OK, 5 fichiers / 32 tests OK, build OK.
- Déploiement Pages : le build passe sur GitHub, la publication échoue tant que Pages n'est pas activé dans les paramètres du dépôt (404 « Ensure GitHub Pages has been enabled »).

Étape 1 (16/10/2026) : socle Vite 8 / TypeScript 5.9 / Phaser 3.90.0 / Vitest 5, Node ≥ 22.12. Build sous `/ComptaTycoon/` vérifié en Chromium headless (émulation iPhone 13). Poids : JS 1,2 Mo / 319 Ko gzip (Phaser), CSS 1 Ko.

## Décisions prises
- TypeScript 5.9 plutôt que 7 (récent, outillage moins éprouvé).
- `chunkSizeWarningLimit` à 1300 Ko : Phaser pèse ~1,2 Mo à lui seul, l'avertissement n'apporte rien.
- Le workflow tourne aussi sur les pull requests (typage + tests + build, sans publier) pour vérifier chaque étape avant fusion.
- Branche principale : `main`. Une branche + une pull request par étape, fusionnée automatiquement quand la CI est verte (demande de Nathan).
- Coût de l'associé : `ceil(25 000 × 4^(associés − 1))` avec associés = nombre actuel (joueur compris).
- Bonus du Bureau principal pas encore appliqué : il viendra avec les bâtiments (étape 5).
- `simulate` recalcule le revenu à chaque pas de 250 ms (un effet temporaire peut expirer en cours de route) ; le temps restant (< 250 ms) est gardé pour le tick suivant.
- Un test d'architecture interdit à `src/core/` d'importer Phaser, le DOM ou le stockage.

## À vérifier à la main (iPhone, navigateur)
- Ouvrir le site publié sur iPhone (Safari) : pas de zoom ni de défilement de la page, bandeau sous l'encoche.

## Idées / plus tard
_(Hors périmètre de l'étape en cours.)_
