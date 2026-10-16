# ComptaTycoon — contexte permanent pour Claude Code

Ce fichier est chargé automatiquement à chaque session. Il contient ce qui est vrai pour **toutes** les étapes.
Les règles du jeu et les chiffres sont dans `docs/GDD.md`. L'avancement est dans `PROGRESS.md`.
Le travail est découpé en étapes : `docs/prompts/01-…md` à `09-…md` (V1), puis `10-…md` (comptes joueur en ligne). Une session = une étape.

## Le projet en une phrase
Jeu de gestion Idle/Tycoon web, mobile-first (iPhone prioritaire), où le joueur fait grandir un cabinet d'expertise comptable sur une carte 2D navigable. Site statique publié sur GitHub Pages, sans backend.

## Stack (imposée, ne pas en changer sans demander)
- TypeScript strict, Vite, **Phaser 3** (dernière 3.x stable ; ne pas utiliser Phaser 4).
- UI de gestion en HTML/CSS par-dessus le canvas Phaser (pas d'UI de gestion dessinée dans Phaser).
- Vitest pour les tests. LocalStorage pour la sauvegarde.
- Aucune autre dépendance d'exécution sans justification écrite dans `PROGRESS.md`. Pas de framework UI (React, Vue…).
- Interdit en V1 : Firebase ou tout service distant, faux écrans de connexion, classes cloud vides.

## Architecture (règle de dépendance stricte)
```
src/
  core/         TypeScript pur. AUCUN import de Phaser, du DOM, de window ou de localStorage.
    state.ts        type GameState + createInitialState()
    actions.ts      actions joueur : fonctions pures (state, action, now) → { state, result }
    economy.ts      revenu/s, valeur du clic, coûts, multiplicateurs
    recruitment.ts  capacité d'encadrement, embauche, démission
    buildings.ts    construction, amélioration, prérequis, chantiers
    events.ts       événements aléatoires (RNG injecté)
    offline.ts      rattrapage du temps écoulé (absence, onglet caché)
    objectives.ts   objectifs et récompenses
    format.ts       formatage des nombres (fr-FR)
    store.ts        GameStore : getState(), dispatch(action), subscribe(fn), tick(now)
  data/         tables d'équilibrage (valeurs de docs/GDD.md), carte, textes
  game/         Phaser : scène, carte, caméra, entrées, rendu des bâtiments. Lit le store, envoie des actions.
  ui/           DOM : HUD, panneaux, notifications. Lit le store, envoie des actions.
  persistence/  SaveService (interface), LocalSaveService, SaveSchema + migrations
  main.ts       assemble le tout
tests/          tests Vitest du core et de la persistance
```
- `game/` et `ui/` ne calculent **jamais** un coût, un gain ou une condition : ils appellent `core/`.
- Le temps (`now`) et l'aléatoire (`rng`) sont **injectés** dans `core/` pour que tout soit testable sans navigateur.
- Simulation à pas fixe (4 ticks/s) basée sur l'horodatage réel, indépendante du nombre d'images par seconde. Le HUD se rafraîchit au plus 4 fois/s et seulement si une valeur affichée a changé.
- Fichiers courts (< 300 lignes). Un fichier = une responsabilité.

## Conventions
- Code et identifiants en anglais, textes du jeu en français (centralisés dans `src/data/`).
- Argent en `number` (euros, décimales autorisées). Coûts arrondis à l'euro supérieur (`Math.ceil`). Affichage arrondi à l'inférieur. Comparaisons faites sur les valeurs brutes, jamais sur les valeurs affichées.
- Couleurs en variables CSS dans `src/styles/` : `--bg #0f172a`, `--card #1e293b`, `--accent #38bdf8`, `--money #10b981`, `--text #f8fafc`, `--text-2 #94a3b8`. La carte peut avoir une palette plus chaude.
- Mobile-first : cibles tactiles ≥ 44×44 px CSS, safe areas (`env(safe-area-inset-*)`), portrait et paysage, pas de débordement horizontal, `touch-action: none` uniquement sur le canvas.
- Respecter `prefers-reduced-motion`.
- Vite `base` lu depuis `process.env.VITE_BASE` (défaut `/`). Ne jamais écrire de chemin absolu commençant par `/assets` en dur ; utiliser `import.meta.env.BASE_URL`.

## Commandes
- `npm run dev` · `npm test` · `npm run build` · `npm run preview`
- `npm run check` = `tsc --noEmit && vitest run && vite build`. Doit passer à la fin de chaque étape.

## Méthode de travail (toutes les étapes)
1. Lire `PROGRESS.md` puis le prompt d'étape. Lire `docs/GDD.md` seulement pour les sections citées par l'étape.
2. Proposer un plan court, puis l'exécuter sans attendre de validation sauf décision majeure (changement de stack, de règle du jeu, suppression de fichiers).
3. Rester dans le périmètre de l'étape. Ce qui est hors périmètre va dans `PROGRESS.md` › « Idées / plus tard ».
4. Aucune fonctionnalité visible à moitié faite : un bouton affiché fonctionne. Ce qui n'existe pas encore n'est pas affiché.
5. Finir par `npm run check`, mettre à jour `PROGRESS.md`, faire **un commit** `étape N : <résumé>`.
6. Ne pas pousser, ne pas créer de dépôt, ne pas modifier les paramètres GitHub sans demande explicite.

## Honnêteté
- Ne jamais dire qu'un test passe sans l'avoir exécuté ; coller la sortie résumée.
- Ne jamais dire que le site est publié sans avoir vu le workflow réussir.
- Aucun test sur iPhone réel n'est possible depuis Claude Code : le dire, et lister ce qui doit être vérifié à la main.
