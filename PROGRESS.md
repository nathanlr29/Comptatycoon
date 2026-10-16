# Avancement ComptaTycoon

> Tenu à jour par Claude Code à la fin de chaque étape. C'est la mémoire entre deux sessions.

## Étapes
- [x] 01 Socle et déploiement
- [x] 02 Cœur métier (économie, recrutement)
- [x] 03 Carte et caméra
- [x] 04 HUD et panneaux (prototype jouable)
- [ ] 05 Bâtiments et construction
  - Cœur fait (16/10/2026) : pièces aménagées depuis un menu, sans « + » sur le plan (consigne de Nathan). `core/buildings.ts` : `canBuild(state, type)` choisit lui-même l'emplacement (`findFreeSlot`, `ROOM_SLOT_IDS` : east-3, north-2, north-3, garden-1..3 ; pôles au plateau, décor à l'espace détente) et refuse `no_space` « Agrandissez le cabinet » ; travaux de 10 s × niveau² (`pending`), réputation +1 par aménagement ou amélioration, +3 pour un décor, salle de réunion +1 / 120 s par niveau. Agrandir le cabinet passe par les mêmes travaux (`canExpand` = conditions d'équipe + `canUpgrade('hq')`), notification au lancement et à la fin. `getBuildingVisual` (travaux / aménagée / améliorable), `effectText`, `durationText`. Sauvegarde : `pending`, niveau 0 et `reputationProgress` relus. Reste : menu des pièces (fil « Menu d'agrandissement ») et dessin des pièces (fil « Vue intérieure »).
- [x] 06 Profils, sauvegarde et progression hors ligne
- [ ] 07 Départements, technologies, événements, objectifs
  - Événements et objectifs faits (16/10/2026). `core/events.ts` + `data/events.ts` : premier événement 3 min après le début, puis toutes les 90 à 150 s, tirage pondéré parmi les éligibles (Période fiscale ×2 pendant 20 s sans cumul, Contrôle fiscal via `resolveTaxAudit`, Démission au prorata des effectifs jamais un associé, Client prestigieux +3 et 60 s de revenu). Tirés seulement par `GameStore.tick` (onglet visible) ; une échéance dépassée de plus d'1 min (absence) est replanifiée sans tirage. Aléatoire injecté (`core/random.ts`, mulberry32 à graine) : séquence reproductible testée. `core/objectives.ts` + `data/objectives.ts` : 14 objectifs dans l'ordre, deux visibles (un seul sur petit écran), action `claimObjective`. Interface : notifications chiffrées, bandeau « Période fiscale ×2 · 20 s », carte d'objectif sous le HUD (`ui/LiveInfo.ts`). Sauvegarde v2 (`nextEventAt`, `claimedObjectives`) avec migration v1 → v2.
  - Pôles, règles du jeu (16/10/2026, avancé) : `src/data/departments.ts` (Pôle Social, Pôle Juridique, Pôle Conseil & Audit, rachat de portefeuille, contrôle fiscal) et `src/core/departments.ts` (prérequis : niveau du cabinet + réputation, sans locaux séparés depuis le 16/10 ; l'espace du pôle apparaît à l'ouverture ; achat unique +5 réputation, effets branchés dans `getMultipliers`, rachat répétable, `resolveTaxAudit` avec immunité du Pôle Juridique). Actions `buyDepartment` et `buyPortfolio`. Tests `tests/departments.test.ts`.
  - Pôles, écrans (16/10/2026) : le bouton « Améliorer » ouvre un panneau à deux onglets (`src/ui/Tabs.ts`) : « Améliorations » et « Développement » (`src/ui/DevelopmentPanel.ts`). Chaque pôle montre ses métiers, ses effets, ses conditions cochées ou non (locaux, réputation, fonds) et un bouton « Ouvrir » ; le rachat de portefeuille suit avec son compteur. `src/ui/departmentViews.ts` ne fait que lire `core/departments.ts`. Les locaux des pôles sur le plan attendent le nouveau rendu « faux 3D » et le menu « Agrandir le cabinet » : d'ici là, la condition « Locaux … aménagés » reste non remplie.
