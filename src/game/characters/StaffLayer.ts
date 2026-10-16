/**
 * Affiche chaque personne du cabinet à son bureau. Suit l'état du jeu : une embauche fait
 * apparaître un personnage, un départ (licenciement, démission) le fait disparaître.
 * Les sprites sont recyclés (pool) et rien n'est redessiné à chaque image : seules les
 * animations de frappe changent d'image, et pas du tout si l'utilisateur réduit les animations.
 */
import Phaser from 'phaser';
import { getTeam, type TeamMember } from '../../core/team';
import type { GameState } from '../../core/state';
import { LOOKS_PER_ROLE } from './looks';
import { depthOf, isoToScreen, screenToIso } from '../iso';
import type { CoffeeSpot } from './coffeeSpots';
import { assignSeats, lookIndex, type Seat } from './seating';
import { OverflowBadge } from './OverflowBadge';
import { animationKey, ensureCharacterTexture, textureScale } from './sprites';

const APPEAR_MS = 320;
/** Vitesse de marche vers la machine à café (cases par seconde) et durée maximale d'un trajet. */
const WALK_TILES_PER_S = 3;
const WALK_MAX_MS = 2600;

export class StaffLayer {
  private readonly sprites = new Map<string, Phaser.GameObjects.Sprite>();
  private readonly pool: Phaser.GameObjects.Sprite[] = [];
  private seats: Seat[] = [];
  private seating = new Map<string, number>();
  private team: TeamMember[] = [];
  private signature = '';
  private readonly motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  private readonly onMotionChange = () => this.applyMotion();
  private readonly overflow: OverflowBadge;
  /** Personnes parties à la machine à café (elles ne reprennent pas leur siège avant la fin de la pause). */
  private readonly away = new Set<string>();

