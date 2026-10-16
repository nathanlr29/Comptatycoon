# Étape 3/9 — Carte et caméra

Lis `CLAUDE.md`, `PROGRESS.md` et `docs/GDD.md` §6. La carte est le cœur de l'expérience : la navigation doit être agréable au doigt comme à la souris.

## Graphismes
<!-- Remplacer ce bloc selon la réponse à la question « Graphismes » de la revue. -->
Dessine les bâtiments et le décor toi-même en **SVG** simples et lisibles (formes, toits, ombres portées, une couleur par type), stockés dans `public/assets/` ou générés en textures Phaser. Pas de pixel art détaillé ni d'images lourdes. Un bâtiment doit rester reconnaissable à 48 px de large. Ne reproduis aucun asset ni l'identité visuelle d'un jeu existant.

## À faire
1. `data/map.ts` : taille du monde, emplacements (`slotId`, position, taille, zone), zones verrouillées.
2. `game/GameScene.ts` : sol, allées, emplacements vides, zones verrouillées (grisées + cadenas), Bureau principal au centre.
3. `game/CameraController.ts` :
   - glisser à la souris et à un doigt, avec inertie légère ;
   - molette (zoom centré sur le curseur) et pincement à deux doigts (zoom centré entre les doigts, implémenté à partir des pointeurs Phaser, sans plugin) ;
   - zoom borné (par ex. 0,5 à 2), caméra bornée au monde utile ;
   - bouton « recentrer » sur le Bureau principal.
4. `game/InputController.ts` : distinguer tap et glissement (seuil ≈ 8 px **et** ≈ 250 ms) ; un glissement ou un pincement ne sélectionne jamais un bâtiment.
5. Sélection : tap sur un bâtiment → surbrillance + événement `building:selected(id)` exposé pour l'UI (le panneau vient à l'étape 4). Tap dans le vide → désélection.
6. Les gestes sur le canvas ne doivent pas déclencher le zoom ou le scroll de Safari (`touch-action`, `preventDefault` ciblé, `gesturestart` sur iOS) ; les éléments HTML par-dessus restent cliquables.
7. Redimensionnement et rotation d'écran gérés sans déformation.

## Hors périmètre
Construction, panneaux HTML, économie affichée.

## Critères de fin
`npm run check` passe ; un test unitaire de la logique tap/glissement (extraite en fonction pure) ; liste ajoutée dans `PROGRESS.md` › « À vérifier à la main » (pincement iPhone, inertie, rotation) ; commit `étape 3 : carte et caméra`.
