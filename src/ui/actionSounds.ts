import type { GameAction } from '../core/actions';
import type { SoundId } from './sound';

/** Effet sonore d'une action réussie ; `null` quand une notification s'en charge déjà (objectif, secret). */
export function actionSound(action: GameAction): SoundId | null {
  switch (action.type) {
    case 'click':
      return 'click';
    case 'claimObjective':
    case 'discoverSecret':
    case 'dismiss':
    case 'dismissPartner':
      return null;
    default:
      return 'buy';
  }
}
