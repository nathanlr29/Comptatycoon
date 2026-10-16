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
- Gain de base : 1 €. Gain du clic = 1 € × multiplicateurs de clic + part du revenu/s × revenu/s actuel (effets temporaires compris).
- La part du revenu/s est la somme des parts accordées par les améliorations du clic (§3 bis) puis par les technologies (§3 bis, rubrique Technologies) : 0 % au départ, 7 % avec tous les équipements, 12 % avec l'Assistant comptable IA. Elle garde le clic utile toute la partie sans dépasser la production passive (à 5 clics/s et 12 %, le clic rapporte 60 % du revenu/s). Exemple : 9 000 €/s et tous les équipements → 24 € + 630 € = 654 € par clic.
- Le texte flottant `+X €` affiche exactement le montant crédité.
- Les améliorations du clic font partie des équipements et logiciels (§3 bis).
- Le libellé évolue avec le niveau du Bureau principal : Saisir une facture → Réviser un bilan (niv. 2) → Établir une liasse fiscale (niv. 4). Cosmétique.

## 3 bis. Améliorations (achats uniques)
Onglet « Améliorations », en cinq rubriques : Équipement, Logiciels, Technologies (Salle serveurs), Formations, Certifications et labels ; chaque titre de rubrique affiche « acquis / total ». Dans une rubrique, ordre de coût croissant ; un achat fait affiche « Acquis » ; une condition manquante est affichée en clair (« Nécessite : Scanner de documents », « Nécessite : Salle serveurs niv. 2 », « Réputation 25 requise »). Les formations sont des séries de trois paliers : un palier n'apparaît qu'une fois le précédent acquis. Une certification donne en plus de la réputation, une seule fois, à l'achat. Données : `src/data/upgrades.ts` ; conditions : `src/core/upgrades.ts` (`canBuyUpgrade`, `isUpgradeListed`). La Salle serveurs compte à son niveau terminé (pas pendant les travaux).

| Achat | Rubrique | Coût | Conditions | Effet |
|---|---|---|---|---|
| Double écran | Équipement | 50 € | — | clic ×2 ; chaque clic + 1 % du revenu/s |
| Scanner de documents | Équipement | 150 € | — | alternants ×2 |
| Formation tableur | Formations (alternants I) | 300 € | — | alternants ×1,5 |
| Raccourcis clavier | Équipement | 500 € | — | clic ×2 ; chaque clic + 1 % du revenu/s |
| Logiciel OCR | Logiciels | 2 000 € | Scanner | clic ×3 ; chaque clic + 2 % du revenu/s |
| Formation TVA | Formations (juniors I) | 2 500 € | — | juniors ×1,5 |
| Sièges ergonomiques | Équipement | 3 000 € | — | production globale ×1,05 |
| Connexion bancaire EBICS | Logiciels | 4 000 € | — | juniors ×2 |
| Formation au logiciel comptable | Formations (alternants II) | 5 000 € | Formation tableur | alternants ×1,5 |
| Télétransmission EDI | Logiciels | 8 000 € | — | production globale ×1,1 |
| Charte qualité du cabinet | Certifications | 10 000 € | réputation ≥ 5 | production globale ×1,05 ; +3 réputation |
| Logiciel de liasse fiscale | Logiciels | 11 000 € | EDI | seniors ×1,5 |
| Facture électronique | Logiciels | 12 000 € | Logiciel OCR | alternants et juniors ×1,5 |
| Logiciel de révision | Logiciels | 20 000 € | réputation ≥ 5 | seniors ×2 |
| Automatisation de la saisie | Technologies | 25 000 € | Logiciel OCR, Salle serveurs niv. 1 | alternants et juniors ×2 |
| Formation révision et contrôle interne | Formations (seniors I) | 30 000 € | réputation ≥ 5 | seniors ×1,5 |
| Plateforme de pré-comptabilité en ligne | Logiciels | 35 000 € | EBICS | juniors ×1,5 ; seniors ×1,25 |
| Formation clôture des comptes annuels | Formations (juniors II) | 40 000 € | Formation TVA | juniors ×1,5 |
| GED et portail client | Logiciels | 60 000 € | Facture électronique | production globale ×1,25 |
| Tutorat par les seniors | Formations (alternants III) | 65 000 € | Formation au logiciel comptable | alternants ×2 |
| Application de saisie mobile | Logiciels | 75 000 € | Logiciel OCR | clic ×2 ; chaque clic + 3 % du revenu/s |
| Sauvegarde cloud et cybersécurité | Technologies | 100 000 € | Salle serveurs niv. 2 | production globale ×1,15 |
| Tableaux de bord clients | Logiciels | 150 000 € | réputation ≥ 20 | managers ×2 |
| Certification ISO 9001 | Certifications | 180 000 € | Charte qualité, réputation ≥ 25 | production globale ×1,15 ; +5 réputation |
| Assistant comptable IA | Technologies | 250 000 € | Automatisation, Salle serveurs niv. 3 | production globale ×1,5 ; chaque clic + 5 % du revenu/s |
| Formation management d'équipe | Formations (managers I) | 280 000 € | réputation ≥ 20 | managers ×1,5 |
| Formation consolidation et normes IFRS | Formations (seniors II) | 400 000 € | Formation révision | seniors ×1,5 |
| Formation fiscalité des entreprises | Formations (juniors III) | 500 000 € | Formation clôture | juniors ×2 |
| Label RSE du cabinet | Certifications | 800 000 € | ISO 9001, réputation ≥ 40 | production globale ×1,2 ; +8 réputation |
| Logiciel de consolidation de groupe | Logiciels | 1 200 000 € | Tableaux de bord, réputation ≥ 50 | managers ×2 |
| Certification ISO 27001 | Certifications | 2 500 000 € | Sauvegarde cloud, réputation ≥ 60 | production globale ×1,25 ; +10 réputation |
| Formation pilotage de la relation client | Formations (managers II) | 4 000 000 € | Formation management | managers ×1,5 |
| Diplôme d'expertise comptable financé | Formations (seniors III) | 5 000 000 € | Formation IFRS | seniors ×2 |
| Agents IA de révision | Technologies | 8 000 000 € | Assistant IA, réputation ≥ 80 | seniors et managers ×2 |
| Trophée national de l'expertise comptable | Certifications | 25 000 000 € | Label RSE, réputation ≥ 100 | production globale ×1,5 ; +15 réputation |
| Executive MBA | Formations (managers III) | 50 000 000 € | Formation relation client | managers ×2 |

