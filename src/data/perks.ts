import type { UpgradeDefinition } from './upgrades';

/**
 * Confort des équipes et avantages sociaux (docs/GDD.md §3 ter) : des achats uniques de la rubrique « comfort »,
 * enregistrés dans `state.upgrades` comme les autres améliorations. Chacun a un effet réel
 * (production, démissions, recrutement, absence, pause café, encadrement) et un visuel qui n'apparaît qu'une fois acheté.
 */
export type PerkId =
  | 'fruitBasket'
  | 'foosball'
  | 'mutuelle'
  | 'standingDesks'
  | 'cse'
  | 'mealVouchers'
  | 'billiard'
  | 'holidayVouchers'
  | 'napCorner'
  | 'remoteWork'
  | 'teamBuilding';

type Def = Omit<UpgradeDefinition, 'id'>;

export const PERK_CATALOG: Record<PerkId, Def> = {
  fruitBasket: {
    name: 'Corbeille de fruits',
    description: 'Des fruits frais livrés chaque lundi : l’équipe se sent considérée.',
    cost: 300,
    category: 'comfort',
    effect: { resignation: 0.9 },
    effectText: 'Démissions − 10 %',
  },
  foosball: {
    name: 'Baby-foot',
    description: 'Une partie rapide après la clôture mensuelle, et l’ambiance remonte.',
    cost: 2_500,
    category: 'comfort',
    minFirmLevel: 2,
    effect: { global: 1.03, resignation: 0.9 },
    effectText: 'Production + 3 % · démissions − 10 %',
  },
  mutuelle: {
    name: 'Mutuelle d’entreprise renforcée',
    description: 'Optique, dentaire et hospitalisation bien remboursés : un vrai argument à l’embauche.',
    cost: 6_000,
    category: 'comfort',
    minFirmLevel: 2,
    effect: { resignation: 0.85, hireCost: 0.95 },
    effectText: 'Démissions − 15 % · recrutement − 5 %',
  },
  standingDesks: {
    name: 'Bureaux assis-debout',
    description: 'Plateaux électriques réglables : on révise un bilan debout, le dos dit merci.',
    cost: 9_000,
    category: 'comfort',
    requires: 'ergoChairs',
    effect: { global: 1.08 },
    effectText: 'Production + 8 %',
  },
  cse: {
    name: 'Comité social et économique (CSE)',
    description: 'Obligatoire dès 11 salariés : des élus, un budget œuvres sociales et un tableau d’affichage.',
    cost: 15_000,
    category: 'comfort',
    minFirmLevel: 2,
    minStaff: 11,
    reputationGain: 3,
    effect: { resignation: 0.85 },
    effectText: 'Démissions − 15 % · + 3 réputation',
  },
  mealVouchers: {
    name: 'Titres-restaurant',
    description: 'Une carte repas pour chaque collaborateur, financée à 60 % par le cabinet.',
    cost: 30_000,
    category: 'comfort',
    requires: 'cse',
    effect: { resignation: 0.9, hireCost: 0.9 },
    effectText: 'Démissions − 10 % · recrutement − 10 %',
  },
  billiard: {
    name: 'Table de billard',
    description: 'Le rendez-vous de la pause déjeuner : les associés y perdent contre les alternants.',
    cost: 45_000,
    category: 'comfort',
    minFirmLevel: 3,
    effect: { global: 1.1, resignation: 0.9 },
    effectText: 'Production + 10 % · démissions − 10 %',
  },
  holidayVouchers: {
    name: 'Chèques-vacances',
    description: 'Le CSE abonde les congés d’été : tout le monde revient reposé pour la saison fiscale.',
    cost: 70_000,
    category: 'comfort',
    requires: 'cse',
    effect: { global: 1.05, resignation: 0.9 },
    effectText: 'Production + 5 % · démissions − 10 %',
  },
  napCorner: {
    name: 'Coin sieste',
    description: 'Poufs et éclairage tamisé : vingt minutes de sieste et la pause café revient plus vite.',
    cost: 90_000,
    category: 'comfort',
    minFirmLevel: 3,
    effect: { coffeeCooldown: 0.75 },
    effectText: 'Pause café disponible 25 % plus tôt',
  },
  remoteWork: {
    name: 'Télétravail deux jours par semaine',
    description: 'Accès sécurisé aux dossiers depuis chez soi : la production continue même quand vous êtes absent.',
    cost: 150_000,
    category: 'comfort',
    minFirmLevel: 4,
    requires: 'cloudSecurity',
    effect: { offlineBonusMs: 4 * 3_600_000, resignation: 0.85 },
    effectText: 'Absence comptée + 4 h · démissions − 15 %',
  },
  teamBuilding: {
    name: 'Séminaire annuel',
    description: 'Deux jours au vert, ateliers et rallye : les managers encadrent des équipes plus larges.',
    cost: 400_000,
    category: 'comfort',
    requires: 'cse',
    minFirmLevel: 3,
    minReputation: 30,
    reputationGain: 5,
    effect: { staffPerPartner: 2 },
    effectText: '+ 2 places d’encadrement par associé · + 5 réputation',
  },
};

