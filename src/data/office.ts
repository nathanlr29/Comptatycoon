/**
 * Plan du cabinet en fausse 3D (docs/GDD.md §6) : emprise de chaque niveau d'agrandissement,
 * pièces à leur place prédéfinie, postes de travail (un par collaborateur affiché) et mobilier.
 * Coordonnées en cases de la grille isométrique (voir src/game/iso.ts) : x vers le bas à droite,
 * y vers le bas à gauche, origine au coin du fond. Rien n'est dessiné pour une pièce non achetée.
 */

export interface TileRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Côté du bureau par rapport à la personne : `s` = bureau vers +y (bas gauche de l'écran), `e` = vers +x (bas droite).
 * Les personnes font toujours face à l'écran, derrière leur bureau.
 */
export type Facing = 's' | 'e';

/**
 * Poste de travail. (x, y) = point au sol où se dessine la personne (bas-centre du personnage) ;
 * le bureau est devant elle, voir `deskRect`.
 */
export interface Desk {
  x: number;
  y: number;
  facing: Facing;
  /** Poste réservé : `director` = le joueur, `partner` = un associé. Sinon, poste de collaborateur. */
  reserved?: 'director' | 'partner';
}

export type FurnitureType =
  | 'plant'
  | 'cabinet'
  | 'bookshelf'
  | 'sofa'
  | 'meetingTable'
  | 'rack'
  | 'printer'
  | 'coffee'
  | 'reception'
  | 'whiteboard'
  | 'fountain'
  | 'bench'
  | 'parasol'
  | 'lounger';

export interface Furniture {
  type: FurnitureType;
  /** Coin du fond de l'emprise (cases). */
  x: number;
  y: number;
  facing?: Facing;
}

/** Types de pièces, alignés sur les types de bâtiments (docs/GDD.md §6 et src/data/departments.ts). */
export type RoomType =
  | 'headquarters'
  | 'openSpace'
  | 'meetingRoom'
  | 'serverRoom'
  | 'socialWing'
  | 'legalWing'
  | 'advisoryWing'
  | 'garden'
  | 'fountain'
  | 'terrace';

/**
 * Aménagements sans pièce au sol : le parking devant l'immeuble (hors de l'emprise, voir `parkingStalls`)
 * et l'enseigne lumineuse sur le mur du fond (`SIGN_SPAN`).
 */
export type ExteriorType = 'parking' | 'signage';

export const EXTERIOR_TYPES: readonly string[] = ['parking', 'signage'];

/** Tout ce que le plan peut montrer pour un bâtiment acheté. */
export type PlanType = RoomType | ExteriorType;

export interface RoomLayout {
  type: RoomType;
  rect: TileRect;
  /** Niveau d'agrandissement à partir duquel la place existe. */
  minStage: number;
  /** Ouverture de la cloison : côté avant (`s` = bord y + h, `e` = bord x + w) et position le long du bord. */
  door: { side: 's' | 'e'; at: number };
  desks: Desk[];
  furniture: Furniture[];
}

export interface OfficeStage {
  /** 1 = petit bureau de départ. */
  stage: number;
  name: string;
  /** Emprise totale du cabinet à ce niveau, toujours ancrée en (0, 0). */
  size: { w: number; h: number };
  /** Porte d'entrée sur le bord avant (y = h), position x. */
  entranceX: number;
  /** Postes et mobilier de l'espace commun ajoutés par ce niveau (cumulés avec les niveaux précédents). */
  desks: Desk[];
  furniture: Furniture[];
}

/** Emprise du bureau d'un poste (cases) : devant la personne, centré sous elle à l'écran. */
export function deskRect(d: Desk): TileRect {
  return d.facing === 's' ? { x: d.x - 0.2, y: d.y + 0.3, w: 0.9, h: 0.5 } : { x: d.x + 0.3, y: d.y - 0.2, w: 0.5, h: 0.9 };
}

/** Rangée de postes le long de x. */
function row(x: number, y: number, count: number, facing: Facing, step = 1.5): Desk[] {
  return Array.from({ length: count }, (_, i) => ({ x: x + i * step, y, facing }));
}

/** Colonne de postes le long de y. */
function col(x: number, y: number, count: number, facing: Facing, step = 1.5): Desk[] {
  return Array.from({ length: count }, (_, i) => ({ x, y: y + i * step, facing }));
}

export const OFFICE_STAGES: OfficeStage[] = [
  {
    stage: 1,
    name: 'Le petit bureau',
    size: { w: 8, h: 6 },
    entranceX: 7,
    desks: row(3.9, 3.9, 3, 's', 1.4),
    furniture: [{ type: 'plant', x: 7.2, y: 3.2 }, { type: 'printer', x: 3.1, y: 5.2 }],
  },
  {
    stage: 2,
    name: 'Le local voisin',
    size: { w: 12, h: 9 },
    entranceX: 9,
    desks: row(5.6, 7.4, 2, 's', 1.4),
    furniture: [{ type: 'coffee', x: 8.2, y: 8.2 }, { type: 'plant', x: 11.2, y: 8.2 }],
  },
  {
    stage: 3,
    name: 'Le plateau',
    size: { w: 16, h: 11 },
    entranceX: 13,
    desks: [...row(12.8, 7.0, 3, 's', 1.2), ...row(12.8, 8.8, 3, 's', 1.2)],
    furniture: [{ type: 'reception', x: 9, y: 9.4 }, { type: 'plant', x: 0.2, y: 10.2 }],
  },
  {
    stage: 4,
    name: 'L’étage complet',
    size: { w: 20, h: 13 },
    entranceX: 17,
    desks: row(0.9, 11.9, 9, 's', 1.6),
    furniture: [{ type: 'plant', x: 15.4, y: 12.2 }, { type: 'coffee', x: 19.1, y: 12.1 }],
  },
  {
    stage: 5,
    name: 'Le siège',
    size: { w: 24, h: 15 },
    entranceX: 21,
    desks: [...col(21.2, 0.9, 8, 'e', 1.5), ...col(23.2, 0.9, 8, 'e', 1.5), ...row(0.9, 13.9, 12, 's', 1.6)],
    furniture: [{ type: 'plant', x: 20.2, y: 13.2 }, { type: 'sofa', x: 22, y: 13.3 }],
  },
  {
    // Extension à l'est (x 24 → 30) : terrasse au fond, deux pièces du fil « Confort des équipes » au milieu.
    stage: 6,
    name: 'L’annexe',
    size: { w: 30, h: 15 },
    entranceX: 27,
    desks: row(24.9, 13.4, 4, 's', 1.4),
    furniture: [{ type: 'plant', x: 24.1, y: 14.2 }],
  },
  {
    // Extension au sud (y 15 → 20) : pièces des fils « Confort des équipes » (x 0 → 16) et « Cantine » (x 16 → 24), postes à droite.
    stage: 7,
    name: 'Le campus',
    size: { w: 30, h: 20 },
    entranceX: 27,
    desks: [...row(24.8, 16.0, 4, 's', 1.3), ...row(24.8, 18.2, 4, 's', 1.3)],
    furniture: [{ type: 'plant', x: 24.1, y: 15.2 }, { type: 'plant', x: 29.3, y: 15.2 }],
  },
];

export const ROOMS: RoomLayout[] = [
  {
    type: 'headquarters',
    rect: { x: 0, y: 0, w: 3, h: 3 },
    minStage: 1,
    door: { side: 'e', at: 2.2 },
    desks: [
      { x: 1.3, y: 0.9, facing: 's', reserved: 'director' },
      { x: 0.6, y: 2.3, facing: 'e', reserved: 'partner' },
      { x: 2.3, y: 2.1, facing: 's', reserved: 'partner' },
    ],
    furniture: [{ type: 'bookshelf', x: 2, y: 0 }, { type: 'plant', x: 0.1, y: 0.1 }],
  },
  {
    type: 'openSpace',
    rect: { x: 3, y: 0, w: 5, h: 3 },
    minStage: 1,
    door: { side: 's', at: 4 },
    desks: [...row(3.8, 0.7, 3, 's', 1.5), ...row(3.8, 1.9, 3, 's', 1.5)],
    furniture: [{ type: 'plant', x: 7.2, y: 0.1 }],
  },
  {
    type: 'serverRoom',
    rect: { x: 0, y: 3, w: 3, h: 3 },
    minStage: 1,
    door: { side: 'e', at: 4.5 },
    desks: [],
    furniture: [{ type: 'rack', x: 0.2, y: 3.3 }, { type: 'rack', x: 0.2, y: 4.3 }, { type: 'rack', x: 0.2, y: 5.2 }],
  },
  {
    type: 'meetingRoom',
    rect: { x: 8, y: 0, w: 4, h: 3 },
    minStage: 2,
    door: { side: 's', at: 9 },
    desks: [],
    furniture: [{ type: 'meetingTable', x: 9, y: 0.9 }, { type: 'whiteboard', x: 9.5, y: 0 }, { type: 'plant', x: 11.2, y: 0.1 }],
  },
  {
    type: 'socialWing',
    rect: { x: 8, y: 3, w: 4, h: 4 },
    minStage: 2,
    door: { side: 's', at: 9 },
    desks: [...row(8.7, 3.8, 2, 's', 1.8), ...row(8.7, 5.5, 2, 's', 1.8)],
    furniture: [{ type: 'cabinet', x: 11.3, y: 3.1 }, { type: 'cabinet', x: 11.3, y: 4.1 }],
  },
  {
    type: 'legalWing',
    rect: { x: 0, y: 6, w: 5, h: 3 },
    minStage: 2,
    door: { side: 'e', at: 7.5 },
    desks: row(0.9, 7.3, 3, 's', 1.5),
    furniture: [{ type: 'bookshelf', x: 0.1, y: 6 }, { type: 'bookshelf', x: 2, y: 6 }],
  },
  {
    type: 'advisoryWing',
    rect: { x: 12, y: 0, w: 4, h: 6 },
    minStage: 3,
    door: { side: 's', at: 13 },
    desks: [...row(12.8, 3.3, 3, 's', 1.2), ...row(12.8, 4.7, 3, 's', 1.2)],
    furniture: [{ type: 'meetingTable', x: 13, y: 1 }, { type: 'whiteboard', x: 13.5, y: 0 }],
  },
  {
    type: 'garden',
    rect: { x: 16, y: 0, w: 4, h: 5 },
    minStage: 4,
    door: { side: 's', at: 17 },
    desks: [],
    furniture: [
      { type: 'plant', x: 16.2, y: 0.2 },
      { type: 'plant', x: 19.1, y: 0.2 },
      { type: 'plant', x: 16.2, y: 3.9 },
      { type: 'bench', x: 17.3, y: 2 },
    ],
  },
  {
    type: 'fountain',
    rect: { x: 16, y: 5, w: 4, h: 5 },
    minStage: 4,
    door: { side: 's', at: 17 },
    desks: [],
    furniture: [{ type: 'fountain', x: 17, y: 6.5 }, { type: 'plant', x: 16.2, y: 5.2 }, { type: 'plant', x: 19.1, y: 9.1 }],
  },
  {
    type: 'terrace',
    rect: { x: 24, y: 0, w: 6, h: 5 },
    minStage: 6,
    door: { side: 's', at: 25 },
    desks: [],
    furniture: [
      { type: 'parasol', x: 25, y: 0.6 },
      { type: 'parasol', x: 27.6, y: 0.6 },
      { type: 'lounger', x: 25, y: 3.2 },
      { type: 'lounger', x: 26.4, y: 3.2 },
      { type: 'lounger', x: 27.8, y: 3.2 },
      { type: 'plant', x: 29.1, y: 0.2 },
      { type: 'plant', x: 29.1, y: 4.1 },
    ],
  },
];

/**
 * Enseigne lumineuse : position le long du mur du fond (x), hauteur (z, px) sur le mur. Existe dès le petit bureau,
 * au-dessus des deux premières fenêtres, à gauche de l'horloge (src/game/ambient.ts).
 */
export const SIGN_SPAN = { x0: 1.1, x1: 4.7, z0: 68, z1: 83 } as const;

/** Places du parking par niveau du parking (1 place = 1 collaborateur de plus). */
export const PARKING_STALLS_PER_LEVEL = 5;
/** Places par rangée ; une rangée = 2 cases de profondeur, séparée de l'immeuble par un trottoir. */
const STALLS_PER_ROW = 8;
const STALL_W = 1.15;
const PARKING_GAP = 0.9;
const ROW_DEPTH = 2;

/**
 * Places du parking devant l'immeuble, à gauche de l'entrée (hors de l'emprise du cabinet, y > h).
 * Leur position suit la façade avant du niveau atteint : le parking « recule » quand le cabinet s'agrandit.
 */
export function parkingStalls(stage: number, level: number): TileRect[] {
  const { h } = getStage(stage).size;
  const count = Math.max(0, level) * PARKING_STALLS_PER_LEVEL;
  return Array.from({ length: count }, (_, i) => {
    const r = Math.floor(i / STALLS_PER_ROW);
    return { x: 0.4 + (i % STALLS_PER_ROW) * STALL_W, y: h + PARKING_GAP + r * ROW_DEPTH, w: STALL_W, h: ROW_DEPTH };
  });
}

/** Emprise du parking (bitume compris), au moins celle d'un parking de niveau 1. */
export function parkingRect(stage: number, level: number): TileRect {
  const stalls = parkingStalls(stage, Math.max(1, level));
  const rows = Math.ceil(stalls.length / STALLS_PER_ROW);
  const cols = Math.min(stalls.length, STALLS_PER_ROW);
  const { h } = getStage(stage).size;
  return { x: 0, y: h + PARKING_GAP - 0.3, w: 0.8 + cols * STALL_W, h: rows * ROW_DEPTH + 0.6 };
}

export const MAX_STAGE = OFFICE_STAGES.length;

export function getStage(stage: number): OfficeStage {
  const index = Math.min(MAX_STAGE, Math.max(1, Math.floor(stage))) - 1;
  return OFFICE_STAGES[index] as OfficeStage;
}

export function getRoom(type: RoomType): RoomLayout {
  const room = ROOMS.find((r) => r.type === type);
  if (!room) throw new Error(`Pièce inconnue : ${type}`);
  return room;
}

/** Postes visibles : ceux des niveaux atteints, puis ceux des pièces achetées (dans cet ordre). */
export function visibleDesks(stage: number, rooms: readonly RoomType[]): Desk[] {
  const fromStages = OFFICE_STAGES.filter((s) => s.stage <= stage).flatMap((s) => s.desks);
  const fromRooms = ROOMS.filter((r) => r.minStage <= stage && rooms.includes(r.type)).flatMap((r) => r.desks);
  return [...fromRooms.filter((d) => d.reserved), ...fromStages, ...fromRooms.filter((d) => !d.reserved)];
}
