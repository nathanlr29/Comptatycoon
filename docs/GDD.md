# ComptaTycoon — Game Design Document (V1)

Source de vérité des règles. Toutes les valeurs chiffrées sont des **valeurs de départ** : elles vivent dans `src/data/` et peuvent être rééquilibrées sans toucher au code. Si une règle est ambiguë, choisir l'interprétation la plus simple et la noter dans `PROGRESS.md` › Décisions.

## 1. Boucle de jeu
Gagner de l'argent (clic + production passive) → recruter et construire → débloquer départements et technologies → atteindre des objectifs → la carte du cabinet grandit visuellement.
Objectifs : court terme (< 2 min : premiers recrutements), moyen terme (10–30 min : premier département), long terme (plusieurs sessions : Pôle Conseil & Audit, carte complète).

## 2. Ressources
| Ressource | Rôle |
|---|---|
| Argent (€) | Monnaie principale. |
| Réputation (points entiers) | Conditions de déblocage + bonus : production × (1 + 1 % par point), bonus plafonné à +200 %. |

Gains de réputation : construction ou amélioration d'un bâtiment +1, département débloqué +5, objectif atteint (selon l'objectif), Salle de réunion (passif), événement « Client prestigieux ». Pertes : contrôle fiscal non protégé −2 (jamais en dessous de 0).

## 3. Action manuelle
Un seul bouton dans le HUD (« Saisir une facture »), **distinct** du tap sur les bâtiments (le tap sert à sélectionner).
- Gain de base : 1 €. Gain du clic = 1 € × multiplicateurs de clic + (pourcentage du revenu/s accordé par les technologies).
- Le texte flottant `+X €` affiche exactement le montant crédité.
- Améliorations du clic (achats uniques) : « Double écran » 50 € → clic ×2 ; « Raccourcis clavier » 500 € → clic ×2 ; Logiciel OCR (voir §7) → clic ×3.
- Le libellé évolue avec le niveau du Bureau principal : Saisir une facture → Réviser un bilan (niv. 2) → Établir une liasse fiscale (niv. 4). Cosmétique.

## 4. Collaborateurs
| Catégorie | Coût initial | Production | Condition | Compte dans la capacité |
|---|---|---|---|---|
| Alternant | 15 € | 0,5 €/s | — | oui |
| Junior | 120 € | 4 €/s | — | oui |
| Senior | 1 300 € | 30 €/s | réputation ≥ 5 | oui |
| Manager | 14 000 € | 250 €/s | réputation ≥ 20 | oui |
| Associé expert-comptable | voir ci-dessous | 0 €/s | réputation ≥ 10 | non |

- Coût d'un collaborateur = `ceil(coûtInitial × 1,15^n)` où **n = nombre déjà possédés dans cette catégorie** (le prix baisse donc après une démission ; c'est voulu).
- Le joueur est le **premier associé** : 1 associé au départ, gratuit.
- Coût de l'associé suivant = `ceil(25 000 × 4^(a − 1))`, a = nombre d'associés achetés en plus du premier (+1). Soit 25 000 €, 100 000 €, 400 000 €…
- **Capacité d'encadrement** = `associés × 15`. Alternants, juniors, seniors et managers comptent ; les associés non.
- Le moteur refuse l'embauche d'un collaborateur si la capacité est atteinte (raison renvoyée : `capacity_full`). L'embauche d'un associé reste possible à capacité pleine.
- HUD : « 12 / 15 collaborateurs », alerte visuelle à ≥ 80 % et à 100 %.

## 5. Formule de production
```
revenu/s = Σ_catégories (effectif × production × multCatégorie)
           × multGlobal (bâtiments, départements, technologies, portefeuilles)
           × multRéputation
           × multÉvénement (1 ou 2)
```
Les multiplicateurs d'une même famille se **multiplient** entre eux. Une seule fonction `getIncomePerSecond(state, now)` dans `core/economy.ts`, utilisée par le HUD, la simulation et le calcul hors ligne.

