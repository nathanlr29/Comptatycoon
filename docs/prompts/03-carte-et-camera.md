# Étape 3/9 — Carte et caméra

Lis `CLAUDE.md`, `PROGRESS.md` et `docs/GDD.md` §6. La carte est le cœur de l'expérience : la navigation doit être agréable au doigt comme à la souris.

## Graphismes
> Révisé le 16/10/2026 (demande de Nathan) : le jeu se passe **à l'intérieur** du cabinet (GDD §6). La « carte » est le plan de coupe du bâtiment.

Plan vu de dessus, dessiné en vectoriel (`Phaser.GameObjects.Graphics`, pas de fichiers image) : murs épais avec arête claire, sols différenciés (parquet, moquette, carrelage), mobilier simple, ombres légères, rue en bas avec l'entrée. Couleurs chaudes et lisibles, une teinte de sol par type de pièce. Une pièce doit rester reconnaissable à 48 px de large. Ne reproduis aucun asset ni l'identité visuelle d'un jeu existant.

## À faire
1. `data/map.ts` : taille du plan, emplacements de pièces (`slotId`, position, taille, zone), locaux verrouillés (GDD §6).
2. `game/MapScene.ts` + `game/MapRenderer.ts` : plan du bâtiment (murs, sols, rue), emplacements libres, locaux non loués (dans le noir, « À louer » + cadenas), Bureau principal dans le petit bureau de départ.
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
