/**
 * Personnage du cabinet : assis à son bureau (le bureau est dessiné par la vue en fausse 3D,
 * src/game/isoFurniture.ts) ou debout quand il se déplace. Toutes ses images (src/game/characters/poses.ts)
 * sont dessinées une seule fois par apparence dans une texture ; les sprites réutilisent ces textures.
 */
import type Phaser from 'phaser';
import type { TeamRole } from '../../core/team';
import { getLook, ROLE_STYLES } from './looks';
import { drawFrame, FRAME, FRAME_COUNT } from './poses';

/** Taille d'un personnage en unités du monde ; le point d'ancrage est le bas-centre. */
export const CHARACTER = { width: 56, height: 70 } as const;
/** Résolution des textures : net jusqu'au zoom ×2 de la caméra. */
const SCALE = 2;
/** Images rangées sur deux lignes pour rester sous la largeur maximale d'une texture. */
const COLUMNS = Math.ceil(FRAME_COUNT / 2);

/** Animations en boucle d'une apparence. */
export type Motion = 'typing' | 'walkFront' | 'walkBack';
const MOTIONS: Record<Motion, { frames: number[]; rate: number }> = {
  typing: { frames: [1, 0, 1, 2, 1, 0, 1, 1], rate: 5 },
  walkFront: { frames: [FRAME.walkFrontA, FRAME.walkFrontB], rate: 6 },
  walkBack: { frames: [FRAME.walkBackA, FRAME.walkBackB], rate: 6 },
};

export function textureKey(role: TeamRole, look: number): string {
  return `staff:${role}:${look}`;
}

export function animationKey(role: TeamRole, look: number, motion: Motion = 'typing'): string {
  return `${textureKey(role, look)}:${motion}`;
}

/** Crée (une fois) la texture et les animations d'une apparence ; renvoie la clé de texture. */
export function ensureCharacterTexture(scene: Phaser.Scene, role: TeamRole, lookIndex: number): string {
  const key = textureKey(role, lookIndex);
  if (scene.textures.exists(key)) return key;
  const w = CHARACTER.width * SCALE;
  const h = CHARACTER.height * SCALE;
  const g = scene.make.graphics({}, false);
  const look = getLook(role, lookIndex);
  for (let f = 0; f < FRAME_COUNT; f++) {
    g.save();
    g.translateCanvas((f % COLUMNS) * w, Math.floor(f / COLUMNS) * h);
    g.scaleCanvas(SCALE, SCALE);
    drawFrame(g, ROLE_STYLES[role], look, f);
    g.restore();
  }
  g.generateTexture(key, w * COLUMNS, h * 2);
  g.destroy();
  const texture = scene.textures.get(key);
  for (let f = 0; f < FRAME_COUNT; f++) texture.add(f, 0, (f % COLUMNS) * w, Math.floor(f / COLUMNS) * h, w, h);
  for (const [motion, { frames, rate }] of Object.entries(MOTIONS) as [Motion, (typeof MOTIONS)[Motion]][]) {
    scene.anims.create({ key: animationKey(role, lookIndex, motion), frames: frames.map((frame) => ({ key, frame })), frameRate: rate, repeat: -1 });
  }
  return key;
}

export function textureScale(): number {
  return 1 / SCALE;
}
