/**
 * Fige un dessin plat (sols, murs) en texture : Phaser retrace chaque Graphics à chaque image,
 * une image fixe ne coûte presque rien. Résolution doublée pour rester net au zoom, plafonnée en mémoire.
 */
import type Phaser from 'phaser';

type G = Phaser.GameObjects.Graphics;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Au plus ~4 millions de pixels par texture (16 Mo), et jamais plus de 2 pixels par pixel du monde. */
const MAX_PIXELS = 4_000_000;
const MAX_SCALE = 2;

export class FlatBaker {
  private keys: string[] = [];
  private next = 0;

  constructor(private readonly scene: Phaser.Scene) {}

  bake(depth: number, b: Rect, draw: (g: G) => void): Phaser.GameObjects.Image {
    const scale = Math.min(MAX_SCALE, Math.sqrt(MAX_PIXELS / Math.max(1, b.width * b.height)));
    const g = this.scene.make.graphics({}, false);
    g.scaleCanvas(scale, scale);
    g.translateCanvas(-b.x, -b.y);
    draw(g);
    const key = `flat-${this.next++}`;
    g.generateTexture(key, Math.ceil(b.width * scale), Math.ceil(b.height * scale));
    g.destroy();
    this.keys.push(key);
    return this.scene.add.image(b.x, b.y, key).setOrigin(0).setScale(1 / scale).setDepth(depth);
  }

  /** Libère les textures du rendu précédent (après destruction de leurs images). */
  release(): void {
    for (const key of this.keys) this.scene.textures.remove(key);
    this.keys = [];
  }
}
