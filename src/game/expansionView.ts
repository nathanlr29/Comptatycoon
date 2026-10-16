/** Locaux pas encore loués et révélation d'un nouveau niveau du cabinet. */
import Phaser from 'phaser';
import type { Rect } from '../data/map';
import { MAP_COLORS as C } from './palette';

type G = Phaser.GameObjects.Graphics;

/** Local pas encore loué : on ne voit que le toit de l'immeuble voisin, rien n'est annoncé. */
export function drawNeighbourRoof(g: G, r: Rect): void {
  g.fillStyle(C.roofs, 1).fillRect(r.x, r.y, r.w, r.h);
  g.lineStyle(2, C.roofsEdge, 1);
  for (let y = r.y + 28; y < r.y + r.h; y += 28) g.lineBetween(r.x, y, r.x + r.w, y);
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export interface RevealTarget {
  /** Toit qui recouvrait le nouveau local (disparaît en fondu), s'il y en a un. */
  cover: G | null;
  /** Zone à cadrer et à souligner. */
  focus: Rect;
}

/**
 * Révèle un nouveau niveau : la caméra glisse vers lui, le toit voisin s'efface,
 * un contour lumineux pulse. Sans animation si l'utilisateur préfère moins de mouvement.
 */
export function playReveal(scene: Phaser.Scene, target: RevealTarget, centerOn: (x: number, y: number) => void, from: { x: number; y: number }): void {
  const cx = target.focus.x + target.focus.w / 2;
  const cy = target.focus.y + target.focus.h / 2;
  if (prefersReducedMotion()) {
    target.cover?.destroy();
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
  if (target.cover) {
    scene.tweens.add({ targets: target.cover, alpha: 0, delay: 500, duration: 900, ease: 'Quad.easeIn', onComplete: () => target.cover?.destroy() });
  }
  const glow = scene.add.graphics().setDepth(12);
  const r = target.focus;
  glow.lineStyle(8, C.accent, 1).strokeRoundedRect(r.x - 6, r.y - 6, r.w + 12, r.h + 12, 16);
  glow.setAlpha(0);
  scene.tweens.add({ targets: glow, alpha: 1, delay: 700, duration: 350, yoyo: true, repeat: 1, onComplete: () => glow.destroy() });
}
