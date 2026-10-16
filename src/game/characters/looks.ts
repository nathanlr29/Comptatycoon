/** Apparence des personnes du cabinet, par catégorie. Purement visuel. */
import type { TeamRole } from '../../core/team';

export type Outfit = 'hoodie' | 'shirt' | 'shirtTie' | 'blazer' | 'suit';
export type HairStyle = 'short' | 'long' | 'bun' | 'curly';

export interface RoleStyle {
  outfit: Outfit;
  /** Couleurs de tenue possibles. */
  colors: readonly number[];
  /** Cravate, cordon de badge ou capuche. */
  accents: readonly number[];
  /** Plaque de couleur sur le devant du bureau : repère la catégorie au premier coup d'œil. */
  plate: number;
  premiumDesk: boolean;
  /** Objet posé sur le bureau. */
  prop: 'notes' | 'books' | 'mug' | 'folder' | 'pen';
  greyHair: boolean;
}

export const ROLE_STYLES: Record<TeamRole, RoleStyle> = {
  // Alternant : sweat à capuche de couleur vive, post-it.
  intern: { outfit: 'hoodie', colors: [0x22c55e, 0xf97316, 0xe11d48, 0x8b5cf6], accents: [0xf8fafc], plate: 0x22c55e, premiumDesk: false, prop: 'notes', greyHair: false },
  // Junior : chemise claire, cordon de badge.
  junior: { outfit: 'shirt', colors: [0x93c5fd, 0xf1f5f9, 0xfde68a, 0xa7f3d0], accents: [0x2563eb, 0xdc2626], plate: 0x38bdf8, premiumDesk: false, prop: 'books', greyHair: false },
  // Senior : chemise et cravate.
  senior: { outfit: 'shirtTie', colors: [0xe0e7ff, 0xfce7f3, 0xf8fafc, 0xcffafe], accents: [0x1e3a8a, 0x7f1d1d, 0x14532d], plate: 0xa78bfa, premiumDesk: false, prop: 'folder', greyHair: false },
  // Manager : veste sur chemise blanche, tasse de café.
  manager: { outfit: 'blazer', colors: [0x1e3a5f, 0x52525b, 0x7c2d12, 0x334155], accents: [0xf8fafc], plate: 0xf59e0b, premiumDesk: false, prop: 'mug', greyHair: false },
  // Associé : costume sombre, cravate, bureau en bois foncé à liseré doré.
  partner: { outfit: 'suit', colors: [0x1f2937, 0x111827, 0x27272a], accents: [0xb91c1c, 0xca8a04, 0x1d4ed8], plate: 0xf2c14e, premiumDesk: true, prop: 'pen', greyHair: true },
};

export const SKINS = [0xf6d2b2, 0xe0ac82, 0xb47a52, 0x7a4b2f, 0xf1c7a1] as const;
const HAIR = [0x2b1d14, 0x5a3a22, 0x111111, 0xc8a165, 0x8a3b12] as const;
const GREY = [0x9ca3af, 0xd1d5db, 0x6b7280] as const;
const STYLES: readonly HairStyle[] = ['short', 'long', 'bun', 'curly'];

/** Nombre de variantes par catégorie : borne la mémoire des textures générées. */
export const LOOKS_PER_ROLE = 8;

export interface Look {
  skin: number;
  hair: number;
  hairStyle: HairStyle;
  outfit: number;
  accent: number;
  glasses: boolean;
}

export function getLook(role: TeamRole, index: number): Look {
  const style = ROLE_STYLES[role];
  const i = index % LOOKS_PER_ROLE;
  const hairs = style.greyHair && i % 2 === 0 ? GREY : HAIR;
  return {
    skin: pick(SKINS, i * 3 + 1),
    hair: pick(hairs, i * 5 + 2),
    hairStyle: pick(STYLES, i + (i >> 2)),
    outfit: pick(style.colors, i),
    accent: pick(style.accents, i >> 1),
    glasses: role === 'partner' ? i % 3 !== 2 : i % 4 === 3,
  };
}

function pick<T>(list: readonly T[], i: number): T {
  return list[i % list.length] as T;
}
