import { CANTEEN } from '../data/canteen';

/** Heure du déjeuner (heure locale décimale, 12,5 = 12 h 30) : les équipes vont à la cantine. Visuel seulement. */
export function isLunchTime(hour: number): boolean {
  return hour >= CANTEEN.lunch.from && hour < CANTEEN.lunch.to;
}
