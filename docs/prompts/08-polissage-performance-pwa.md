# Étape 8/9 — Polissage, performance et PWA

Lis `CLAUDE.md` et `PROGRESS.md`. Aucune nouvelle règle de jeu dans cette étape.

## À faire
1. Animations légères (construction, amélioration, recrutement, gains, événements) ; toutes désactivées ou réduites avec `prefers-reduced-motion`.
2. Lisibilité : contrastes AA, tailles de texte, état des boutons, cibles ≥ 44 px, safe areas en portrait et paysage.
3. Performance : aucun recalcul complet par image, DOM mis à jour par différence, abonnements nettoyés, textures réutilisées, poids total du build mesuré et noté dans `PROGRESS.md`.
4. PWA : `manifest.webmanifest` (nom, couleurs, `display: standalone`, `start_url` et `scope` relatifs au `base`), icônes 192/512 et `apple-touch-icon` 180 générées en PNG à partir du SVG, balises meta iOS.
5. **Pas de service worker en V1** (risque de versions incohérentes après déploiement, gain faible). Noter le choix dans `PROGRESS.md`.
6. Sons : seulement si simple, coupés par défaut, avec bouton dans les paramètres. Sinon, ne rien ajouter.

## Critères de fin
`npm run check` passe ; build construit avec `VITE_BASE=/ComptaTycoon/` et manifest valide aux bons chemins ; `PROGRESS.md` à jour ; commit `étape 8 : polissage`.
