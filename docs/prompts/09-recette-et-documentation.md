# Étape 9/9 — Recette finale et documentation

Lis `CLAUDE.md`, `PROGRESS.md` et `docs/GDD.md`. Objectif : vérifier, corriger, documenter. Pas de nouvelle fonctionnalité.

## À faire
1. Relire chaque section du GDD et vérifier qu'elle est implémentée ; corriger les écarts ou les lister.
2. Si Playwright peut s'installer et lancer un navigateur ici : un test de fumée en émulation iPhone (WebKit) : la page charge sous `/ComptaTycoon/`, le clic crédite, un recrutement fonctionne, recharger restaure la partie. Sinon, le dire et ne pas insister.
3. Rechercher et supprimer : `TODO`, `console.log` de debug, code mort, boutons sans effet.
4. README complet : présentation, captures si possible, installation, commandes, architecture (`core` pur / `game` / `ui` / `persistence`), où modifier l'équilibrage (`src/data/`), déploiement et activation de Pages, limites de la sauvegarde locale, comment ajouter plus tard une sauvegarde cloud (nouvelle implémentation de `SaveService`).
5. `PROGRESS.md` : checklist finale de recette manuelle sur iPhone (Safari et écran d'accueil) et ordinateur.

## Critères de livraison V1
Build et tests verts ; site statique fonctionnel sous un sous-chemin ; carte navigable souris et doigt, zoom et pincement ; bâtiments sélectionnables et améliorables ; économie, recrutement et capacité ; départements, technologies, événements, objectifs ; sauvegarde, export/import et hors ligne plafonné ; aucun backend ; workflow de déploiement prêt.

## Fin
Commit `étape 9 : recette V1`. Résume à l'utilisateur ce qui est vérifié automatiquement, ce qui reste à vérifier à la main, et les actions qu'il doit faire (pousser, activer Pages).
