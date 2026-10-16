# Étape 5/9 — Pièces et aménagement

Lis `CLAUDE.md`, `PROGRESS.md` et `docs/GDD.md` §6. Le jeu se passe à l'intérieur du cabinet : un « bâtiment » est une **pièce** aménagée dans un emplacement du plan ; les noms techniques (`buildings`, `build`, `upgrade`) restent.

## À faire
1. `data/buildings.ts` : bâtiments du GDD (sauf locaux de départements : seulement leurs emplacements verrouillés pour l'instant).
2. `core/buildings.ts` : prérequis, coût de construction et d'amélioration, lancement de chantier (`buildEndsAt`), fin de chantier dans `tick`, effets ajoutés aux multiplicateurs de `economy.ts`, réputation gagnée, ouverture des parcelles selon le niveau du Bureau principal.
3. Actions `build(slotId, type)` et `upgrade(buildingId)` avec raisons de refus.
4. Rendu : cinq états visuels distincts (verrouillé, libre, travaux avec barre, aménagé, améliorable). Dessiner chaque pièce avec `game/rooms.ts` (`drawRoom(g, type, level, rect)`, mobilier qui s'enrichit avec le niveau) + badge de niveau ; l'open space montre un poste occupé par alternant ou junior (GDD §6).
5. Panneau bâtiment : statistiques, effet actuel et suivant, coût, durée, bouton Construire / Améliorer avec raison si impossible. Tap sur un emplacement libre → liste des pièces aménageables ici.
6. Animation légère à la fin des travaux et notification.

## Tests obligatoires
Construction refusée sans fonds ou sans prérequis ; chantier terminé après la durée exacte ; amélioration modifie niveau et revenu/s ; parcelles débloquées au bon niveau ; le visuel ne montre jamais « construit » un bâtiment en chantier (teste la fonction qui calcule l'état visuel).

## Critères de fin
`npm run check` passe ; `PROGRESS.md` à jour ; commit `étape 5 : bâtiments`.
