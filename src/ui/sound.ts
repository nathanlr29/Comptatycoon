import { effectiveVolume } from '../core/settings';
import { settings } from '../settings';

/** Effets sonores du jeu, synthétisés (aucun fichier audio à télécharger). */
export type SoundId = 'click' | 'buy' | 'success' | 'warning';

interface Note {
  freq: number;
  /** Début (s) après le déclenchement. */
  at: number;
  dur: number;
  type: OscillatorType;
  gain: number;
}

const SOUNDS: Record<SoundId, Note[]> = {
  // Petit « tic » de touche, discret : il revient à chaque saisie.
  click: [{ freq: 1200, at: 0, dur: 0.045, type: 'triangle', gain: 0.18 }],
  // Tiroir-caisse stylisé : deux notes montantes.
  buy: [
    { freq: 880, at: 0, dur: 0.09, type: 'square', gain: 0.12 },
    { freq: 1320, at: 0.07, dur: 0.16, type: 'square', gain: 0.12 },
  ],
  success: [
    { freq: 660, at: 0, dur: 0.12, type: 'sine', gain: 0.35 },
    { freq: 880, at: 0.1, dur: 0.12, type: 'sine', gain: 0.35 },
    { freq: 1320, at: 0.2, dur: 0.22, type: 'sine', gain: 0.3 },
  ],
  warning: [
    { freq: 440, at: 0, dur: 0.16, type: 'sawtooth', gain: 0.12 },
    { freq: 330, at: 0.15, dur: 0.24, type: 'sawtooth', gain: 0.12 },
  ],
};

let context: AudioContext | null = null;

/** Le contexte audio n'est créé qu'au premier geste du joueur (exigence de Safari iOS). */
function audio(): AudioContext | null {
  if (!context) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
  }
  if (context.state === 'suspended') void context.resume();
  return context;
}

/** Joue un effet au volume des réglages ; ne fait rien si le son est coupé. */
export function playSound(id: SoundId, volume = effectiveVolume(settings.get())): void {
  if (volume <= 0) return;
  const ctx = audio();
  if (!ctx) return;
  const start = ctx.currentTime + 0.01;
  for (const note of SOUNDS[id]) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = note.type;
    osc.frequency.value = note.freq;
    const t0 = start + note.at;
    // Enveloppe courte : attaque rapide puis extinction, sans « clic » numérique.
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(note.gain * volume, t0 + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + note.dur);
    osc.connect(env).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + note.dur + 0.02);
  }
}

/** Débloque l'audio au premier toucher, pour que les sons déclenchés plus tard (notifications) soient audibles. */
export function unlockAudioOnFirstGesture(): void {
  const unlock = () => {
    if (effectiveVolume(settings.get()) > 0) audio();
  };
  window.addEventListener('pointerdown', unlock, { once: true, capture: true });
}
