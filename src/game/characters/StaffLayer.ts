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
import { assignSeats, lookIndex, type Seat } from './seating';
import { animationKey, ensureCharacterTexture, textureScale } from './sprites';

const APPEAR_MS = 320;

export class StaffLayer {
  private readonly sprites = new Map<string, Phaser.GameObjects.Sprite>();
  private readonly pool: Phaser.GameObjects.Sprite[] = [];
  private seats: Seat[] = [];
  private seating = new Map<string, number>();
  private team: TeamMember[] = [];
  private signature = '';
  private readonly motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  private readonly onMotionChange = () => this.applyMotion();

  constructor(private readonly scene: Phaser.Scene) {
    this.motion.addEventListener('change', this.onMotionChange);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.motion.removeEventListener('change', this.onMotionChange));
  }

  /** Sièges disponibles (coordonnées monde). Les personnes déjà assises gardent leur place. */
  setSeats(seats: Seat[]): void {
    this.seats = seats;
    this.place(false);
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
      if (existing) existing.setPosition(seat.x, seat.y).setDepth(seat.depth);
      else this.spawn(member, seat, animate);
    }
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
    for (const sprite of this.sprites.values()) this.animate(sprite);
  }
}
