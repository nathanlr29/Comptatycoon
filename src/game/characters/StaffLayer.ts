/**
 * Affiche chaque personne du cabinet à son bureau. Suit l'état du jeu : une embauche fait
 * apparaître un personnage, un départ (licenciement, démission) le fait disparaître.
 * Les sprites sont recyclés (pool) et rien n'est redessiné à chaque image ; ce que font les
 * personnes au fil du temps (frapper, téléphoner, se lever…) est confié à `Routine`.
 */
import Phaser from 'phaser';
import { getTeam, type TeamMember } from '../../core/team';
import type { GameState } from '../../core/state';
import type { Place } from './behavior';
import type { CoffeeSpot } from './coffeeSpots';
import { LOOKS_PER_ROLE } from './looks';
import { OverflowBadge } from './OverflowBadge';
import { FRAME } from './poses';
import { Routine } from './Routine';
import { assignSeats, lookIndex, type Seat } from './seating';
import { ensureCharacterTexture, textureScale } from './sprites';

const APPEAR_MS = 320;
type Sprite = Phaser.GameObjects.Sprite;

export class StaffLayer {
  private readonly sprites = new Map<string, Sprite>();
  private readonly chairs = new Map<string, Sprite>();
  private readonly pool: Sprite[] = [];
  private seats: Seat[] = [];
  private seating = new Map<string, number>();
  private team: TeamMember[] = [];
  private signature = '';
  private readonly motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  private readonly onMotionChange = () => this.routine.reset();
  private readonly overflow: OverflowBadge;
  private readonly routine: Routine;

  constructor(private readonly scene: Phaser.Scene) {
    this.overflow = new OverflowBadge(scene);
    this.routine = new Routine(scene, {
      sprites: () => this.sprites,
      seatOf: (id) => this.seatOf(id),
      showChair: (id, visible) => this.showChair(id, visible),
    });
    this.motion.addEventListener('change', this.onMotionChange);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.motion.removeEventListener('change', this.onMotionChange));
  }

  /** Sièges disponibles (coordonnées monde). Les personnes déjà assises gardent leur place ; tout le monde se rassoit. */
  setSeats(seats: Seat[]): void {
    this.seats = seats;
    this.place(false);
    this.routine.reset();
  }

  /** Destinations à pied (imprimante, café, réunion, coin détente) du plan affiché. */
  setPlaces(places: Place[]): void {
    this.routine.setPlaces(places);
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

  /** Pause café : une partie de l'équipe va à la machine, puis revient. */
  setCoffeeBreak(active: boolean, spots: readonly CoffeeSpot[]): void {
    this.routine.setGathering('coffee', active, spots, 'standSip');
  }

  /**
   * Rassemblement nommé (ex. « lunch » à la cantine) : jusqu'à `spots.length` personnes y vont et y restent
   * dans la pose donnée tant que `active` est vrai. Sans effet si l'état ne change pas : appelable à chaque mise à jour.
   */
  setGathering(name: string, active: boolean, spots: readonly CoffeeSpot[], pose: 'stand' | 'standSip' | 'seated' = 'standSip'): void {
    this.routine.setGathering(name, active, spots, pose);
  }

  /** Objectif réclamé : l'équipe fête ça. */
  celebrate(): void {
    this.routine.celebrate();
  }

  private seatOf(id: string): Seat | undefined {
    const index = this.seating.get(id);
    return index === undefined ? undefined : this.seats[index];
  }

  private place(animate: boolean): void {
    this.seating = assignSeats(this.seating, this.team, this.seats);
    for (const [id, sprite] of this.sprites) {
      if (!this.seating.has(id)) this.release(id, sprite, animate);
    }
    for (const member of this.team) {
      const seat = this.seatOf(member.id);
      if (seat && !this.sprites.has(member.id)) this.spawn(member, seat, animate);
    }
    this.overflow.show(this.team.length - this.seating.size);
  }

  private spawn(member: TeamMember, seat: Seat, animate: boolean): void {
    const sprite = this.make(member);
    sprite.setPosition(seat.x, seat.y).setDepth(seat.depth);
    this.sprites.set(member.id, sprite);
    this.routine.join(member.id);
    if (animate && !this.motion.matches) {
      sprite.setAlpha(0).setY(seat.y + 10);
      this.scene.tweens.add({ targets: sprite, alpha: 1, y: seat.y, duration: APPEAR_MS, ease: 'Back.Out' });
    }
  }

  /** Sprite recyclé, avec l'apparence de la personne (sa texture contient toutes ses poses). */
  private make(member: TeamMember): Sprite {
    const look = lookIndex(member.id, LOOKS_PER_ROLE);
    const key = ensureCharacterTexture(this.scene, member.role, look);
    const sprite = this.pool.pop() ?? this.scene.make.sprite({ key }, false).setOrigin(0.5, 1);
    sprite.setTexture(key, FRAME.rest).setScale(textureScale()).setFlipX(false).setAlpha(1).setVisible(true);
    sprite.setData('role', member.role).setData('look', look);
    this.scene.add.existing(sprite);
    return sprite;
  }

  /** Dossier de chaise laissé au bureau pendant que la personne est debout. */
  private showChair(id: string, visible: boolean): void {
    const existing = this.chairs.get(id);
    if (!visible) {
      if (existing) this.recycle(existing);
      this.chairs.delete(id);
      return;
    }
    const member = this.team.find((m) => m.id === id);
    const seat = this.seatOf(id);
    if (existing || !member || !seat) return;
    const chair = this.make(member);
    chair.stop();
    chair.setFrame(FRAME.chair).setPosition(seat.x, seat.y).setDepth(seat.depth - 0.5);
    this.chairs.set(id, chair);
  }

  private release(id: string, sprite: Sprite, animate: boolean): void {
    this.routine.forget(id);
    this.sprites.delete(id);
    sprite.stop();
    this.scene.tweens.killTweensOf(sprite);
    if (!animate || this.motion.matches) return this.recycle(sprite);
    this.scene.tweens.add({ targets: sprite, alpha: 0, y: sprite.y + 10, duration: APPEAR_MS, onComplete: () => this.recycle(sprite) });
  }

  private recycle(sprite: Sprite): void {
    sprite.stop();
    this.scene.tweens.killTweensOf(sprite);
    this.scene.children.remove(sprite);
    sprite.setVisible(false);
    this.pool.push(sprite);
  }
}