## 6. Bâtiments et carte
Carte à **emplacements prédéfinis** (pas d'éditeur libre). Vue de dessus avec légère profondeur (ombres, toits), **pas d'isométrie vraie en V1**. Carte ≈ 2 à 3 fois l'écran dans chaque direction. Parcelles verrouillées : grisées avec cadenas et condition affichée au tap.

États visuels : verrouillé · disponible (constructible) · en chantier (barre de progression) · construit · améliorable (badge).

| Bâtiment | Construction | Niv. max | Effet par niveau | Condition |
|---|---|---|---|---|
| Bureau principal | déjà construit (niv. 1) | 5 | production globale +10 % ; débloque des parcelles | — |
| Open space | 200 € | 5 | alternants et juniors +25 % | — |
| Salle de réunion | 2 500 € | 5 | +1 réputation toutes les 120 s | Bureau principal niv. 2 |
| Salle serveurs | 1 500 € | 3 | production globale +5 % ; requise pour les technologies | — |
| Locaux Pôle Social | 15 000 € | 1 | permet d'acheter le Pôle Social | Bureau principal niv. 2 |
| Locaux Pôle Juridique | 40 000 € | 1 | permet d'acheter le Pôle Juridique | Bureau principal niv. 2 |
| Locaux Conseil & Audit | 250 000 € | 1 | permet d'acheter le Pôle Conseil & Audit | Bureau principal niv. 3 |
| Jardin, fontaine (décor) | 1 000 €, 10 000 € | 1 | +3 réputation à la construction | — |

- Coût d'amélioration du niveau L vers L+1 = `ceil(coûtConstruction × 5^L)`. Bureau principal : 500 €, 5 000 €, 50 000 €, 500 000 €.
- Durée de chantier = `10 s × L²` (L = niveau visé), plafonnée à 10 min. Un chantier se termine aussi pendant l'absence du joueur (son effet compte à partir du retour).
- Un bâtiment a : `id` stable, `type`, `level`, `slotId`, `state`, `buildEndsAt?`. La position vient de `slotId` (données de carte).
- Parcelles : Bureau principal niv. 2 ouvre la zone Est, niv. 3 la zone Nord, niv. 4 la zone décor.
- Le visuel suit toujours l'état : aucun bâtiment n'est dessiné construit s'il est verrouillé ou en chantier.

## 7. Départements et technologies (achats uniques sauf mention)
| Achat | Coût | Prérequis | Effet |
|---|---|---|---|
| Pôle Social (paie, DSN) | 20 000 € | Locaux Pôle Social, réputation ≥ 15 | +150 €/s ; juniors ×1,5 |
| Pôle Juridique (secrétariat, AG, statuts) | 60 000 € | Locaux Pôle Juridique, réputation ≥ 25 | immunité au contrôle fiscal ; seniors ×1,5 |
| Pôle Conseil & Audit (fiscal, stratégie, CAC) | 400 000 € | Locaux Conseil & Audit, réputation ≥ 50 | production globale ×2 ; managers ×1,5 |
| Logiciel OCR | 2 000 € | Salle serveurs | clic ×3 |
| Automatisation de la saisie | 25 000 € | OCR | alternants et juniors ×2 |
| Assistant comptable IA | 250 000 € | Automatisation, Salle serveurs niv. 3 | production globale ×1,5 ; chaque clic ajoute 5 % du revenu/s |
| Rachat de portefeuille clients (**répétable**) | `ceil(10 000 × 1,5^n)` | Pôle Social | production globale +5 % et +2 réputation par rachat |

Un achat unique déjà fait n'est plus proposé (bouton « Acquis »). Un achat répétable affiche son compteur.

## 8. Événements aléatoires
- Uniquement pendant le jeu actif (onglet visible). Jamais pendant l'absence.
- Premier événement au plus tôt après 3 min de jeu ; ensuite intervalle aléatoire de 90 à 150 s.
- Tirage pondéré parmi les événements **éligibles** :

| Événement | Poids | Éligible si | Effet |
|---|---|---|---|
| Période fiscale | 40 | toujours | revenu passif ×2 pendant 20 s ; si déjà active, la durée est remise à 20 s (pas de cumul) |
| Contrôle fiscal | 25 | ≥ 5 collaborateurs | sans Pôle Juridique : perte = `min(10 % du solde, 300 × revenu/s)` et réputation −2 ; avec : notification positive, réputation +1 |
| Démission en cascade | 20 | ≥ 1 collaborateur hors associés | 1 collaborateur part ; catégorie tirée au prorata des effectifs ; jamais un associé |
| Client prestigieux | 15 | toujours | +3 réputation et prime = 60 × revenu/s |

- Aucun effet ne peut rendre un solde, un effectif ou une réputation négatif.
- Chaque événement produit une notification lisible (titre, effet chiffré).

## 9. Objectifs
Liste fixe de 12 à 15 objectifs affichés un ou deux à la fois, avec récompense (argent ou réputation). Exemples : recruter 5 alternants ; atteindre 10 €/s ; construire l'Open space ; recruter un deuxième associé ; débloquer un département ; atteindre 1 000 €/s ; Bureau principal niv. 5. Ils donnent le fil conducteur des premières minutes (pas de tutoriel séparé en V1).

## 10. Temps, absence, sauvegarde
- `lastSimulatedAt` = horodatage jusqu'où la production a été créditée. Toute avance de temps passe par `core/offline.ts` puis met à jour `lastSimulatedAt` : une période n'est jamais comptée deux fois.
- Au chargement et au retour d'onglet caché : delta = `now − lastSimulatedAt`, ramené à `[0 ; 8 h]` (horloge reculée → 0).
- Production d'absence = revenu/s **sans** multiplicateur d'événement × delta. Les effets temporaires expirés pendant l'absence sont retirés.
- Récapitulatif affiché si delta > 60 s : durée prise en compte (et mention si plafonnée), gain, nouveau solde.
- Sauvegarde : toutes les 15 s, après chaque achat, sur `visibilitychange` (caché) et `pagehide`.
- Format : `{ schemaVersion, savedAt, state }` sous une clé **par profil** ; copie de la dernière sauvegarde valide sous une clé de secours du même profil.
- Chargement : JSON invalide ou validation échouée → le jeu démarre quand même, la donnée brute est conservée sous une clé `…corrupt-<horodatage>`, un message propose de restaurer la sauvegarde de secours ou de recommencer.
- Migrations : fonction par version `vN → vN+1`, testée.
- Export / import d'un profil sous forme de texte copiable (secours, en plus du compte joueur de l'étape 10).
- Appeler `navigator.storage.persist()` si disponible.