- [ ] 08 Polissage, performance et PWA
  - Partie PWA faite (16/10/2026) : `public/manifest.webmanifest` (`standalone`, `start_url` et `scope` relatifs `./`), icône `public/icons/icon.svg` → PNG 192, 512 (aussi `maskable`) et `apple-touch-icon` 180 générés par `node scripts/generate-icons.mjs` (Playwright/Chromium, hors dépendances ; PNG versionnés), balises iOS dans `index.html`, test `tests/pwa.test.ts`. Vérifié en Chromium sous `/Comptatycoon/` : manifeste sans erreur, icônes en 200, aucune erreur d'installabilité. **Pas de service worker** (risque de versions incohérentes après déploiement, gain faible). Reste : animations, lisibilité, performance, poids du build. À vérifier sur iPhone : Partager › Sur l'écran d'accueil, icône et nom corrects, ouverture plein écran, barre d'état lisible au-dessus du HUD.
- [ ] 09 Recette finale et documentation
- [ ] 10 Comptes joueur : pseudo + mot de passe (Firebase)

## État actuel
Mode café (16/10/2026, demande de Nathan, fil « Mode café »).
- Bouton « Café » sur la carte dès le niveau 2 du cabinet (compte à rebours, pastille quand la pause est prête) → panneau « Pause café » (`ui/CoffeePanel.ts`) : lancer la pause, machine actuelle, machine suivante à acheter. Bandeau « Pause café ×1,5 · 27 s » sous celui de la Période fiscale.
- Règles dans `core/coffee.ts` + `data/coffee.ts` (GDD §8 bis) : effet temporaire `coffeeBreak` dans `state.effects` (donc jamais compté hors ligne, cumulable avec la Période fiscale), délai compté depuis le début de la pause, 4 machines de ×1,5 / 30 s / 5 min à ×2,5 / 45 s / 3 min. Actions `coffeeBreak` et `upgradeCoffeeMachine`, refus `cooling_down`.
- Carte : jusqu'à 4 collaborateurs marchent jusqu'à la machine à café du local voisin puis regagnent leur bureau (`StaffLayer.setCoffeeBreak`, places dans `characters/coffeeSpots.ts`) ; déplacement instantané si `prefers-reduced-motion`.
- Sauvegarde : champ `coffee: { machine, readyAt }` lu par `SaveSchema.readState()` avec valeur par défaut (pas de nouvelle version de schéma).
- À vérifier sur iPhone : bouton « Café » atteignable au pouce au-dessus de « Agrandir », lisibilité du compte à rebours, trajet des personnages fluide.

