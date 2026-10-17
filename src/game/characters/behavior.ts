/**
 * Ce que fait chaque personne au fil du temps : surtout taper, parfois téléphoner, s'étirer, boire un café
 * à son bureau, ou se lever pour aller à l'imprimante, à la machine à café, en réunion ou voir un collègue.
 * Pur (hasard injecté) pour être testé ; StaffLayer joue les activités choisies.
 */
import type { Furniture } from '../../data/office';
import { spotsAround, type CoffeeSpot } from './coffeeSpots';

/** Lieux où l'on se rend à pied. */
export type PlaceKind = 'printer' | 'coffee' | 'meeting' | 'lounge';

/**
 * Meubles qui attirent les employés. Un nouveau meuble (billard, bureau debout…) devient une destination
 * en l'ajoutant ici ; les autres types sont ignorés.
 */
const PLACE_OF: Partial<Record<string, PlaceKind>> = {
  printer: 'printer',
  coffee: 'coffee',
  kitchenette: 'coffee',
  meetingTable: 'meeting',
  whiteboard: 'meeting',
  sofa: 'lounge',
  bench: 'lounge',
  fountain: 'lounge',
  billiard: 'lounge',
};

export interface Place {
  kind: PlaceKind;
  spots: CoffeeSpot[];
}

export function placesFrom(furniture: readonly Furniture[], size: { w: number; h: number }): Place[] {
  const out: Place[] = [];
  for (const f of furniture) {
    const kind = PLACE_OF[f.type];
    if (kind) out.push({ kind, spots: spotsAround(f.x, f.y, size) });
  }
  return out;
}

export type DeskAction = 'type' | 'phone' | 'stretch' | 'sip';
export type Activity = { kind: 'desk'; action: DeskAction; ms: number } | { kind: 'walk'; to: PlaceKind | 'colleague'; ms: number };

export interface Options {
  /** Faux si trop de monde est déjà debout : on reste à son bureau. */
  canWalk: boolean;
  places: readonly PlaceKind[];
  hasColleague: boolean;
}

const between = (rng: () => number, min: number, max: number) => min + rng() * (max - min);

/** Prochaine activité. `ms` = durée sur place (au bureau ou à destination, trajet non compris). */
export function pickActivity(rng: () => number, o: Options): Activity {
  const destinations: (PlaceKind | 'colleague')[] = [...new Set(o.places)];
  if (o.hasColleague) destinations.push('colleague');
  const r = rng();
  if (o.canWalk && destinations.length > 0 && r < 0.2) {
    const to = destinations[Math.floor(rng() * destinations.length)] ?? 'colleague';
    return { kind: 'walk', to, ms: between(rng, 2500, 5500) };
  }
  if (r < 0.3) return { kind: 'desk', action: 'phone', ms: between(rng, 4000, 8000) };
  if (r < 0.36) return { kind: 'desk', action: 'stretch', ms: 1600 };
  if (r < 0.44) return { kind: 'desk', action: 'sip', ms: 2400 };
  return { kind: 'desk', action: 'type', ms: between(rng, 6000, 14000) };
}

/** Nombre maximal de personnes debout en même temps : le cabinet reste calme et léger à animer. */
export function maxWalkers(teamSize: number): number {
  return Math.min(4, Math.ceil(teamSize * 0.15));
}

/** Trajet en L sur la grille (d'abord en x, puis en y) : plus naturel qu'une diagonale en vue isométrique. */
export function pathTo(from: { x: number; y: number }, to: { x: number; y: number }): { x: number; y: number }[] {
  return [{ x: to.x, y: from.y }, to];
}
