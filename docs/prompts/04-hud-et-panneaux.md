# Étape 4/9 — HUD et panneaux : prototype jouable

Lis `CLAUDE.md`, `PROGRESS.md` et `docs/GDD.md` §3 et §4. À la fin de cette étape le jeu doit être **jouable** : cliquer, gagner, recruter, voir la capacité.

## À faire
1. Brancher `GameStore` dans `main.ts` : boucle `requestAnimationFrame` qui appelle `store.tick(Date.now())` ; Phaser et le DOM s'abonnent au store.
2. `ui/HUD.ts` : barre supérieure compacte (solde, revenu/s, réputation, collaborateurs `x / capacité` avec alerte) ; mise à jour ≤ 4 fois/s et seulement des valeurs changées.
3. Bouton d'action manuelle (bas de l'écran, grand, atteignable au pouce) avec texte flottant `+X €` égal au montant renvoyé par l'action.
4. Barre d'onglets ou boutons d'accès : Recrutement, Améliorations. N'affiche pas les onglets dont le contenu n'existe pas encore.
5. `ui/Panel.ts` réutilisable : tiroir bas (bottom sheet) sur mobile, panneau latéral sur grand écran (≥ 900 px) ; fermeture par bouton, tap hors panneau et glissement vers le bas sur mobile ; la caméra garde sa position.
6. `ui/RecruitmentPanel.ts` : une ligne par catégorie (nom, description, effectif, production, coût, bouton). Bouton désactivé avec raison visible (« Fonds insuffisants », « Capacité atteinte : recrutez un associé », « Réputation 5 requise »).
7. Panneau d'améliorations du clic.
8. `ui/NotificationManager.ts` : toasts empilés, auto-fermeture, sans bloquer la carte.
9. Tap sur le Bureau principal → panneau d'information (niveau, effet). L'amélioration viendra à l'étape 5 : pas de bouton pour l'instant.

## Hors périmètre
Construction, sauvegarde (une recharge remet à zéro : c'est normal à ce stade).

## Critères de fin
`npm run check` passe ; aucun débordement horizontal à 375 × 667 et 667 × 375 (vérifie par la CSS et, si un navigateur headless est disponible, par une capture) ; `PROGRESS.md` à jour ; commit `étape 4 : prototype jouable`.