Nouvelles améliorations (16/10/2026, demande de Nathan : agents d'amélioration, fil « Nouvelles améliorations »).
- 36 achats uniques au lieu de 11 (GDD §3 bis), de 50 € à 50 M€, en cinq rubriques dans l'onglet « Améliorations » : Équipement, Logiciels, Technologies (Salle serveurs), Formations, Certifications et labels, avec « acquis / total » par rubrique.
- Formations : une série de trois paliers par catégorie (× 1,5, × 1,5, × 2) ; un palier n'apparaît qu'après le précédent (`isUpgradeListed`). Certifications : production globale et réputation à l'achat (`reputationGain`). Technologies de l'ancien §7 (Automatisation, Assistant IA) enfin branchées, avec Sauvegarde cloud et Agents IA : `requiresBuilding` (Salle serveurs niv. N terminée), refus `missing_building` « Nécessite : Salle serveurs niv. 2 ».
- Aucune formule de `economy.ts` changée : les effets passent par les champs existants de `UpgradeEffect`. Sauvegarde : aucun nouveau champ.
- `npm run check` : typage OK, 20 fichiers / 191 tests OK, build OK.

Easter eggs (16/10/2026, demande de Nathan, fil « Easter eggs »). Rien n'est annoncé à l'écran avant la découverte ; la liste « Secrets trouvés · N / 9 » n'apparaît dans les Paramètres qu'après le premier.
- 9 secrets (`data/secrets.ts`, règles pures dans `core/secrets.ts`, gestes dans `ui/Secrets.ts`) : 5 appuis rapides sur le solde (balance équilibrée, +0,01 €), 7 sur l'effectif (une phrase de collaborateur au hasard), code Konami au clavier, saisons du calendrier (1er avril, 1er au 20 mai, 31 décembre : message et libellé du bouton d'action), 1 chance sur 20 qu'une Période fiscale soit « la liasse 2065 sous la machine à café » (même effet), 1 000 et 10 000 saisies.
- Aucun effet sur l'équilibrage : seule récompense, 0,01 € une fois. Action `discoverSecret`. Sauvegarde : champ `secrets` (liste vide s'il manque, identifiants inconnus ignorés), sans changement de version.
- `npm run check` : typage OK, 20 fichiers / 185 tests OK, build OK. Vérifié en Chromium (iPhone 13, horloge au 1er avril) : libellé « Lettrer un poisson », appuis sur le solde et l'effectif, Konami, liste dans les Paramètres, aucune erreur console. À vérifier sur iPhone : les appuis rapides sur le HUD ne zooment pas la page.
Clic utile toute la partie (16/10/2026, demande de Nathan : à 9 k€/s, un clic ne rapportait que 12 €).
- Chaque clic ajoute une part du revenu/s actuel : Double écran +1 %, Raccourcis clavier +1 %, Logiciel OCR +2 %, nouvelle **Application de saisie mobile** (75 000 €, après l'OCR, clic ×2 et +3 %). Total 7 % ; l'Assistant comptable IA (§7) ajoutera 5 %. À 9 000 €/s : 654 € par clic au lieu de 12 €.
- `UpgradeEffect.clickIncomeShare` (parts additionnées dans `getMultipliers`) ; `getClickValue` inchangé, le texte flottant affiche toujours le montant crédité. Sauvegarde : aucun nouveau champ.
- `npm run check` : typage OK, 19 fichiers / 177 tests OK, build OK.

Menu « Agrandir le cabinet » (16/10/2026, demande de Nathan, hors étapes).
- Onglets « Locaux » (niveaux du cabinet) et « Pièces » (`ui/RoomsPanel.ts`) : aménager une pièce (`build`), l'améliorer (`upgradeBuilding`), barre d'avancement et temps restant pendant les travaux, raison affichée sinon (« Agrandissez le cabinet », « Bureau principal niv. N requis »…). Toucher une pièce sur la carte ouvre l'onglet « Pièces ». Notification « Travaux terminés ».
- Bouton « Agrandir » sur la carte (pastille quand c'est possible) et dans la fiche du Bureau principal. Le menu liste les 5 niveaux : prix, équipe requise, ce que chaque niveau ajoute. Action `{ type: 'upgradeBuilding', buildingId: 'hq' }` → `canExpand`/`expandFirm` (`core/expansion.ts`), immédiate pour l'instant (l'étape 5 ajoutera la durée de travaux). Production +10 % par niveau au-delà du 1er (`getFirmMultiplier` dans `getMultipliers`).
- Plus aucun « + » ni local « À louer » : un local non loué est le toit de l'immeuble voisin. Au passage de niveau, la caméra glisse vers le nouveau local et le toit s'efface (instantané si `prefers-reduced-motion`).
- `data/expansion.ts` : niveaux, prix, conditions d'équipe, textes du menu. Le niveau du cabinet = l'étape du plan (`stage` de `data/office.ts`, refonte « Vue intérieure ») ; les postes de travail viennent du plan, pas de ce fichier.
- Sauvegarde : aucun nouveau champ (le niveau du cabinet reste celui du Bureau principal).
- À vérifier sur iPhone : bouton « Agrandir » atteignable au pouce, animation fluide, menu lisible en paysage.


Employés visibles (16/10/2026, demande de Nathan, fil « Employés visibles ») : chaque personne du cabinet est assise à son bureau, vue de face en 3/4 (dessus et face avant du bureau visibles). Alternant en sweat à capuche, junior en chemise avec badge, senior chemise-cravate, manager en veste avec tasse, associé en costume au bureau en bois foncé ; une plaque de couleur sur le bureau repère la catégorie. 8 variantes par catégorie, fixes pour une même personne. `core/team.ts` (`getTeam` : ids stables `${role}-${n}`, un départ retire le dernier arrivé) ; `game/characters/` : `seating.ts` (placement pur : personne ne bouge quand un autre arrive ou part), `sprites.ts` (texture de 3 images générée une fois par apparence), `StaffLayer.ts` (pool de sprites, mise à jour seulement si les effectifs changent, frappe au clavier coupée par `prefers-reduced-motion`). Postes de la vue en fausse 3D (`officeSeats.ts`) ; au-delà des postes visibles, pastille « +N » devant l'entrée (`OverflowBadge.ts`).
Étape 6 terminée sauf les chantiers (16/10/2026). **La partie est sauvegardée** : écran d'accueil avec jusqu'à 5 cabinets, rattrapage hors ligne plafonné à 8 h.
- `src/core/offline.ts` : `catchUpOffline` (revenu/s sans effets temporaires × absence plafonnée à 8 h, horloge reculée → 0, effets expirés retirés, `lastSimulatedAt` = now) et `isAbsence` (> 1 min sans simulation). `GameStore` : `catchUp(now)`, `replace(state)`, `onAction(fn)`. Constantes `offlineCapMs`, `offlineSummaryMinMs` dans `balance.ts`. `formatDuration`, `formatDate` dans `format.ts`.
- `src/persistence/` : `SaveSchema.ts` (v1, validation champ par champ qui nomme le champ fautif, migration v0 → v1), `SaveService.ts` (interface, clés), `ProfileStore.ts` (index `comptatycoon:profiles`, 5 cabinets, noms 2 à 24 caractères, résumé mis à jour à chaque sauvegarde, index illisible mis de côté), `LocalSaveService.ts` (clé de secours = sauvegarde valide précédente, données illisibles gardées sous `…:corrupt-<horodatage>`, quota et stockage refusé gérés, export / import texte, `navigator.storage.persist()`).
- `src/main.ts` affiche `ui/ProfileScreen.ts` ; Phaser n'est créé qu'après le choix (`src/session.ts`). Sauvegarde toutes les 15 s, après chaque achat (`store.onAction`), onglet caché et `pagehide` ; rattrapage au chargement, au retour d'onglet et après une veille (> 1 min sans image). Récapitulatif « Pendant votre absence » au-delà d'une minute.
- `ui/Modal.ts`, `ui/saveDialogs.ts` (exporter, importer, renommer, supprimer en retapant le nom), `ui/SettingsPanel.ts` (bouton engrenage au-dessus de « Recentrer » : changer de cabinet, exporter, importer, réinitialiser avec double confirmation). Textes dans `src/data/saveTexts.ts`. Changer de cabinet sauvegarde puis recharge la page.
- Stockage refusé (mode privé) : message et bouton « Jouer sans sauvegarde ».
- Chantiers pendant l'absence (16/10/2026, après l'étape 5) : `catchUpOffline` crédite la production par tranches, chaque chantier échu dans la fenêtre de 8 h s'achève à son heure (réputation et bonus de niveau appliqués ensuite) ; un chantier échu après la fenêtre mais avant le retour s'achève aussi, sans revenu en plus. La réputation des salles de réunion s'accumule sur la fenêtre créditée.
- Le schéma lit aussi `departments` et `portfolios` (vides / 0 s'ils manquent) ; les identifiants d'amélioration ou de pôle inconnus sont ignorés sans rejeter la partie.
- `npm run check` : typage OK, 101 tests OK, build OK.
- Vérifié en Chromium headless (émulation iPhone 13, puis paysage 844 × 390) : création d'un cabinet, sauvegarde après achat (clé principale + secours), absence simulée de 10 h → 8 h créditées (0,5 €/s → +14,4 k€), Paramètres, export, changer de cabinet, import, menu ⋯, sauvegarde corrompue → message, aucun débordement horizontal, aucune erreur console.

Licenciements et nouvelles améliorations (16/10/2026, demande de Nathan, hors étapes).
- Bouton « − » à côté de chaque recrutement (associés compris) : premier appui = indemnité affichée, second appui dans les 3 s = départ. Indemnité = 25 % du prix payé pour le dernier recruté (`BALANCE.severanceShare`). Jamais le dernier associé ; un associé ne part pas si l'équipe dépasserait les places restantes. Actions `dismiss` et `dismissPartner`, `canDismiss`/`canDismissPartner` dans `core/recruitment.ts`.
- 10 améliorations au lieu de 2 (GDD §3 bis) : scanner, OCR, EBICS, EDI, facture électronique, logiciel de révision, GED, tableaux de bord… Effets clic / poste / global dans `data/upgrades.ts`, prérequis et réputation vérifiés par `core/upgrades.ts`. Le Logiciel OCR quitte la table des technologies (§7) : l'étape 7 ne doit pas le recréer, l'Automatisation de la saisie le demande.
- Sauvegarde : aucun nouveau champ d'état ; seulement de nouveaux identifiants possibles dans `upgrades`.
- `npm run check` : typage OK, 10 fichiers / 64 tests OK, build OK.

Vue en fausse 3D (16/10/2026, demande de Nathan) : cabinet en isométrique 2:1 (`src/game/iso.ts`), plan des 5 niveaux d'agrandissement et pièces à place fixe avec postes et mobilier (`src/data/office.ts`), rendu trié en profondeur (`OfficeRenderer.ts`, `isoDraw.ts`, `isoFurniture.ts`), employés assis derrière leur bureau (sièges = `visibleDesks`, `characters/officeSeats.ts`), pièces de l'étape 5 à leur place (travaux avec bâche et barre, pastille « améliorable »), apparition douce de ce qui est nouveau. Plus de `data/map.ts` ni d'emplacements « + ». À vérifier sur iPhone : lisibilité au zoom de départ, pincement, rien de caché sous le bouton « Agrandir ».

Étape 4 terminée (16/10/2026). **Le jeu est jouable** : saisir des factures, recruter, acheter les améliorations du clic, voir la capacité d'encadrement. Une recharge remet la partie à zéro (sauvegarde à l'étape 6).
- `src/main.ts` crée le `GameStore`, la scène (`new MapScene(store)`) et l'interface (`new App(store, game)`), puis appelle `store.tick` à chaque image.
- `src/ui/` : `App.ts` (assemblage), `HUD.ts`, `ActionDock.ts` (bouton d'action + texte flottant `+X €`), `Panel.ts` (feuille du bas sur mobile, panneau latéral ≥ 900 px ; fermeture bouton, Échap, tap hors panneau, glissement vers le bas), `RecruitmentPanel.ts`, `UpgradesPanel.ts`, `BuildingInfo.ts`, `NotificationManager.ts`.
- Textes du jeu dans `src/data/texts.ts` (libellé de l'action selon le niveau du Bureau principal, raisons de refus).
- `npm run check` : typage OK, 7 fichiers / 48 tests OK, build OK.
- Vérifié en Chromium headless (iPhone SE portrait et paysage, bureau 1280 × 800) : 20 saisies = 20 €, recrutement d'un alternant (0,5 €/s, 1 / 15), aucun débordement horizontal, aucune erreur console.

Étape 3 terminée (16/10/2026). La carte est navigable ; l'économie n'est pas encore affichée (étape 4).
- `src/data/map.ts` : monde 2400 × 1800, 4 zones (Cabinet ouvert ; Aile Est, Aile Nord, Jardins ouverts aux niveaux 2, 3, 4 du Bureau principal), 13 emplacements + le Bureau principal.
- `src/game/` : `geometry.ts` (fonctions pures : tap, zoom, limites, sélection, inertie), `CameraController.ts`, `InputController.ts` (glisser, pincer, molette, tap), `MapRenderer.ts` (dessin vectoriel Phaser : sol, allées, arbres, Bureau principal, emplacements en pointillés, zones verrouillées avec cadenas), `MapScene.ts`.
- Événements sur `game.events` pour l'interface : `building:selected` (id ou null), `slot:selected`, `zone:selected`, et `camera:recenter` à émettre.
- Bouton HTML « Recentrer » en bas à droite.
- `npm run check` : typage OK, 7 fichiers / 48 tests OK, build OK.
- Vérifié en Chromium headless (émulation iPhone 13 et bureau 1280 × 800) : tap sur le cabinet = surbrillance, glissement au doigt, pincement, molette, glissement souris, recentrage ; aucune erreur console, pas de zoom ni défilement de la page.

Étape 2 terminée (16/10/2026). Pas encore d'interface pour jouer : le moteur existe et est testé, l'affichage arrive aux étapes 3 et 4.
- `src/data/` : `balance.ts` (constantes), `staff.ts` (collaborateurs), `upgrades.ts` (améliorations du clic).
- `src/core/` : `state.ts`, `economy.ts` (revenu/s, clic, coûts, familles de multiplicateurs dans `getMultipliers`), `recruitment.ts` (capacité, refus motivés, démission), `actions.ts` (`applyAction` pur), `store.ts` (`simulate` à pas fixes de 250 ms + `GameStore`), `format.ts`.
- `npm run check` : typage OK, 5 fichiers / 32 tests OK, build OK.
- Déploiement Pages : le build passe sur GitHub, la publication échoue tant que Pages n'est pas activé dans les paramètres du dépôt (404 « Ensure GitHub Pages has been enabled »).

Étape 1 (16/10/2026) : socle Vite 8 / TypeScript 5.9 / Phaser 3.90.0 / Vitest 5, Node ≥ 22.12. Build sous `/ComptaTycoon/` vérifié en Chromium headless (émulation iPhone 13). Poids : JS 1,2 Mo / 319 Ko gzip (Phaser), CSS 1 Ko.

## Décisions prises
- TypeScript 5.9 plutôt que 7 (récent, outillage moins éprouvé).
- `chunkSizeWarningLimit` à 1300 Ko : Phaser pèse ~1,2 Mo à lui seul, l'avertissement n'apporte rien.
- Le workflow tourne aussi sur les pull requests (typage + tests + build, sans publier) pour vérifier chaque étape avant fusion.
- Branche principale : `main`. Une branche + une pull request par étape, fusionnée automatiquement quand la CI est verte (demande de Nathan).
- Coût de l'associé : `ceil(25 000 × 4^(associés − 1))` avec associés = nombre actuel (joueur compris).
- Bonus du Bureau principal pas encore appliqué : il viendra avec les bâtiments (étape 5).
- `simulate` recalcule le revenu à chaque pas de 250 ms (un effet temporaire peut expirer en cours de route) ; le temps restant (< 250 ms) est gardé pour le tick suivant.
- Graphismes dessinés en vectoriel avec `Phaser.GameObjects.Graphics` (pas de fichiers image) : léger et net à tous les zooms.
- Zoom de 0,5 à 2 (relevé automatiquement si l'écran est plus grand que le monde), zoom initial 0,65 ; caméra bornée par nos propres fonctions (`clampScrollAxis`) plutôt que `camera.setBounds`, pour qu'elles soient testées.
- Tap = moins de 8 px et moins de 250 ms, un seul doigt. Inertie seulement si le doigt bougeait encore au lâcher (< 80 ms).
- Panneaux HTML recréés une fois puis mis à jour champ par champ (`setText` n'écrit que si le texte change).
- Toucher un emplacement vide ne fait rien tant que la construction n'existe pas (étape 5) ; toucher une zone verrouillée affiche sa condition.
- Un test d'architecture interdit à `src/core/` d'importer Phaser, le DOM ou le stockage.

## À vérifier à la main (iPhone, navigateur)
- Ouvrir le site publié sur iPhone (Safari) : pas de zoom ni de défilement de la page, bandeau sous l'encoche.
- iPhone : pincement fluide et centré entre les doigts, inertie agréable (ni trop longue ni trop courte), aucun tap accidentel en fin de glissement.
- iPhone : rotation portrait ↔ paysage sans déformation ni zone vide ; bouton Recentrer atteignable au pouce.
- iPhone : bouton « Saisir une facture » atteignable au pouce, texte `+X €` lisible ; feuille de recrutement qui se ferme en la glissant vers le bas.
- Trackpad Mac : le pincement du trackpad zoome la carte (il arrive comme une molette avec ctrl).
- iPhone : l'écran d'accueil tient sous l'encoche, le clavier ne masque pas le champ « Nom du cabinet », pas de zoom sur le champ.
- iPhone : quitter Safari quelques minutes puis revenir affiche « Pendant votre absence » ; verrouiller l'écran puis déverrouiller aussi.
- iPhone : Exporter › Copier fonctionne, et le texte collé dans Importer sur un autre appareil recrée le cabinet.

## Idées / plus tard
- Améliorations : spécialisations de collaborateurs (un senior « fiscaliste » ou « auditeur » choisi à l'embauche), améliorations de pièces (cafétéria, salle de formation qui réduit le prix des formations), séminaire annuel temporaire (× 2 pendant 60 s, rechargeable), abonnements logiciels avec coût récurrent, objectifs liés aux rubriques (« obtenir ISO 9001 »).
_(Hors périmètre de l'étape en cours.)_
- Mode café, suites possibles : jauge de moral de l'équipe (baisse avec le travail, remonte à la pause), mini-jeu « café parfait » (toucher au bon moment pour un bonus), croissants du vendredi (événement), tasses personnalisées par employé, objectif « Première pause café ».
- Importer un cabinet du même nom qu'un existant : ajouter un suffixe (« (2) ») pour les distinguer.
- Index des cabinets illisible : le reconstruire à partir des clés `comptatycoon:save:*` au lieu de repartir d'une liste vide.