/** Les démissions ne descendent jamais sous ce facteur, quel que soit le cumul des avantages. */
export const MIN_RESIGNATION_FACTOR = 0.25;

/** Bilan affiché en haut de l'onglet « Confort » : « Démissions − 38 % · recrutement − 15 % · … ». */
export function perkSummaryText(e: { resignation: number; hireCost: number; offlineBonusMs: number; coffeeCooldown: number; staffPerPartner: number }): string {
  const less = (factor: number) => `− ${Math.round((1 - factor) * 100)} %`;
  const parts: string[] = [];
  if (e.resignation < 1) parts.push(`Démissions ${less(e.resignation)}`);
  if (e.hireCost < 1) parts.push(`recrutement ${less(e.hireCost)}`);
  if (e.offlineBonusMs > 0) parts.push(`absence + ${Math.round(e.offlineBonusMs / 3_600_000)} h`);
  if (e.coffeeCooldown < 1) parts.push(`pause café ${less(e.coffeeCooldown)} d’attente`);
  if (e.staffPerPartner > 0) parts.push(`+ ${e.staffPerPartner} places par associé`);
  if (parts.length === 0) return 'Des équipes bien installées démissionnent moins, coûtent moins cher à recruter et produisent plus.';
  const text = parts.join(' · ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Objets du plan (cases de src/data/office.ts) qui n'apparaissent qu'une fois l'avantage acheté. */
export type PerkItemType = 'fruitTable' | 'foosball' | 'noticeBoard' | 'billiard' | 'napCorner' | 'visioCart' | 'teamPhoto';

export interface PerkItem {
  type: PerkItemType;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Objet accroché au mur ouest (x = 0) : il n'occupe pas le sol. */
  wall?: boolean;
}

/**
 * Où chaque avantage se voit dans l'espace commun. Le niveau du cabinet exigé à l'achat (`minFirmLevel`)
 * garantit que l'emplacement existe déjà. Le tableau du CSE apparaît avec la mutuelle ou le CSE ;
 * les bureaux assis-debout transforment les postes existants (aucun emplacement).
 */
export const PERK_ITEMS: Partial<Record<PerkId, PerkItem>> = {
  fruitBasket: { type: 'fruitTable', x: 4.4, y: 5.25, w: 0.6, h: 0.5 },
  foosball: { type: 'foosball', x: 5.5, y: 5.3, w: 1.2, h: 0.6 },
  mutuelle: { type: 'noticeBoard', x: 7.7, y: 4.6, w: 0.15, h: 1 },
  cse: { type: 'noticeBoard', x: 7.7, y: 4.6, w: 0.15, h: 1 },
  billiard: { type: 'billiard', x: 1.4, y: 9.4, w: 2.2, h: 1.2 },
  napCorner: { type: 'napCorner', x: 5.5, y: 9.4, w: 1.8, h: 1 },
  remoteWork: { type: 'visioCart', x: 17, y: 10.5, w: 1, h: 0.5 },
  teamBuilding: { type: 'teamPhoto', x: 0, y: 9.6, w: 0, h: 1, wall: true },
};

/** Niveau du cabinet à partir duquel l'emplacement d'un objet existe. */
export function perkItemStage(id: PerkId): number {
  return PERK_CATALOG[id].minFirmLevel ?? 1;
}