Ordres de grandeur : chaque série de formations multiplie sa catégorie par 4,5 ; toutes les améliorations ensemble multiplient la production globale par environ 4,9. Les paliers chers visent la fin de partie (5ᵉ et 6ᵉ associés, Pôle Conseil & Audit).

## 4. Collaborateurs
| Catégorie | Coût initial | Production | Condition | Compte dans la capacité |
|---|---|---|---|---|
| Alternant | 15 € | 0,5 €/s | — | oui |
| Junior | 120 € | 4 €/s | — | oui |
| Senior | 1 300 € | 30 €/s | réputation ≥ 5 | oui |
| Manager | 20 000 € | 250 €/s | réputation ≥ 20 | oui |
| Associé expert-comptable | voir ci-dessous | 0 €/s | réputation ≥ 10 | non |

- Coût d'un collaborateur = `ceil(coûtInitial × hausse^n)` où **n = nombre déjà possédés dans cette catégorie** (le prix baisse donc après une démission ; c'est voulu). Hausse : 1,15 pour alternants et juniors, 1,2 pour les seniors, 1,25 pour les managers (rééquilibrage du 16/10/2026 : à capacité limitée, une hausse unique de 1,15 rendait seniors et managers presque gratuits en milieu de partie).
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
           × multMode (§13) × multRéseau (§14)
           × multÉvénement (1 ou 2)
