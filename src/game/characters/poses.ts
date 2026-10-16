/**
 * Toutes les images d'un personnage, dans une image de 56 × 70 unités dont le bas-centre (28, 66)
 * est posé au sol. Assis : derrière son bureau, vu de face en 3/4. Debout : en marche ou en discussion.
 */
import type Phaser from 'phaser';
import { darken, drawHead, drawTorso } from './body';
import type { Look, RoleStyle } from './looks';

type G = Phaser.GameObjects.Graphics;

/** Index des images dans la texture d'une apparence. */
export const FRAME = {
  typeLeft: 0,
  rest: 1,
  typeRight: 2,
  phone: 3,
  stretch: 4,
  sip: 5,
  cheer: 6,
  walkFrontA: 7,
  walkFrontB: 8,
  walkBackA: 9,
  walkBackB: 10,
  talk: 11,
  chair: 12,
  stand: 13,
  standSip: 14,
} as const;
export const FRAME_COUNT = 15;

const SHADOW = 0x0f172a;
const SHOES = 0x1f2937;
/** Les personnages debout sont dessinés 7 unités plus haut qu'assis (buste et tête). */
const STAND_LIFT = 7;

export function drawFrame(g: G, style: RoleStyle, look: Look, frame: number): void {
  switch (frame) {
    case FRAME.chair:
      g.fillStyle(SHADOW, 0.14).fillEllipse(28, 66, 30, 6);
      return chair(g, style);
    case FRAME.walkFrontA:
    case FRAME.walkFrontB:
      return standing(g, style, look, { back: false, step: frame === FRAME.walkFrontA ? 1 : -1 });
    case FRAME.walkBackA:
    case FRAME.walkBackB:
      return standing(g, style, look, { back: true, step: frame === FRAME.walkBackA ? 1 : -1 });
    case FRAME.talk:
      return standing(g, style, look, { back: false, step: 0, hands: 'talk' });
    case FRAME.stand:
      return standing(g, style, look, { back: false, step: 0 });
    case FRAME.standSip:
      return standing(g, style, look, { back: false, step: 0, hands: 'sip' });
    default:
      return seated(g, style, look, frame);
  }
}

function sleeveOf(style: RoleStyle, look: Look): number {
  return style.outfit === 'shirt' || style.outfit === 'shirtTie' ? look.outfit : darken(look.outfit);
}

function chair(g: G, style: RoleStyle): void {
  if (style.premiumDesk) g.fillStyle(0x3f2a1d, 1).fillRoundedRect(14, 12, 28, 34, 7);
  else g.fillStyle(0x3b4658, 1).fillRoundedRect(17, 19, 22, 26, 6);
}

/** Bras en deux segments (épaule → coude → main) et la main au bout. */
function arm(g: G, style: RoleStyle, look: Look, points: readonly [number, number][]): void {
  g.lineStyle(5, sleeveOf(style, look), 1);
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1] as [number, number];
    const [bx, by] = points[i] as [number, number];
    g.lineBetween(ax, ay, bx, by);
  }
  const [hx, hy] = points[points.length - 1] as [number, number];
  g.fillStyle(look.skin, 1).fillCircle(hx, hy, 2.6);
}

function openMouth(g: G): void {
  g.fillStyle(0x7f1d1d, 1).fillEllipse(28, 25.2, 4, 3);
}

function seated(g: G, style: RoleStyle, look: Look, frame: number): void {
  g.fillStyle(SHADOW, 0.2).fillEllipse(28, 66, 54, 8);
  chair(g, style);
  const raised = frame === FRAME.stretch || frame === FRAME.cheer;
  // Bras levés : dessinés avant la tête pour passer derrière elle
  if (frame === FRAME.stretch) {
    arm(g, style, look, [[19, 34], [14, 21], [20, 8]]);
    arm(g, style, look, [[37, 34], [42, 21], [36, 8]]);
  } else if (frame === FRAME.cheer) {
    arm(g, style, look, [[19, 34], [12, 24], [9, 12]]);
    arm(g, style, look, [[37, 34], [44, 24], [47, 12]]);
  }
  drawTorso(g, style, look);
  drawHead(g, look);
  if (raised) {
    if (frame === FRAME.cheer) openMouth(g);
    return;
  }
  // Main gauche : sur le clavier (levée ou non pendant la frappe)
  arm(g, style, look, [[19, 37], [23, 47 + (frame === FRAME.typeLeft ? -2 : 0)]]);
  if (frame === FRAME.phone) {
    arm(g, style, look, [[37, 37], [41, 31], [37, 24]]);
    g.fillStyle(0x111827, 1).fillRoundedRect(34.5, 15, 4, 10, 1.2);
    openMouth(g);
  } else if (frame === FRAME.sip) {
    arm(g, style, look, [[37, 37], [40, 31], [33, 28]]);
    g.fillStyle(0xffffff, 1).fillRoundedRect(25, 23, 7, 7, 1.5);
    g.fillStyle(0x7c2d12, 1).fillRect(26, 23.5, 5, 1.2);
  } else {
    arm(g, style, look, [[37, 37], [33, 47 + (frame === FRAME.typeRight ? -2 : 0)]]);
  }
}