  constructor(private readonly scene: Phaser.Scene) {
    this.overflow = new OverflowBadge(scene);
    this.motion.addEventListener('change', this.onMotionChange);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.motion.removeEventListener('change', this.onMotionChange));
  }

  /** Sièges disponibles (coordonnées monde). Les personnes déjà assises gardent leur place. */
  setSeats(seats: Seat[]): void {
    this.seats = seats;
    this.place(false);
  }

  /** Point de l'entrée (coordonnées monde) où s'affiche « +N » pour les personnes sans poste visible. */
  setEntrance(x: number, y: number): void {
    this.overflow.moveTo(x, y);
  }

  /** À appeler à chaque changement d'état : ne fait rien si les effectifs n'ont pas bougé. */
  sync(state: GameState): void {
    const signature = `${state.partners}|${Object.values(state.staff).join(',')}`;
    if (signature === this.signature) return;
    this.signature = signature;
    this.team = getTeam(state);
    this.place(true);
  }

  private place(animate: boolean): void {
    this.seating = assignSeats(this.seating, this.team, this.seats);
    for (const [id, sprite] of this.sprites) {
      if (!this.seating.has(id)) this.release(id, sprite, animate);
    }
    for (const member of this.team) {
      const seatIndex = this.seating.get(member.id);
      const seat = seatIndex === undefined ? undefined : this.seats[seatIndex];
      if (!seat) continue;
      const existing = this.sprites.get(member.id);
      if (existing && this.away.has(member.id)) continue;
      if (existing) existing.setPosition(seat.x, seat.y).setDepth(seat.depth);
      else this.spawn(member, seat, animate);
    }
    this.overflow.show(this.team.length - this.seating.size);
  }

  /**
   * Pause café : quelques personnes quittent leur bureau pour la machine, puis reviennent à la fin.
   * À appeler à chaque changement d'état ; ne fait rien tant que la pause ne commence ni ne finit.
   */
  setCoffeeBreak(active: boolean, spots: readonly CoffeeSpot[]): void {
    if (active && this.away.size === 0) {
      const walkers = this.team.filter((m) => m.role !== 'partner' && this.sprites.has(m.id)).slice(0, spots.length);
      walkers.forEach((m, i) => {
        const sprite = this.sprites.get(m.id);
        const spot = spots[i];
        if (!sprite || !spot) return;
        this.away.add(m.id);
        sprite.stop();
        sprite.setFrame(1);
        this.walk(sprite, spot.ix, spot.iy);
      });
    } else if (!active && this.away.size > 0) {
      for (const id of this.away) {
        const sprite = this.sprites.get(id);
        const seat = this.seats[this.seating.get(id) ?? -1];
        if (!sprite || !seat) continue;
        const target = screenToIso(seat.x, seat.y);
        this.walk(sprite, target.x, target.y, () => {
          sprite.setPosition(seat.x, seat.y).setDepth(seat.depth);
          this.animate(sprite);
        });
      }
      this.away.clear();
    }
  }

  /** Trajet en ligne droite sur la grille, la profondeur suit pour passer devant ou derrière le mobilier. */
  private walk(sprite: Phaser.GameObjects.Sprite, tx: number, ty: number, done?: () => void): void {
    this.scene.tweens.killTweensOf(sprite);
    const from = screenToIso(sprite.x, sprite.y);
    const pos = { x: from.x, y: from.y };
    const put = () => {
      const p = isoToScreen(pos.x, pos.y);
      sprite.setPosition(p.x, p.y).setDepth(depthOf(pos.x, pos.y) + 1);
    };
    if (this.motion.matches) {
      pos.x = tx;
      pos.y = ty;
      put();
      done?.();
      return;
    }
    const distance = Math.hypot(tx - from.x, ty - from.y);
    this.scene.tweens.add({
      targets: pos,
      x: tx,
      y: ty,
      duration: Math.min(WALK_MAX_MS, (distance / WALK_TILES_PER_S) * 1000),
      delay: Phaser.Math.Between(0, 400),
      ease: 'Sine.InOut',
      onUpdate: put,
      onComplete: () => done?.(),
    });
  }

  private spawn(member: TeamMember, seat: Seat, animate: boolean): void {
    const look = lookIndex(member.id, LOOKS_PER_ROLE);
    const key = ensureCharacterTexture(this.scene, member.role, look);
    const sprite = this.pool.pop() ?? this.scene.make.sprite({ key }, false).setOrigin(0.5, 1);
    sprite.setTexture(key, 1).setScale(textureScale()).setPosition(seat.x, seat.y).setDepth(seat.depth).setAlpha(1).setVisible(true);
    sprite.setData('anim', animationKey(member.role, look));
    this.scene.add.existing(sprite);
    this.sprites.set(member.id, sprite);
    this.animate(sprite);
    if (animate && !this.motion.matches) {
      sprite.setAlpha(0).setY(seat.y + 10);
      this.scene.tweens.add({ targets: sprite, alpha: 1, y: seat.y, duration: APPEAR_MS, ease: 'Back.Out' });
    }
  }

  private release(id: string, sprite: Phaser.GameObjects.Sprite, animate: boolean): void {
    this.sprites.delete(id);
    this.away.delete(id);
    sprite.stop();
    this.scene.tweens.killTweensOf(sprite);
    const recycle = () => {
      this.scene.children.remove(sprite);
      sprite.setVisible(false);
      this.pool.push(sprite);
    };
    if (!animate || this.motion.matches) return recycle();
    this.scene.tweens.add({ targets: sprite, alpha: 0, y: sprite.y + 10, duration: APPEAR_MS, onComplete: recycle });
  }

  /** Frappe au clavier, chacun à son rythme (départ décalé, pauses aléatoires). */
  private animate(sprite: Phaser.GameObjects.Sprite): void {
    if (this.motion.matches) {
      sprite.stop();
      sprite.setFrame(1);
      return;
    }
    sprite.play({
      key: sprite.getData('anim') as string,
      startFrame: Phaser.Math.Between(0, 7),
      repeatDelay: Phaser.Math.Between(400, 2600),
    });
  }

  private applyMotion(): void {
    for (const [id, sprite] of this.sprites) if (!this.away.has(id)) this.animate(sprite);
  }
}