## 10 bis. Écran d'accueil, joueurs et cabinets
Premier écran du jeu, avant la carte.

**Étape 6 (local, sans réseau)**
- Liste des cabinets de cet appareil (5 au maximum) : nom du cabinet, revenu/s, date de dernière partie. Le dernier joué est en tête avec un grand bouton **Continuer**.
- **Nouveau cabinet** : saisir un nom (2 à 24 caractères), la partie démarre.
- Par cabinet (menu ⋯) : renommer, exporter, supprimer (confirmation en tapant le nom).
- Dans le jeu, Paramètres › **Changer de cabinet** sauvegarde puis revient à l'écran d'accueil.
- Stockage : un index `comptatycoon:profiles` (id, nom, résumé, dates, `ownerUid?`) + une sauvegarde par cabinet `comptatycoon:save:<id>`. Le résumé est mis à jour à chaque sauvegarde pour afficher la liste sans charger les parties.

**Étape 10 (comptes joueur : pseudo + mot de passe)**
- L'écran d'accueil devient : **Se connecter** (pseudo + mot de passe) · **Créer un joueur** (pseudo, mot de passe, nom du premier cabinet) · lien discret **Jouer sans compte** (comportement de l'étape 6).
- Connecté, le joueur voit **ses** cabinets, sur n'importe quel appareil. Un cabinet créé sans compte peut être rattaché au compte ensuite (menu ⋯ › « Sauvegarder sur mon compte »).
- Pseudo : 3 à 20 caractères `a-z 0-9 _ -`, unique, insensible à la casse. Mot de passe : 8 caractères minimum. Formulaires compatibles avec le trousseau iCloud et les gestionnaires de mots de passe (`autocomplete="username"` / `"new-password"` / `"current-password"`), pour que l'iPhone propose de retenir le mot de passe.
- La session reste ouverte sur l'appareil. Si Safari l'efface, le joueur se reconnecte et retrouve tout.
- Mot de passe oublié : pas de récupération sans e-mail. Un e-mail **facultatif** peut être ajouté dans Paramètres › Compte pour permettre la réinitialisation.
- Le jeu reste jouable hors connexion ; la sauvegarde locale reste la source principale, l'envoi en ligne se fait en arrière-plan.

## 11. Formatage des nombres
fr-FR : `1 234 €`, `12,5 k€`, `3,40 M€`, `1,2 Md€`, puis notation scientifique. Revenu/s avec une décimale sous 100 €/s.

## 12. Hors V1 (ne pas implémenter, ne pas afficher)
Prestige / revente du cabinet, comptes, cloud, classements, monétisation, publicités, sons (optionnel en étape 8 si simple), éditeur de carte libre, personnages animés qui se déplacent.
