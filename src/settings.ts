/**
 * Réglages de l'appareil, partagés par l'interface (`ui/`) et la carte (`game/`).
 *
 *   import { settings, reducedMotion, onSettingsChange } from '../settings';
 *   settings.get()            // réglages actuels (type `Settings` de core/settings.ts)
 *   settings.update({ … })    // modifie, sauvegarde, prévient les abonnés
 *   reducedMotion()           // true si les animations doivent être réduites (choix du joueur ou de l'appareil)
 *   onSettingsChange(fn)      // appelé à chaque changement, y compris « Réduire les animations » de l'appareil ; renvoie le désabonnement
 *
 * Appliqués aussi à la page : `data-motion="full|reduced"` sur <html>, taille du texte, format des nombres.
 */
import { setNumberNotation } from './core/format';
import { isMotionReduced, type Settings } from './core/settings';
import { getBrowserStorage } from './persistence/LocalSaveService';
import { SettingsStore } from './persistence/SettingsStore';

const systemMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');

export const settings = new SettingsStore(getBrowserStorage());

export function reducedMotion(): boolean {
  return isMotionReduced(settings.get(), systemMotion?.matches ?? false);
}

export function onSettingsChange(fn: (s: Settings) => void): () => void {
  return settings.subscribe(fn);
}

function apply(s: Settings): void {
  const root = document.documentElement;
  root.dataset.motion = reducedMotion() ? 'reduced' : 'full';
  root.style.fontSize = s.textScale === 1 ? '' : `${s.textScale * 100}%`;
  setNumberNotation(s.notation);
}

settings.subscribe(apply);
systemMotion?.addEventListener('change', () => settings.emit());
apply(settings.get());
