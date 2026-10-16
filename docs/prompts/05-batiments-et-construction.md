# Étape 5/9 — Pièces et aménagement

Lis `CLAUDE.md`, `PROGRESS.md` et `docs/GDD.md` §6. Le jeu se passe à l'intérieur du cabinet : un « bâtiment » est une **pièce** aménagée dans un emplacement du plan ; les noms techniques (`buildings`, `build`, `upgrade`) restent.

## À faire
1. `data/buildings.ts` : bâtiments du GDD (sauf locaux de départements : seulement leurs emplacements verrouillés pour l'instant).
2. `core/buildings.ts` : prérequis, coût de construction et d'amélioration, lancement de chantier (`buildEndsAt`), fin de chantier dans `tick`, effets ajoutés aux multiplicateurs de `economy.ts`, réputation gagnée, ouverture des parcelles selon le niveau du Bureau principal.
3. Actions `build(slotId, type)` et `upgrade(buildingId)` avec raisons de refus.
4. Rendu en fausse 3D (GDD §6) : la pièce achetée apparaît à sa place (`ROOMS` dans `src/data/office.ts`) ; travaux avec bâche et barre ; badge de niveau ; rien n'est dessiné pour une pièce non achetée (aucun emplacement « + »). Le dessin isométrique est fourni par `src/game/` (projection `iso.ts`).
5. Panneau bâtiment : statistiques, effet actuel et suivant, coût, durée, bouton Construire / Améliorer avec raison si impossible. Les achats se font depuis le menu « Agrandir le cabinet » (pas de tap sur un emplacement vide).
6. Animation légère à la fin des travaux et notification.

## Tests obligatoires
Construction refusée sans fonds ou sans prérequis ; chantier terminé après la durée exacte ; amélioration modifie niveau et revenu/s ; parcelles débloquées au bon niveau ; le visuel ne montre jamais « construit » un bâtiment en chantier (teste la fonction qui calcule l'état visuel).

## Critères de fin
`npm run check` passe ; `PROGRESS.md` à jour ; commit `étape 5 : bâtiments`.
