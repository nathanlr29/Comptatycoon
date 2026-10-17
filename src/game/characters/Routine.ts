/**
 * Vie des employés : au bureau ils tapent, téléphonent, s'étirent ou boivent un café ; de temps en temps,
 * quelques-uns se lèvent pour aller à l'imprimante, à la machine à café, en réunion ou voir un collègue.
 * Pendant la pause café, une partie de l'équipe se retrouve à la machine. Quand un objectif est réclamé,
 * tout le monde lève les bras. Rien de tout cela si l'appareil demande moins d'animations.
 *
 * Coût : une horloge à 2 Hz choisit les activités ; seules les personnes en marche ont un tween.
 */
import { reducedMotion } from '../../settings';
import Phaser from 'phaser';
import type { TeamRole } from '../../core/team';
import { depthOf, isoToScreen, screenToIso } from '../iso';
import { maxWalkers, pathTo, pickActivity, type DeskAction, type Place, type PlaceKind } from './behavior';
import { spotAt, type CoffeeSpot } from './coffeeSpots';
import { FRAME } from './poses';
import type { Seat } from './seating';
import { animationKey, type Motion } from './sprites';

type Sprite = Phaser.GameObjects.Sprite;
type Mode = 'desk' | 'walking' | 'away' | 'gathered';

/** Ce que la couche des employés fournit à la routine. */
export interface RoutineHost {
  sprites(): ReadonlyMap<string, Sprite>;
  seatOf(id: string): Seat | undefined;
  /** Dossier de chaise laissé au bureau quand la personne se lève. */
  showChair(id: string, visible: boolean): void;
}

interface Person {
  mode: Mode;
  /** Rassemblement en cours (pause café, déjeuner…) auquel la personne participe. */
  gathering?: string;
  until: number;
  timer?: Phaser.Time.TimerEvent;
}

const TICK_MS = 500;
const WALK_TILES_PER_S = 2.2;
const WALK_MAX_MS = 4000;
const CHEER_MS = 1500;
const STAND_FRAME: Record<PlaceKind | 'colleague', number> = {
  printer: FRAME.stand,
  coffee: FRAME.standSip,
  meeting: FRAME.talk,
  lounge: FRAME.standSip,
  colleague: FRAME.talk,
};
const DESK_FRAME: Record<Exclude<DeskAction, 'type'>, number> = { phone: FRAME.phone, stretch: FRAME.stretch, sip: FRAME.sip };

