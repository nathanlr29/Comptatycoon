# Étape 2/9 — Cœur métier (économie et recrutement)

Lis `CLAUDE.md`, `PROGRESS.md` et `docs/GDD.md` §2 à §5 et §11. Cette étape ne touche **ni Phaser ni le DOM** : tout est dans `src/core/` et `src/data/`, testé en Node.

## À faire
1. `data/` : tables des collaborateurs, améliorations du clic, constantes (capacité 15, facteur 1,15, coûts des associés).
2. `core/state.ts` : `GameState` sérialisable (objets simples, pas de classes), `createInitialState(now)` : 0 €, 0 réputation, 1 associé, Bureau principal niv. 1.
3. `core/economy.ts` : `getIncomePerSecond`, `getClickValue`, `getHireCost`, `getPartnerCost`, multiplicateurs selon la formule du GDD §5 (prévoir les familles de multiplicateurs même si peu sont utilisées pour l'instant).
4. `core/recruitment.ts` : capacité, `canHire` (renvoie une raison : `insufficient_funds`, `capacity_full`, `locked`), embauche, démission (jamais négatif, jamais un associé).
5. `core/actions.ts` : `click`, `hire`, `buyUpgrade`. Chaque action renvoie `{ state, result }` avec `ok` ou une raison de refus. Le montant crédité par `click` est renvoyé pour l'affichage.
6. `core/store.ts` : `GameStore` avec `getState`, `dispatch`, `subscribe` (désabonnement renvoyé), `tick(now)` qui crédite la production par pas fixes de 250 ms à partir des horodatages (indépendant des FPS).
7. `core/format.ts` : formatage fr-FR du GDD §11.

## Tests obligatoires (Vitest)
Un clic crédite 1 € puis la valeur améliorée ; la production passive après 10 s simulées = 10 × revenu/s ; même résultat avec 1 tick de 10 s ou 40 ticks de 250 ms ; coût × 1,15 par unité possédée ; achat refusé sans fonds (état inchangé) ; un associé ajoute 15 places ; embauche refusée à 15/15 ; embauche d'associé acceptée à 15/15 ; démission jamais négative et jamais sur un associé ; formatage (`1 234 €`, `12,5 k€`, `3,40 M€`).

## Hors périmètre
Bâtiments (sauf le niveau du Bureau principal dans l'état), événements, sauvegarde, interface.

## Critères de fin
`npm run check` passe ; nombre de tests affiché ; `PROGRESS.md` à jour ; commit `étape 2 : cœur métier`.