interface Stance {
  back: boolean;
  /** 1 ou −1 : pied gauche ou droit en avant ; 0 : à l'arrêt. */
  step: number;
  hands?: 'talk' | 'sip';
}

function standing(g: G, style: RoleStyle, look: Look, s: Stance): void {
  g.fillStyle(SHADOW, 0.2).fillEllipse(28, 66, 30, 7);
  const trousers = style.outfit === 'suit' || style.outfit === 'blazer' ? darken(look.outfit, 0.8) : 0x374151;
  // Jambes : un pied en avant, l'autre en arrière
  const lean = 3 * s.step;
  g.lineStyle(6, trousers, 1);
  g.lineBetween(24, 40, 24 - lean, 62).lineBetween(32, 40, 32 + lean, 62);
  g.fillStyle(SHOES, 1).fillEllipse(24 - lean, 63.5, 7, 4).fillEllipse(32 + lean, 63.5, 7, 4);

  g.save();
  g.translateCanvas(0, -STAND_LIFT);
  // Bras qui se balancent à l'opposé des jambes
  const swing = 3 * s.step;
  if (s.back) {
    arm(g, style, look, [[19, 34], [18 + swing, 46]]);
    arm(g, style, look, [[37, 34], [38 - swing, 46]]);
    g.fillStyle(look.outfit, 1).fillRoundedRect(17, 30, 22, 18, 7);
    if (style.outfit === 'hoodie') g.fillStyle(darken(look.outfit), 1).fillEllipse(28, 33, 14, 8);
    if (style.outfit === 'blazer' || style.outfit === 'suit') g.lineStyle(1.2, darken(look.outfit), 1).lineBetween(28, 36, 28, 48);
    backOfHead(g, look);
  } else {
    drawTorso(g, style, look);
    if (s.hands === 'talk') {
      arm(g, style, look, [[19, 34], [17, 46]]);
      arm(g, style, look, [[37, 34], [44, 33], [46, 25]]);
    } else if (s.hands === 'sip') {
      arm(g, style, look, [[19, 34], [17, 46]]);
      arm(g, style, look, [[37, 34], [40, 31], [33, 28]]);
    } else {
      arm(g, style, look, [[19, 34], [18 - swing, 46]]);
      arm(g, style, look, [[37, 34], [38 + swing, 46]]);
    }
    drawHead(g, look);
    if (s.hands === 'talk') openMouth(g);
    if (s.hands === 'sip') {
      g.fillStyle(0xffffff, 1).fillRoundedRect(25, 23, 7, 7, 1.5);
      g.fillStyle(0x7c2d12, 1).fillRect(26, 23.5, 5, 1.2);
    }
  }
  g.restore();
}

function backOfHead(g: G, look: Look): void {
  g.fillStyle(look.skin, 1).fillCircle(19.8, 22.5, 2).fillCircle(36.2, 22.5, 2).fillCircle(28, 21, 8.5);
  g.fillStyle(look.hair, 1);
  if (look.hairStyle === 'long') g.fillRoundedRect(19, 15, 18, 19, 6);
  if (look.hairStyle === 'curly') {
    for (const [x, y] of [[21, 17], [25, 13], [30, 13], [35, 17], [22, 23], [34, 23], [28, 25]] as const) g.fillCircle(x, y, 3.8);
  } else g.fillCircle(28, 20.5, 8.4);
  if (look.hairStyle === 'bun') g.fillCircle(28, 11, 4.2);
}
