# ComptaTycoon — Game Design Document (V1)

Source de vérité des règles. Toutes les valeurs chiffrées sont des **valeurs de départ** : elles vivent dans `src/data/` et peuvent être rééquilibrées sans toucher au code. Si une règle est ambiguë, choisir l'interprétation la plus simple et la noter dans `PROGRESS.md` › Décisions.

## 1. Boucle de jeu
Gagner de l'argent (clic + production passive) → recruter et construire → débloquer départements et technologies → atteindre des objectifs → le cabinet s'agrandit visuellement (nouveaux locaux, pièces mieux meublées).
Objectifs : court terme (< 2 min : premiers recrutements), moyen terme (10–30 min : premier département), long terme (plusieurs sessions : Pôle Conseil & Audit, tous les locaux loués).

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
- Les améliorations du clic font partie des équipements et logiciels (§3 bis).
- Le libellé évolue avec le niveau du Bureau principal : Saisir une facture → Réviser un bilan (niv. 2) → Établir une liasse fiscale (niv. 4). Cosmétique.

## 3 bis. Équipements et logiciels (achats uniques)
Onglet « Améliorations ». Affichés par coût croissant ; un achat fait affiche « Acquis » ; un prérequis manquant est affiché en clair (« Nécessite : Scanner de documents »). Ils ne demandent aucun bâtiment : ce sont les premières technologies du cabinet, les suivantes (§7) demandent la Salle serveurs.

| Achat | Coût | Prérequis | Effet |
|---|---|---|---|
| Double écran | 50 € | — | clic ×2 |
| Scanner de documents | 150 € | — | alternants ×2 |
| Raccourcis clavier | 500 € | — | clic ×2 |
| Logiciel OCR | 2 000 € | Scanner | clic ×3 |
| Connexion bancaire EBICS | 4 000 € | — | juniors ×2 |
| Télétransmission EDI | 8 000 € | — | production globale ×1,1 |
| Facture électronique | 12 000 € | Logiciel OCR | alternants et juniors ×1,5 |
| Logiciel de révision | 20 000 € | réputation ≥ 5 | seniors ×2 |
| GED et portail client | 60 000 € | Facture électronique | production globale ×1,25 |
| Tableaux de bord clients | 150 000 € | réputation ≥ 20 | managers ×2 |

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
- **Licenciement** : bouton « − » à côté du bouton de recrutement ; un premier appui affiche l'indemnité, un second appui dans les 3 s confirme. Indemnité = `ceil(prix payé pour le dernier recruté du poste × 25 %)`, soit `ceil(ceil(coûtInitial × 1,15^(n−1)) × 0,25)`. Refusé si personne dans le poste (`nobody_to_dismiss`) ou si l'indemnité n'est pas payable. Le prix d'embauche redescend d'un cran.
- Un associé peut aussi partir (indemnité = 25 % du prix du dernier associé), sauf s'il est le dernier (`last_partner`) ou si l'équipe dépasserait les places restantes (`team_too_large`).
- HUD : « 12 / 15 collaborateurs », alerte visuelle à ≥ 80 % et à 100 %.

## 5. Formule de production
```
revenu/s = Σ_catégories (effectif × production × multCatégorie)
           × multGlobal (bâtiments, départements, technologies, portefeuilles)
           × multRéputation
           × multÉvénement (1 ou 2)
```
Les multiplicateurs d'une même famille se **multiplient** entre eux. Une seule fonction `getIncomePerSecond(state, now)` dans `core/economy.ts`, utilisée par le HUD, la simulation et le calcul hors ligne.

## 6. Le cabinet en fausse 3D : agrandissements, pièces et employés
Le jeu se passe **à l'intérieur** du cabinet, en **vue isométrique** (fausse 3D, cases en losange 2:1) : sols, murs du fond pleine hauteur, cloisons basses entre les pièces, murs avant coupés pour voir dedans, mobilier en volume avec ombres. Caméra : glisser, pincer, molette, bornée au cabinet ; le zoom de départ cadre le petit bureau. Données du plan : `src/data/office.ts` ; projection : `src/game/iso.ts`.

**Aucun emplacement vide n'est affiché** (pas de « + », pas de parcelle en pointillés, pas de local « À louer »). Le joueur agrandit le cabinet et achète ses pièces depuis le menu **« Agrandir le cabinet »** ; chaque achat fait apparaître un nouveau visuel à sa place prédéfinie (pas d'éditeur libre).

**Niveaux d'agrandissement** = niveaux du Bureau principal (mêmes coûts : 500 €, 5 000 €, 50 000 €, 500 000 €, même effet +10 % de production globale par niveau). Chaque niveau agrandit l'emprise du cabinet et ajoute des postes dans l'espace commun :
| Niveau | Nom | Emprise (cases) | Pièces qui y trouvent leur place |
|---|---|---|---|
| 1 | Le petit bureau | 8 × 6 | votre bureau, open space, salle serveurs |
| 2 | Le local voisin | 12 × 9 | salle de réunion, locaux Pôle Social, locaux Pôle Juridique |
| 3 | Le plateau | 16 × 11 | locaux Conseil & Audit |
| 4 | L'étage complet | 20 × 13 | coin plantes, fontaine |
| 5 | Le siège | 24 × 15 | (grand espace commun) |

