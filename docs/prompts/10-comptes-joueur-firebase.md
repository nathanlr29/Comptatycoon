# Étape 10 — Comptes joueur : pseudo + mot de passe (Firebase)

Lis `CLAUDE.md`, `PROGRESS.md` et `docs/GDD.md` §10 et §10 bis. **Cette étape lève l'interdiction de Firebase et des comptes de `CLAUDE.md`**, uniquement pour ce qui est décrit ici ; mets `CLAUDE.md` à jour en conséquence.
Prérequis : l'étape 6 est terminée et `npm run check` passe. Cette étape peut se faire avant ou après les étapes 7 à 9.

## Principe
Le joueur crée un compte avec un **pseudo et un mot de passe** dès le premier écran, et retrouve ses cabinets sur n'importe quel appareil ou après un effacement des données par Safari. « Jouer sans compte » reste possible. Le jeu reste jouable hors connexion ; la sauvegarde locale reste la source principale.

## Avant d'écrire du code
Demande à l'utilisateur de créer un projet Firebase (plan gratuit Spark), d'activer **Firestore** et **Authentication › E-mail/Mot de passe**, d'ajouter `<utilisateur>.github.io` aux domaines autorisés, puis de te coller la configuration web (`apiKey`, `authDomain`, `projectId`, `appId`). Ces valeurs sont publiques par conception : elles vont dans un fichier de config du dépôt, pas dans des secrets. N'avance pas sur les points 3 à 10 sans elles.

## Conception
- Firebase Auth « e-mail / mot de passe ». Le joueur ne saisit pas d'e-mail : le jeu dérive une adresse fictive du pseudo (par ex. `<pseudo>@joueurs.comptatycoon.invalid` ; vérifie que Firebase l'accepte et note le choix). Les mots de passe sont gérés et hachés par Firebase, jamais par le jeu.
- Unicité du pseudo : document `usernames/{pseudoMinuscule}` = `{ uid }`, créé seulement s'il n'existe pas. Si le pseudo est pris après la création du compte Auth, supprimer ce compte et afficher « pseudo déjà pris ».
- Parties : `players/{uid}/cabinets/{cabinetId}` = `{ schemaVersion, savedAt, name, summary, state }`. Même schéma et mêmes migrations que la sauvegarde locale.
- E-mail facultatif (Paramètres › Compte) : `verifyBeforeUpdateEmail` remplace l'adresse fictive par la vraie, ce qui active « Mot de passe oublié ». Ensuite, la connexion se fait avec cet e-mail : le champ de connexion accepte « pseudo ou e-mail », et `usernames/{pseudo}` porte un indicateur `hasEmail` pour afficher « connecte-toi avec ton e-mail » si besoin. Ne jamais exposer l'e-mail dans un document lisible par d'autres.
- Pas de connexion anonyme, Google ou Apple (popups et redirections fragiles sur GitHub Pages avec Safari ; Apple exige un compte développeur payant).

## À faire
1. Dépendance `firebase` (SDK modulaire, `auth` + `firestore` seulement) chargée **en différé** : pas téléchargée pour « Jouer sans compte ». Mesure et note l'impact sur le poids.
2. `persistence/account.ts` : validation du pseudo (3 à 20 caractères `a-z 0-9 _ -`, insensible à la casse) et du mot de passe (8 caractères minimum), dérivation de l'adresse fictive. Pur et testé.
3. `persistence/AccountService.ts` : créer un joueur, se connecter, se déconnecter, ajouter un e-mail, réinitialiser le mot de passe (si e-mail). Messages d'erreur clairs en français (pseudo pris, mauvais mot de passe, hors connexion, trop de tentatives).
4. `persistence/CloudSaveService.ts` : liste, lecture, écriture, suppression des cabinets du joueur connecté.
5. Écran d'accueil (GDD §10 bis) : Se connecter · Créer un joueur (pseudo, mot de passe, confirmation, nom du premier cabinet) · Jouer sans compte. Formulaires avec les bons `autocomplete` et `type="password"` pour que l'iPhone propose d'enregistrer le mot de passe dans le trousseau. Bouton afficher/masquer le mot de passe.
6. Connecté : la liste affiche les cabinets du compte (fusion locale + en ligne). Un cabinet créé sans compte peut être rattaché (menu ⋯ › « Sauvegarder sur mon compte »).
7. Synchronisation : envoi au plus toutes les 3 min, après les achats importants (département, associé, Bureau principal) et au passage en arrière-plan (meilleur effort). Ne jamais bloquer le jeu sur le réseau ; indicateur discret « Sauvegardé en ligne il y a X min » / « Hors ligne ».
8. Conflit : à l'ouverture d'un cabinet, si la version en ligne est plus récente et différente de la locale, montrer les deux (date, solde, revenu/s) et laisser choisir, la plus récente présélectionnée. Ne jamais écraser silencieusement.
9. Déconnexion : dernier envoi, puis retrait des cabinets du compte de cet appareil seulement si l'envoi a réussi (sinon avertir et les garder).
10. `firestore.rules` versionné : `players/{uid}/**` lisible et modifiable uniquement par `uid` ; `usernames/{name}` : `get` autorisé, `create` si `request.resource.data.uid == request.auth.uid` et inexistant, pas d'`update`, `delete` par son propriétaire, `list` interdit ; types et taille des documents contrôlés (par ex. 200 Ko). Explique à l'utilisateur comment les publier (console ou `firebase deploy --only firestore:rules`) ; ne les publie pas toi-même.
11. README : configuration Firebase, données stockées, mot de passe oublié sans e-mail = compte perdu, coût nul dans les limites du plan Spark.

## Tests obligatoires
Sans réseau, avec des faux services : validation du pseudo et du mot de passe ; adresse fictive stable et insensible à la casse ; envoi limité dans le temps ; conflit = choix, jamais d'écrasement ; erreur réseau sans effet sur le jeu ni sur la sauvegarde locale ; rattachement d'un cabinet local ; déconnexion qui garde les données si l'envoi échoue ; migration d'une version en ligne ancienne.

## Hors périmètre
Classements, fonctions serveur, connexion Google ou Apple, monétisation.

## Critères de fin
`npm run check` passe ; « Jouer sans compte » ne télécharge pas Firebase (vérifié dans le build) ; « À vérifier à la main » complété (créer un joueur sur iPhone et accepter l'enregistrement du mot de passe, se connecter sur ordinateur et retrouver la partie, jouer réseau coupé) ; commit `étape 10 : comptes joueur`.