export class Routine {
  private readonly people = new Map<string, Person>();
  private places: Place[] = [];
  private readonly gatherings = new Set<string>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly host: RoutineHost,
  ) {
    const clock = scene.time.addEvent({ delay: TICK_MS, loop: true, callback: () => this.tick() });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => clock.remove());
  }

  get still(): boolean {
    return reducedMotion();
  }

  setPlaces(places: Place[]): void {
    this.places = places;
  }

  /** Une personne vient d'arriver à son bureau (embauche ou recyclage du sprite). */
  join(id: string): void {
    this.forget(id);
    this.people.set(id, { mode: 'desk', until: this.scene.time.now + Phaser.Math.Between(2000, 9000) });
    const sprite = this.host.sprites().get(id);
    if (sprite) this.atDesk(sprite, 'type');
  }

  /** La personne part (licenciement, démission) : on arrête tout ce qui la concerne. */
  forget(id: string): void {
    const sprite = this.host.sprites().get(id);
    if (sprite) this.stopWalk(sprite);
    this.people.get(id)?.timer?.remove();
    this.people.delete(id);
    this.host.showChair(id, false);
  }

  /** Préférence « réduire les animations » changée : tout le monde se rassoit, immobile ou non. */
  reset(): void {
    for (const id of this.people.keys()) this.backToDesk(id, true);
  }

  /** Objectif réclamé : les personnes à leur bureau lèvent les bras et sautillent. */
  celebrate(): void {
    if (this.still) return;
    const now = this.scene.time.now;
    for (const [id, p] of this.people) {
      const sprite = this.host.sprites().get(id);
      if (!sprite || p.mode !== 'desk') continue;
      sprite.stop();
      sprite.setFrame(FRAME.cheer);
      p.until = now + CHEER_MS;
      const y = sprite.y;
      this.scene.tweens.add({ targets: sprite, y: y - 5, duration: 180, yoyo: true, repeat: 3, delay: Phaser.Math.Between(0, 200), onComplete: () => sprite.setY(y) });
    }
  }

  /**
   * Rassemblement (pause café, déjeuner à la cantine…) : jusqu'à `spots.length` personnes assises à leur
   * bureau s'y rendent et y restent dans la pose donnée jusqu'à ce que `active` repasse à faux.
   * À appeler à chaque changement d'état ; ne fait rien tant que le rassemblement ne commence ni ne finit.
   */
  setGathering(name: string, active: boolean, spots: readonly CoffeeSpot[], pose: 'stand' | 'standSip' | 'seated' = 'standSip'): void {
    if (active === this.gatherings.has(name)) return;
    if (!active) {
      this.gatherings.delete(name);
      for (const [id, p] of this.people) if (p.gathering === name) this.backToDesk(id, false);
      return;
    }
    this.gatherings.add(name);
    const frame = pose === 'seated' ? FRAME.rest : FRAME[pose];
    const ids = [...this.people.keys()].filter((id) => this.people.get(id)?.mode === 'desk' && !id.startsWith('partner'));
    ids.slice(0, spots.length).forEach((id, i) => {
      const spot = spots[i];
      if (spot) this.goTo(id, spot, frame, null, name);
    });
  }

  private tick(): void {
    if (this.still) return;
    const now = this.scene.time.now;
    const sprites = this.host.sprites();
    let standing = 0;
    for (const p of this.people.values()) if (p.mode !== 'desk') standing++;
    const limit = maxWalkers(this.people.size);
    for (const [id, p] of this.people) {
      if (p.mode !== 'desk' || p.until > now) continue;
      const sprite = sprites.get(id);
      if (!sprite) continue;
      const activity = pickActivity(Math.random, {
        canWalk: standing < limit,
        places: this.places.map((pl) => pl.kind),
        hasColleague: this.people.size > 1,
      });
      if (activity.kind === 'desk') {
        p.until = now + activity.ms;
        this.atDesk(sprite, activity.action);
        continue;
      }
      const target = this.destination(id, activity.to);
      if (!target) {
        p.until = now + 3000;
        continue;
      }
      standing++;
      this.goTo(id, target, STAND_FRAME[activity.to], activity.ms);
    }
  }

  private destination(id: string, to: PlaceKind | 'colleague'): CoffeeSpot | null {
    if (to !== 'colleague') {
      const options = this.places.filter((p) => p.kind === to).flatMap((p) => p.spots);
      return options[Math.floor(Math.random() * options.length)] ?? null;
    }
    const others = [...this.people].filter(([other, p]) => other !== id && p.mode === 'desk');
    const pick = others[Math.floor(Math.random() * others.length)];
    const seat = pick ? this.host.seatOf(pick[0]) : undefined;
    if (!seat) return null;
    // Debout à côté du bureau du collègue
    const g = screenToIso(seat.x, seat.y);
    return spotAt(g.x + 0.75, g.y + 0.2);
  }

  private atDesk(sprite: Sprite, action: DeskAction): void {
    if (action === 'type' || this.still) {
      if (this.still) {
        sprite.stop();
        sprite.setFrame(FRAME.rest);
      } else this.play(sprite, 'typing', true);
      return;
    }
    sprite.stop();
    sprite.setFrame(DESK_FRAME[action]);
  }

  /** Se lever, marcher jusqu'à `spot`, y rester `stay` ms (ou jusqu'au retour demandé si null), revenir. */
  private goTo(id: string, spot: CoffeeSpot, frame: number, stay: number | null, gathering?: string): void {
    const p = this.people.get(id);
    const sprite = this.host.sprites().get(id);
    if (!p || !sprite) return;
    p.timer?.remove();
    p.mode = 'walking';
    p.gathering = gathering;
    this.host.showChair(id, true);
    this.walk(sprite, { x: spot.ix, y: spot.iy }, () => {
      p.mode = stay === null ? 'gathered' : 'away';
      sprite.stop();
      sprite.setFrame(frame).setDepth(spot.depth);
      if (stay !== null) p.timer = this.scene.time.delayedCall(stay, () => this.backToDesk(id, false));
    });
  }

  private backToDesk(id: string, instant: boolean): void {
    const p = this.people.get(id);
    const sprite = this.host.sprites().get(id);
    const seat = this.host.seatOf(id);
    if (!p || !sprite) return;
    p.timer?.remove();
    const sit = () => {
      if (seat) sprite.setPosition(seat.x, seat.y).setDepth(seat.depth);
      this.host.showChair(id, false);
      p.mode = 'desk';
      p.gathering = undefined;
      p.until = this.scene.time.now + Phaser.Math.Between(4000, 10000);
      this.atDesk(sprite, 'type');
    };
    this.stopWalk(sprite);
    if (instant || !seat || p.mode === 'desk' || this.still) return sit();
    p.mode = 'walking';
    this.walk(sprite, screenToIso(seat.x, seat.y), sit);
  }

  /** Marche en L sur la grille ; la profondeur suit pour passer devant ou derrière le mobilier. */
  private walk(sprite: Sprite, to: { x: number; y: number }, done: () => void): void {
    this.stopWalk(sprite);
    const pos = screenToIso(sprite.x, sprite.y);
    const put = () => {
      const s = isoToScreen(pos.x, pos.y);
      sprite.setPosition(s.x, s.y).setDepth(depthOf(pos.x, pos.y) + 1);
    };
    if (this.still) {
      Object.assign(pos, to);
      put();
      return done();
    }
    const legs = pathTo(pos, to);
    const step = (i: number) => {
      const leg = legs[i];
      if (!leg) return done();
      const distance = Math.hypot(leg.x - pos.x, leg.y - pos.y);
      if (distance < 0.01) return step(i + 1);
      // Vers le bas de l'écran : de face ; vers le haut : de dos. Retourné selon le côté.
      const screenDy = leg.x + leg.y - (pos.x + pos.y);
      const screenDx = leg.x - leg.y - (pos.x - pos.y);
      this.play(sprite, screenDy >= 0 ? 'walkFront' : 'walkBack', false);
      sprite.setFlipX(screenDx < 0);
      const tween = this.scene.tweens.add({
        targets: pos,
        x: leg.x,
        y: leg.y,
        duration: Math.min(WALK_MAX_MS, (distance / WALK_TILES_PER_S) * 1000),
        onUpdate: put,
        onComplete: () => step(i + 1),
      });
      sprite.setData('walk', tween);
    };
    step(0);
  }

  /** Arrête un trajet en cours (son tween anime un point de la grille, pas le sprite lui-même). */
  private stopWalk(sprite: Sprite): void {
    (sprite.getData('walk') as Phaser.Tweens.Tween | undefined)?.remove();
    sprite.setData('walk', undefined);
    this.scene.tweens.killTweensOf(sprite);
    // Une apparition (fondu à l'embauche) interrompue ne doit pas laisser la personne invisible.
    sprite.setAlpha(1);
  }

  private play(sprite: Sprite, motion: Motion, staggered: boolean): void {
    sprite.setFlipX(false);
    const role = sprite.getData('role') as TeamRole;
    const look = sprite.getData('look') as number;
    sprite.play({
      key: animationKey(role, look, motion),
      startFrame: staggered ? Phaser.Math.Between(0, 7) : 0,
      repeatDelay: staggered ? Phaser.Math.Between(400, 2600) : 0,
    });
  }
}