**Pièces** (même règles et chiffres qu'avant ; une pièce n'est proposée que si le niveau d'agrandissement lui laisse la place) :
| Pièce | Aménagement | Niv. max | Effet par niveau | Condition |
|---|---|---|---|---|
| Bureau principal (votre bureau) | déjà aménagé (niv. 1) | 5 | production globale +10 % ; agrandit le cabinet (tableau ci-dessus) | — |
| Open space | 200 € | 5 | alternants et juniors +25 % | — |
| Salle de réunion | 2 500 € | 5 | +1 réputation toutes les 120 s | Bureau principal niv. 2 |
| Salle serveurs | 1 500 € | 3 | production globale +5 % ; requise pour les technologies | — |
| Locaux Pôle Social | 15 000 € | 1 | permet d'acheter le Pôle Social | Bureau principal niv. 2 |
| Locaux Pôle Juridique | 40 000 € | 1 | permet d'acheter le Pôle Juridique | Bureau principal niv. 2 |
| Locaux Conseil & Audit | 250 000 € | 1 | permet d'acheter le Pôle Conseil & Audit | Bureau principal niv. 3 |
| Coin plantes, fontaine d'intérieur (décor) | 1 000 €, 10 000 € | 1 | +3 réputation à l'aménagement | agrandissement niv. 4 |


**Employés visibles** : chaque collaborateur est un personnage dessiné à un poste de travail (siège + bureau + écran), dans le style de la vue. Ordre de placement : vous et vos associés dans votre bureau (postes réservés), puis l'espace commun, puis les pièces achetées qui ont des postes (open space, locaux des pôles). Au-delà des postes visibles, un compteur « +N » près de l'entrée. Personnages fixes ou à petite animation sur place (pas de déplacement, voir §12).

- Durée de travaux = `10 s × L²` (L = niveau visé), plafonnée à 10 min ; pendant les travaux, la zone concernée montre bâche et barre de progression, jamais la pièce finie. Les travaux se terminent aussi pendant l'absence (effet compté à partir du retour).
- Coût d'amélioration d'une pièce du niveau L vers L+1 = `ceil(coûtConstruction × 5^L)`. Le niveau se voit dans la pièce (mobilier plus fourni et plus cossu) et sur un badge.
- Une pièce a : `id` stable, `type`, `level`, `state`, `buildEndsAt?`. Sa place vient de son type (`ROOMS` dans `src/data/office.ts`) ; l'ancien `slotId` n'est plus utilisé pour la position.
- Le visuel suit toujours l'état : rien n'est dessiné pour ce qui n'est pas acheté.

## 7. Départements et technologies (achats uniques sauf mention)
| Achat | Coût | Prérequis | Effet |
|---|---|---|---|
| Pôle Social (paie, DSN) | 20 000 € | Locaux Pôle Social, réputation ≥ 15 | +150 €/s ; juniors ×1,5 |
| Pôle Juridique (secrétariat, AG, statuts) | 60 000 € | Locaux Pôle Juridique, réputation ≥ 25 | immunité au contrôle fiscal ; seniors ×1,5 |
| Pôle Conseil & Audit (fiscal, stratégie, CAC) | 400 000 € | Locaux Conseil & Audit, réputation ≥ 50 | production globale ×2 ; managers ×1,5 |
| Automatisation de la saisie | 25 000 € | Logiciel OCR (§3 bis), Salle serveurs | alternants et juniors ×2 |
| Assistant comptable IA | 250 000 € | Automatisation, Salle serveurs niv. 3 | production globale ×1,5 ; chaque clic ajoute 5 % du revenu/s |
| Rachat de portefeuille clients (**répétable**) | `ceil(10 000 × 1,5^n)` | Pôle Social | production globale +5 % et +2 réputation par rachat |

Un achat unique déjà fait n'est plus proposé (bouton « Acquis »). Un achat répétable affiche son compteur.

**Pôles : règles précises.**
- Ouvrir un pôle : avoir aménagé ses locaux (pièce `socialWing`, `legalWing`, `advisoryWing` au niveau ≥ 1, travaux finis), la réputation requise et l'argent. Achat unique ; +5 réputation (§2).
- Le +150 €/s du Pôle Social s'ajoute à la production des collaborateurs **avant** les multiplicateurs globaux (bâtiments, pôles, réputation, événement).
- Les multiplicateurs de catégorie des pôles se multiplient avec ceux des améliorations (§3 bis).
- Rachat de portefeuille : bonus global additif `1 + 0,05 × n`, puis multiplié avec les autres sources globales.
- Données : `src/data/departments.ts` (`DEPARTMENTS`, `PORTFOLIO`, `TAX_AUDIT`) ; état : `departments: DepartmentId[]` et `portfolios: number` dans `GameState`.

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
Premier écran du jeu, avant la vue du cabinet.

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
