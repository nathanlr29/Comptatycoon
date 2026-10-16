# Étape 6/9 — Écran d'accueil (cabinets), sauvegarde locale et progression hors ligne

Lis `CLAUDE.md`, `PROGRESS.md` et `docs/GDD.md` §10 et §10 bis.

## À faire
1. `persistence/SaveService.ts` : interface par profil `load(profileId): LoadResult`, `save(profileId, state)`, `remove(profileId)`, `exportText(profileId)`, `importText(text)`. `persistence/ProfileStore.ts` : index des profils (liste, création, renommage, suppression, résumé). Pas d'autre abstraction.
2. `persistence/SaveSchema.ts` : `schemaVersion`, validation manuelle (sans dépendance) de chaque champ, migrations `vN → vN+1`. Commencer en version 1 et fournir une migration factice v0 → v1 testée pour prouver le mécanisme.
3. `persistence/LocalSaveService.ts` : clé principale, clé de secours, conservation des données corrompues, `navigator.storage.persist()`. `localStorage` peut lever une exception (quota, mode privé) : la gérer sans planter.
4. `core/offline.ts` : rattrapage selon le GDD (plafond 8 h, delta négatif → 0, sans multiplicateur d'événement, chantiers terminés, `lastSimulatedAt` avancé une seule fois).
5. Déclencheurs de sauvegarde du GDD ; rattrapage au chargement **et** au retour d'un onglet caché.
6. Écran de retour : durée prise en compte (mention « plafonnée à 8 h » si besoin), gain, nouveau solde.
7. `ui/ProfileScreen.ts` : écran d'accueil du GDD §10 bis, affiché avant la carte (Phaser n'est démarré qu'après le choix du profil, ou la scène est mise en pause). Adapté au mobile, utilisable au pouce. Aucun bouton de connexion avant l'étape 10, mais garde l'écran facile à étendre (zone d'actions en haut).
8. Paramètres : changer de profil, exporter, importer (coller, avec validation, crée un nouveau profil), réinitialiser le profil (double confirmation).
9. README : la sauvegarde est locale à ce navigateur ; sur iPhone, Safari peut effacer les données d'un site non visité depuis 7 jours, et le jeu ajouté à l'écran d'accueil a un stockage séparé de Safari ; utiliser l'export pour changer d'appareil.

## Tests obligatoires
Sauvegarde valide restaurée à l'identique ; JSON invalide → état initial + donnée brute conservée ; champ manquant ou de mauvais type rejeté ; migration v0 → v1 ; absence de 10 h → 8 h créditées ; deux rattrapages successifs avec le même `now` ne créditent qu'une fois ; horloge reculée → 0 ; un effet temporaire expiré pendant l'absence ne s'applique pas ; export puis import = même état ; deux profils ne partagent aucune donnée ; supprimer un profil ne touche pas les autres ; 6ᵉ profil refusé ; le résumé de l'index suit la dernière sauvegarde.

## Critères de fin
`npm run check` passe ; `PROGRESS.md` à jour ; commit `étape 6 : profils et sauvegarde`.
