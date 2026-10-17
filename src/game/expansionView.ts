/** Révélation d'un nouveau niveau du cabinet. */
import Phaser from 'phaser';
import type { ScreenPoint } from './iso';
import { DEPTH } from './iso';
import { COLORS } from './palette';

import { reducedMotion } from '../settings';

export const prefersReducedMotion = reducedMotion;

export interface RevealTarget {
  /** Point du monde à cadrer. */
  focus: ScreenPoint;
  /** Contour au sol à souligner (losange du nouveau local). */
  outline: ScreenPoint[];
}

/**
 * Révèle un nouveau niveau : la caméra glisse vers lui et un contour lumineux pulse au sol
 * (les nouveaux objets apparaissent d'eux-mêmes, voir OfficeRenderer). Sans animation si
 * l'utilisateur préfère moins de mouvement.
 */
export function playReveal(scene: Phaser.Scene, target: RevealTarget, centerOn: (x: number, y: number) => void, from: { x: number; y: number }): void {
  const { x: cx, y: cy } = target.focus;
  if (prefersReducedMotion()) {
    centerOn(cx, cy);
    return;
  }
  scene.tweens.addCounter({
    from: 0,
    to: 1,
    duration: 700,
    ease: 'Sine.easeInOut',
    onUpdate: (tw) => {
      const t = tw.getValue() ?? 1;
      centerOn(from.x + (cx - from.x) * t, from.y + (cy - from.y) * t);
    },
  });
  const glow = scene.add.graphics().setDepth(DEPTH.overlay);
  glow.lineStyle(6, COLORS.accent, 1).strokePoints(target.outline, true);
  glow.setAlpha(0);
  scene.tweens.add({ targets: glow, alpha: 1, delay: 700, duration: 350, yoyo: true, repeat: 1, onComplete: () => glow.destroy() });
}