```
Les multiplicateurs d'une même famille se **multiplient** entre eux. Une seule fonction `getIncomePerSecond(state, now)` dans `core/economy.ts`, utilisée par le HUD, la simulation et le calcul hors ligne.

## 6. Le cabinet en fausse 3D : agrandissements, pièces et employés
Le jeu se passe **à l'intérieur** du cabinet, en **vue isométrique** (fausse 3D, cases en losange 2:1) : sols, murs du fond pleine hauteur, cloisons basses entre les pièces, murs avant coupés pour voir dedans, mobilier en volume avec ombres. Caméra : glisser, pincer, molette, bornée au cabinet ; le zoom de départ cadre le petit bureau. Données du plan : `src/data/office.ts` ; projection : `src/game/iso.ts`.

**Aucun emplacement vide n'est affiché** (pas de « + », pas de parcelle en pointillés, pas de local « À louer »). Le joueur agrandit le cabinet depuis le menu **« Agrandir le cabinet »** (bouton « Agrandir », ou fiche du Bureau principal) et y achète ses pièces ; chaque achat fait apparaître un nouveau visuel à sa place prédéfinie, avec une courte animation d'apparition (aucune si `prefers-reduced-motion`). Pas d'éditeur libre.

Niveaux du cabinet = niveaux du Bureau principal = étape du plan dessiné (`src/data/expansion.ts` pour prix et conditions, `src/data/office.ts` pour l'emprise, les postes et les places des pièces) :
| Niv. | Nom | Prix | Équipe requise | Emprise (cases) | Pièces qui y trouvent leur place |
|---|---|---|---|---|---|
| 1 | Le petit bureau | départ | — | 8 × 6 | votre bureau, open space, salle serveurs |
| 2 | Le local voisin | 500 € | 5 collaborateurs | 12 × 9 | salle de réunion ; place pour le Pôle Social et le Pôle Juridique |
| 3 | Le plateau | 7 500 € | 12 collaborateurs | 16 × 11 | place pour le Pôle Conseil & Audit |
| 4 | L'étage complet | 500 000 € | 20 collaborateurs, 2 associés | 20 × 13 | coin plantes, fontaine |
| 5 | Le siège | 25 000 000 € | 35 collaborateurs, 3 associés | 24 × 15 | (grand espace commun) |

Chaque niveau au-delà du 1er : production globale +10 % et de nouveaux postes dans l'espace commun.

États visuels d'une pièce : en travaux (bâche, rubalise, barre de progression) · aménagée (pièce meublée) · améliorable (badge).

**Pièces** (même règles et chiffres qu'avant ; une pièce n'est proposée que si le niveau d'agrandissement lui laisse la place) :
| Pièce | Aménagement | Niv. max | Effet par niveau | Condition |
|---|---|---|---|---|
| Bureau principal (votre bureau) | déjà aménagé (niv. 1) | 5 | production globale +10 % par niveau au-delà du 1er ; agrandit le cabinet (menu « Agrandir le cabinet », tableau ci-dessus) | — |
| Open space | 200 € | 5 | alternants et juniors +25 % | — |
| Salle de réunion | 2 500 € | 5 | +1 réputation toutes les 120 s | Bureau principal niv. 2 |
| Salle serveurs | 1 500 € | 3 | production globale +5 % ; requise pour les technologies | — |
| Coin plantes, fontaine d'intérieur (décor) | 1 000 €, 10 000 € | 1 | +3 réputation à l'aménagement | agrandissement niv. 4 |


**Employés visibles** : chaque collaborateur est un personnage dessiné à un poste de travail (siège + bureau + écran), dans le style de la vue. Ordre de placement : vous et vos associés dans votre bureau (postes réservés), puis l'espace commun, puis les pièces achetées qui ont des postes (open space, espaces des pôles ouverts). Au-delà des postes visibles, un compteur « +N » près de l'entrée. Personnages fixes ou à petite animation sur place (pas de déplacement, voir §12).

- Durée de travaux = `10 s × L²` (L = niveau visé), plafonnée à 10 min ; pendant les travaux, la zone concernée montre bâche et barre de progression, jamais la pièce finie. Les travaux se terminent aussi pendant l'absence (effet compté à partir du retour).
- Coût d'amélioration d'une pièce du niveau L vers L+1 = `ceil(coûtConstruction × 5^L)`. Le niveau se voit dans la pièce (mobilier plus fourni et plus cossu) et sur un badge.
- Une pièce a : `id` stable, `type`, `level`, `state`, `buildEndsAt?`. Sa place vient de son type (`ROOMS` dans `src/data/office.ts`) ; l'ancien `slotId` n'est plus utilisé pour la position.
- Le visuel suit toujours l'état : rien n'est dessiné pour ce qui n'est pas acheté.

## 7. Départements (achats uniques sauf mention)
Les technologies (Automatisation de la saisie, Assistant comptable IA…) sont dans l'onglet « Améliorations », rubrique Technologies (§3 bis).

| Achat | Coût | Prérequis | Effet |
|---|---|---|---|
| Pôle Social (paie, DSN) | 50 000 € | cabinet niv. 2, réputation ≥ 15 | +150 €/s ; juniors ×1,5 |
| Pôle Juridique (secrétariat, AG, statuts) | 500 000 € | cabinet niv. 2, réputation ≥ 25 | immunité au contrôle fiscal ; seniors ×1,5 |
| Pôle Conseil & Audit (fiscal, stratégie, CAC) | 20 000 000 € | cabinet niv. 3, réputation ≥ 50 | production globale ×2 ; managers ×1,5 |
| Rachat de portefeuille clients (**répétable**) | `ceil(10 000 × 1,5^n)` | Pôle Social | production globale +5 % et +2 réputation par rachat |

Un achat unique déjà fait n'est plus proposé (bouton « Acquis »). Un achat répétable affiche son compteur.

**Pôles : règles précises.**
- Les pôles s'installent **dans les locaux du cabinet** : pas de locaux séparés à aménager (demande de Nathan, 16/10/2026). Seule condition de place : le niveau du cabinet (`minFirmLevel`, menu « Agrandir le cabinet »), sinon refus « Agrandissez le cabinet ».
- Ouvrir un pôle : niveau du cabinet suffisant, réputation requise et argent. Achat unique ; +5 réputation (§2). L'espace du pôle (types `socialWing`, `legalWing`, `advisoryWing`, place fixe dans `src/data/office.ts`) apparaît aussitôt dans le cabinet, sans chantier ; il n'est pas dans le menu des pièces.
- Le +150 €/s du Pôle Social s'ajoute à la production des collaborateurs **avant** les multiplicateurs globaux (bâtiments, pôles, réputation, événement).
- Les multiplicateurs de catégorie des pôles se multiplient avec ceux des améliorations (§3 bis).
- Rachat de portefeuille : bonus global additif `1 + 0,05 × n`, puis multiplié avec les autres sources globales.
- Contrôle fiscal : la perte d'argent ne dépasse jamais le solde ; avec le Pôle Juridique, aucune perte et +1 réputation (§8). L'effet est dans `resolveTaxAudit` (`src/core/departments.ts`), le tirage viendra avec le moteur d'événements.
- Données : `src/data/departments.ts` (`DEPARTMENTS`, `PORTFOLIO`, `TAX_AUDIT`) ; état : `departments: DepartmentId[]` et `portfolios: number` dans `GameState`.

## 8. Événements aléatoires
- Uniquement pendant le jeu actif (onglet visible). Jamais pendant l'absence.
- Premier événement au plus tôt après 3 min de jeu ; ensuite intervalle aléatoire de 90 à 150 s.
- Tirage pondéré parmi les événements **éligibles** :

| Événement | Poids | Éligible si | Effet |
|---|---|---|---|
| Période fiscale | 40 | toujours | revenu passif ×2 pendant 20 s ; si déjà active, la durée est remise à 20 s (pas de cumul) |
| Contrôle fiscal | 25 | ≥ 5 collaborateurs | sans Pôle Juridique : perte = `min(10 % du solde, 300 × revenu/s)` × facteur du mode (§13) et réputation −2 ; avec : notification positive, réputation +1 |
| Démission en cascade | 20 | ≥ 1 collaborateur hors associés | 1 collaborateur part ; catégorie tirée au prorata des effectifs ; jamais un associé |
| Client prestigieux | 15 | toujours | +3 réputation et prime = 60 × revenu/s |

- Aucun effet ne peut rendre un solde, un effectif ou une réputation négatif.
- Chaque événement produit une notification lisible (titre, effet chiffré).

## 8 bis. Mode café (pause café)
- Disponible dès le niveau 2 du cabinet (« Le local voisin », où apparaît la machine à café). Avant, le bouton n'est pas affiché.
- Bouton « Café » sur la carte (au-dessus de « Agrandir ») → panneau « Pause café ». Le joueur lance la pause quand il veut : c'est un coup de pouce actif, à combiner avec une Période fiscale (les effets se multiplient).
- Pendant la pause, le revenu passif est multiplié (effet temporaire, comme la Période fiscale) et jusqu'à 4 collaborateurs quittent leur bureau pour la machine, puis reviennent à la fin.
- Le délai court depuis le début de la pause. Il s'écoule aussi pendant l'absence, mais la pause ne compte jamais dans le rattrapage hors ligne.
- Machines (achat dans le panneau, une à une) :

| Machine | Prix | Revenu | Durée | Une pause toutes les |
|---|---|---|---|---|
| Cafetière filtre | fournie | ×1,5 | 30 s | 5 min |
| Machine à capsules | 2 500 € | ×1,75 | 30 s | 4 min |
| Expresso à grain | 40 000 € | ×2 | 40 s | 3 min 30 s |
| Comptoir de barista | 600 000 € | ×2,5 | 45 s | 3 min |

- Gain moyen pour un joueur qui relance dès que possible : +5 % (cafetière) à +38 % (barista) du revenu passif.
- Sauvegarde : `coffee: { machine, readyAt }` ; absent des anciennes parties → cafetière, pause disponible.

## 9. Objectifs
Liste fixe de 12 à 15 objectifs affichés un ou deux à la fois, avec récompense (argent ou réputation). Exemples : recruter 5 alternants ; atteindre 10 €/s ; construire l'Open space ; recruter un deuxième associé ; débloquer un département ; atteindre 1 000 €/s ; Bureau principal niv. 5. Ils donnent le fil conducteur des premières minutes (pas de tutoriel séparé en V1).

## 10. Temps, absence, sauvegarde
- `lastSimulatedAt` = horodatage jusqu'où la production a été créditée. Toute avance de temps passe par `core/offline.ts` puis met à jour `lastSimulatedAt` : une période n'est jamais comptée deux fois.
- Au chargement et au retour d'onglet caché : delta = `now − lastSimulatedAt`, ramené à `[0 ; plafond]` (horloge reculée → 0). Plafond : 8 h en Classique, 12 h en Détente, 4 h en Exigeant (§13).
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
- **Nouveau cabinet** : saisir un nom (2 à 24 caractères) et choisir la difficulté (§13, Classique par défaut), la partie démarre. La carte d'un cabinet rappelle son mode s'il n'est pas Classique.
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
Comptes, cloud, classements, monétisation, publicités, sons (optionnel en étape 8 si simple), éditeur de carte libre, personnages animés qui se déplacent.

## 13. Modes de difficulté
Choisis à la fondation du cabinet (écran d'accueil), **définitifs** : rappelés dans Paramètres et sur la carte du cabinet. Une réinitialisation garde le mode. Données : `src/data/difficulty.ts` ; règles : `src/core/difficulty.ts`.

| Mode | Production passive | Absence créditée | Contrôle fiscal | Démissions | Contacts à la cession (§14) |
|---|---|---|---|---|---|
| Détente | ×1,5 | 12 h | poids ×0,5, perte ×0,5 | poids ×0,5 | ×1 |
| Classique (défaut) | ×1 | 8 h | inchangé | inchangé | ×1 |
| Exigeant | ×0,7 | 4 h | poids ×1,6, perte ×1,5 | poids ×1,5 | ×1,5 |

- Le facteur de production s'applique avec le réseau (§14) après la réputation : `revenu/s = … × multRéputation × multMode × multRéseau × multÉvénement`. Le gain de base du clic (1 €) n'est pas modifié ; la part du revenu/s ajoutée au clic suit le revenu.
- Les anciennes sauvegardes sans mode sont relues en Classique (aucun changement de version de schéma).

## 14. Cession du cabinet (prestige)
Onglet **« Cession »** du panneau « Améliorer ». Quand le cabinet a atteint **Le siège** (niveau 5), le joueur peut le céder à un confrère et repartir du petit bureau en gardant son **réseau** : des contacts qui augmentent la production pour toujours.
- Contacts gagnés = `floor(√(chiffre d'affaires de la partie / 1 000 000) × facteur du mode)` : 10 contacts à 100 M€, 31 à 1 Md€, 100 à 10 Md€. Cession refusée si elle rapporte 0 contact.
- Chaque contact : production +10 % (bonus additif `1 + 0,1 × contacts`, multiplié avec les autres sources).
- Gardés : contacts, nombre de cessions, chiffre d'affaires cumulé des parties précédentes, mode de difficulté, date de fondation. Tout le reste repart de zéro (argent, équipe, associés, améliorations, pièces, pôles, réputation, objectifs, statistiques de la partie).
- Confirmation obligatoire (fenêtre qui rappelle le total de contacts et ce qui est perdu). Après la cession, la caméra se recentre sur le petit bureau.
- État : `prestige: { contacts, sales, pastEarned }` dans `GameState`, lu par `SaveSchema.readState()` (absent = aucun contact). Action `{ type: 'sellFirm' }` ; règles dans `src/core/prestige.ts`, chiffres dans `src/data/prestige.ts`.
- Rythme mesuré par le joueur simulé (`npm run simulate`, 2 saisies/s, achète tout dès que possible, avec les 36 améliorations) : Pôle Social vers 10 min, Le siège et première cession vers 23 min ; chaque partie suivante atteint le siège en 10 à 15 min et le réseau double à chaque cession. Un vrai joueur, qui ne clique ni n'achète en continu, va nettement moins vite.
