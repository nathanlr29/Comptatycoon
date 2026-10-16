# Étape 7/9 — Départements, technologies, événements, objectifs

Lis `CLAUDE.md`, `PROGRESS.md` et `docs/GDD.md` §6 à §9.

## À faire
1. Locaux des départements constructibles (déjà prévus sur la carte), puis achat du département dans le panneau du bâtiment.
2. `data/departments.ts`, `data/technologies.ts` ; effets branchés dans `economy.ts`. Achats uniques non rachetables (« Acquis »), rachat de portefeuille répétable avec compteur.
3. Onglet « Développement » : départements et technologies, prérequis manquants affichés en clair.
4. `core/events.ts` avec RNG injecté (seedable) : planification, tirage pondéré parmi les éligibles, effets, expiration, aucune valeur négative. Pas d'événement onglet caché ni pendant l'absence.
5. Affichage des événements : bandeau pour la Période fiscale avec compte à rebours, notifications chiffrées pour les autres.
6. `core/objectives.ts` + `data/objectives.ts` : 12 à 15 objectifs du GDD §9, un ou deux visibles dans le HUD, récompense réclamable.
7. Mettre à jour `SaveSchema` (nouvelle version + migration) pour les nouveaux champs.

## Tests obligatoires
Départements et technologies : coût, prérequis, effet sur le revenu, pas de double achat ; Pôle Juridique immunise ; perte du contrôle plafonnée ; Démission ignorée si aucun collaborateur et jamais sur un associé ; Période fiscale ×2 puis retour à ×1 après 20 s exactement, sans cumul ; avec une graine fixe, la séquence d'événements est reproductible ; migration de sauvegarde v1 → v2.

## Critères de fin
`npm run check` passe ; `PROGRESS.md` à jour ; commit `étape 7 : contenu`.
