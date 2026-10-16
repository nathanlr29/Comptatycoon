# Étape 1/9 — Socle et déploiement

Lis `CLAUDE.md` et `PROGRESS.md`. Cette étape pose le projet et prouve que le déploiement GitHub Pages fonctionne **avant** d'écrire le jeu, pour détecter tout de suite les problèmes de chemins.

## Avant de commencer
Inspecte le dépôt. S'il contient déjà du code, adapte-toi à l'existant au lieu de le recréer, ne supprime rien sans le signaler, et décris ce que tu as trouvé dans `PROGRESS.md`. Détecte le nom de la branche principale.

## À faire
1. Initialiser Vite + TypeScript strict + Phaser 3 + Vitest. Scripts `dev`, `build`, `preview`, `test`, `check` (voir `CLAUDE.md`).
2. Créer l'arborescence de `CLAUDE.md` avec seulement les fichiers utiles maintenant.
3. `vite.config.ts` : `base: process.env.VITE_BASE ?? '/'`.
4. `index.html` + `src/main.ts` : un canvas Phaser plein écran (couleur de fond de la carte) et un HUD HTML minimal « ComptaTycoon » par-dessus. Viewport mobile correct (`viewport-fit=cover`), safe areas, pas de scroll de la page, `touch-action: none` sur le canvas seulement.
5. Variables CSS de couleurs dans `src/styles/`.
6. Un test Vitest trivial qui passe, plus un test qui construit avec `VITE_BASE=/ComptaTycoon/` et vérifie que `dist/index.html` ne référence aucun asset en `/assets/…` sans ce préfixe.
7. `.github/workflows/deploy.yml` : sur push de la branche principale (+ `workflow_dispatch`) : `npm ci`, `npm test`, build avec `VITE_BASE=/${{ github.event.repository.name }}/`, puis actions officielles `configure-pages`, `upload-pages-artifact`, `deploy-pages`. Permissions minimales (`contents: read`, `pages: write`, `id-token: write`), `concurrency` pour éviter deux déploiements simultanés. Aucun secret.
8. `.gitignore`, `README.md` court (installer, lancer, tester, construire, activer Pages : *Settings › Pages › Source : GitHub Actions*).

## Hors périmètre
Toute règle de jeu, la caméra, la sauvegarde.

## Critères de fin
- `npm run check` passe (colle le résumé de la sortie).
- `npm run build` avec `VITE_BASE=/ComptaTycoon/` puis `npm run preview` sert la page sans erreur 404 dans la console (vérifie avec `curl` sur les assets si tu ne peux pas ouvrir de navigateur).
- `PROGRESS.md` à jour, un commit `étape 1 : socle et déploiement`.
- Indique à l'utilisateur les deux actions qu'il doit faire lui-même : pousser, puis régler *Source : GitHub Actions* dans les paramètres Pages.
