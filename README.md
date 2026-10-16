# ComptaTycoon

Jeu de gestion Idle/Tycoon, mobile-first : faites grandir votre cabinet d'expertise comptable sur une carte 2D.
Site statique (TypeScript, Vite, Phaser 3), publié sur GitHub Pages, sans backend.

> En développement. L'avancement est suivi dans [`PROGRESS.md`](PROGRESS.md), les règles du jeu dans [`docs/GDD.md`](docs/GDD.md).

## Démarrer

Prérequis : Node.js 22.12 ou plus récent.

```bash
npm install        # installer les dépendances
npm run dev        # serveur local (http://localhost:5173)
npm test           # tests Vitest
npm run build      # version de production dans dist/
npm run preview    # servir dist/ localement
npm run check      # typage + tests + build (à faire passer avant chaque commit)
```

Pour reproduire le build de GitHub Pages en local :

```bash
VITE_BASE=/Comptatycoon/ npm run build
VITE_BASE=/Comptatycoon/ npm run preview   # puis ouvrir http://localhost:4173/Comptatycoon/
```

## Sauvegarde

La partie est enregistrée **dans ce navigateur, sur cet appareil** (`localStorage`) : toutes les 15 s, après chaque achat et quand vous quittez la page. Jusqu'à 5 cabinets par appareil, choisis sur l'écran d'accueil.

- Sur iPhone, Safari peut effacer les données d'un site que vous n'avez pas ouvert depuis 7 jours.
- Le jeu ajouté à l'écran d'accueil a un stockage **séparé** de Safari : ce sont deux parties différentes.
- Pour changer d'appareil ou garder une copie : Paramètres › **Exporter** (texte à copier), puis **Importer** sur l'autre appareil (écran d'accueil ou Paramètres).

## Déploiement GitHub Pages

Le workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) vérifie le typage, lance les tests et construit le jeu à chaque pull request.
À chaque push sur `main`, il publie en plus le dossier `dist/` sur GitHub Pages, sous `https://<utilisateur>.github.io/<dépôt>/`.

À faire une seule fois : **Settings › Pages › Build and deployment › Source : GitHub Actions**.

Vérifier : onglet **Actions**, le workflow « Déploiement GitHub Pages » doit être vert ; l'adresse du site apparaît dans le job `deploy`.

## Développement avec Claude Code

Le travail est découpé en étapes dans [`docs/prompts/`](docs/prompts/). Le contexte permanent est dans [`CLAUDE.md`](CLAUDE.md).
Une session = une étape : `Exécute docs/prompts/0N-….md`.
