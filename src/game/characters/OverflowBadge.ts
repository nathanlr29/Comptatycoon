/** Pastille « +N » près de l'entrée : les collaborateurs qui n'ont pas de poste visible (docs/GDD.md §6). */
import Phaser from 'phaser';
import { DEPTH } from '../iso';

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const HEIGHT = 30;

export class OverflowBadge {
  private readonly container: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private count = 0;

  constructor(scene: Phaser.Scene) {
    this.bg = scene.add.graphics();
    this.label = scene.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: '#f8fafc' })
      .setOrigin(0, 0.5)
      .setResolution(Math.min(window.devicePixelRatio || 1, 3));
    this.container = scene.add.container(0, 0, [this.bg, this.label]).setDepth(DEPTH.overlay - 1).setVisible(false);
  }

  moveTo(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  /** N'affiche rien quand tout le monde a un poste. */
  show(count: number): void {
    if (count === this.count) return;
    this.count = count;
    this.container.setVisible(count > 0);
    if (count <= 0) return;
    this.label.setText(`+${count}`);
    // Pastille : silhouette (tête + épaules) puis le nombre
    const w = 38 + this.label.width;
    const g = this.bg.clear();
    g.fillStyle(0x0f172a, 0.3).fillRoundedRect(-w / 2 + 2, -HEIGHT / 2 + 3, w, HEIGHT, HEIGHT / 2);
    g.fillStyle(0x3d3833, 1).fillRoundedRect(-w / 2, -HEIGHT / 2, w, HEIGHT, HEIGHT / 2);
    g.lineStyle(2, 0xf8fafc, 0.9).strokeRoundedRect(-w / 2, -HEIGHT / 2, w, HEIGHT, HEIGHT / 2);
    const ix = -w / 2 + 17;
    g.fillStyle(0xf8fafc, 1).fillCircle(ix, -4, 4.5).fillEllipse(ix, 7, 14, 9);
    this.label.setPosition(ix + 11, 0);
  }
}
