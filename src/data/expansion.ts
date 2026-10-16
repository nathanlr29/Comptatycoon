/**
 * Agrandissement du cabinet (docs/GDD.md §6) : règles et textes du menu « Agrandir le cabinet ».
 * Le niveau du cabinet est le niveau du Bureau principal, et aussi l'étape du plan dessiné
 * (`stage` de src/data/office.ts, refonte « Vue intérieure ») : c'est le plan qui porte les postes de travail.
 * Rien d'un niveau n'est dessiné avant d'être acheté.
 */
export interface ExpansionLevel {
  /** Niveau du cabinet atteint en achetant cette étape (1 = départ). */
  level: number;
  name: string;
  description: string;
  /** Prix pour passer du niveau précédent à celui-ci (0 au départ). */
  cost: number;
  /** Collaborateurs (associés exclus) requis. */
  minStaff: number;
  /** Associés requis, joueur compris. */
  minPartners: number;
  /** Ce que le niveau ajoute, en phrases courtes pour le menu. */
  adds: string[];
}

/** Bonus de production globale par niveau au-delà du premier. */
export const FIRM_BONUS_PER_LEVEL = 0.1;

export const EXPANSION_LEVELS: readonly ExpansionLevel[] = [
  {
    level: 1,
    name: 'Le petit bureau',
    description: 'Votre bureau, un accueil et deux coins de travail.',
    cost: 0,
    minStaff: 0,
    minPartners: 1,
    adds: [],
  },
  {
    level: 2,
    name: 'Le local voisin',
    description: 'On abat la cloison : plus de postes et un coin café.',
    cost: 500,
    minStaff: 5,
    minPartners: 1,
    adds: ['Local voisin, postes et coin café', 'Production +10 %'],
  },
  {
    level: 3,
    name: 'Le plateau',
    description: 'Un grand plateau : plus de postes et de la place pour vos pièces.',
    cost: 7_500,
    minStaff: 12,
    minPartners: 1,
    adds: ['Plateau, postes et accueil', 'Production +10 %'],
  },
  {
    level: 4,
    name: 'L’étage complet',
    description: 'Tout l’étage est à vous : une rangée de postes en plus.',
    cost: 500_000,
    minStaff: 20,
    minPartners: 2,
    adds: ['L’étage entier et ses postes', 'Production +10 %'],
  },
  {
    level: 5,
    name: 'Le siège',
    description: 'Votre cabinet devient un siège, avec un bureau de direction.',
    cost: 25_000_000,
    minStaff: 35,
    minPartners: 3,
    adds: ['Le siège et ses postes', 'Bureau de direction', 'Production +10 %'],
  },
  {
    level: 6,
    name: 'L’annexe',
    description: 'Vous rachetez l’immeuble d’à côté : une annexe et sa terrasse.',
    cost: 2_500_000_000,
    minStaff: 60,
    minPartners: 4,
    adds: ['L’annexe et ses postes', 'Place pour la terrasse', 'Production +10 %'],
  },
  {
    level: 7,
    name: 'Le campus',
    description: 'Tout le bâtiment est au cabinet : un campus de l’expertise comptable.',
    cost: 250_000_000_000,
    minStaff: 75,
    minPartners: 5,
    adds: ['L’aile sud et ses postes', 'Production +10 %'],
  },
];

export const MAX_FIRM_LEVEL = EXPANSION_LEVELS.length;

export function getExpansionLevel(level: number): ExpansionLevel | undefined {
  return EXPANSION_LEVELS.find((l) => l.level === level);
}
