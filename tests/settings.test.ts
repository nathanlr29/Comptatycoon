import { describe, expect, it } from 'vitest';
import { formatMoney, formatRate } from '../src/core/format';
import { DEFAULT_SETTINGS, effectiveVolume, isMotionReduced, isNotificationEnabled, readSettings, updateSettings } from '../src/core/settings';
import { SETTINGS_KEY, SettingsStore } from '../src/persistence/SettingsStore';
import { actionSound } from '../src/ui/actionSounds';
import { plain } from './helpers';
import { BrokenStorage, MemoryStorage } from './memoryStorage';

describe('réglages : lecture tolérante', () => {
  it('reprend les valeurs par défaut quand rien n’est enregistré ou que tout est illisible', () => {
    expect(readSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(readSettings('n’importe quoi')).toEqual(DEFAULT_SETTINGS);
    expect(readSettings([1, 2])).toEqual(DEFAULT_SETTINGS);
  });

  it('garde les valeurs valides et remplace champ par champ celles qui ne le sont pas', () => {
    const s = readSettings({
      sound: { enabled: false, volume: 3 },
      motion: 'reduced',
      notation: 'scientifique',
      textScale: 1.15,
      autosaveSeconds: 7,
      notifications: { events: false, works: 'oui' },
      showObjectives: false,
    });
    expect(s.sound).toEqual({ enabled: false, volume: 1 });
    expect(s.motion).toBe('reduced');
    expect(s.notation).toBe('short');
    expect(s.textScale).toBe(1.15);
    expect(s.autosaveSeconds).toBe(15);
    expect(s.notifications).toEqual({ events: false, works: true, objectives: true });
    expect(s.showObjectives).toBe(false);
  });

  it('borne le volume entre 0 et 1 et ignore un volume non numérique', () => {
    expect(readSettings({ sound: { volume: -1 } }).sound.volume).toBe(0);
    expect(readSettings({ sound: { volume: Number.NaN } }).sound.volume).toBe(0.5);
  });

  it('fusionne une modification partielle des sous-objets', () => {
    const s = updateSettings(DEFAULT_SETTINGS, { sound: { volume: 0.2 }, notifications: { works: false } });
    expect(s.sound).toEqual({ enabled: true, volume: 0.2 });
    expect(s.notifications).toEqual({ events: true, works: false, objectives: true });
  });
});

describe('réglages : règles', () => {
  it('animations : Auto suit l’appareil, Activées et Réduites l’emportent sur lui', () => {
    const auto = DEFAULT_SETTINGS;
    expect(isMotionReduced(auto, true)).toBe(true);
    expect(isMotionReduced(auto, false)).toBe(false);
    expect(isMotionReduced({ ...auto, motion: 'full' }, true)).toBe(false);
    expect(isMotionReduced({ ...auto, motion: 'reduced' }, false)).toBe(true);
  });

  it('son coupé = volume 0, quel que soit le curseur', () => {
    expect(effectiveVolume(DEFAULT_SETTINGS)).toBe(0.5);
    expect(effectiveVolume(updateSettings(DEFAULT_SETTINGS, { sound: { enabled: false } }))).toBe(0);
  });

  it('notifications : un type désactivé est masqué, une notification sans type s’affiche toujours', () => {
    const s = updateSettings(DEFAULT_SETTINGS, { notifications: { events: false } });
    expect(isNotificationEnabled(s, 'events')).toBe(false);
    expect(isNotificationEnabled(s, 'works')).toBe(true);
    expect(isNotificationEnabled(s, undefined)).toBe(true);
  });

  it('sons : saisie, achats ; rien pour un licenciement ou ce qu’une notification annonce déjà', () => {
    expect(actionSound({ type: 'click' })).toBe('click');
    expect(actionSound({ type: 'hire', role: 'intern' })).toBe('buy');
    expect(actionSound({ type: 'dismiss', role: 'intern' })).toBeNull();
    expect(actionSound({ type: 'claimObjective', id: 'firstInvoices' })).toBeNull();
  });
});

describe('réglages : stockage par appareil', () => {
  it('sauvegarde chaque changement, le relit et prévient les abonnés', () => {
    const storage = new MemoryStorage();
    const store = new SettingsStore(storage);
    const seen: number[] = [];
    store.subscribe((s) => seen.push(s.autosaveSeconds));
    store.update({ autosaveSeconds: 60 });
    expect(seen).toEqual([60]);
    expect(JSON.parse(storage.getItem(SETTINGS_KEY) ?? '{}').autosaveSeconds).toBe(60);
    expect(new SettingsStore(storage).get().autosaveSeconds).toBe(60);
  });

  it('rétablit les valeurs par défaut', () => {
    const store = new SettingsStore(new MemoryStorage());
    store.update({ motion: 'reduced', textScale: 1.3 });
    expect(store.reset()).toEqual(DEFAULT_SETTINGS);
  });

  it('fonctionne sans stockage, ou avec un stockage plein ou illisible', () => {
    const broken = new SettingsStore(new BrokenStorage());
    expect(broken.update({ notation: 'full' }).notation).toBe('full');
    const full = new MemoryStorage();
    full.failWrites = true;
    expect(new SettingsStore(full).update({ textScale: 0.9 }).textScale).toBe(0.9);
    const garbage = new MemoryStorage();
    garbage.setItem(SETTINGS_KEY, '{pas du json');
    expect(new SettingsStore(garbage).get()).toEqual(DEFAULT_SETTINGS);
    expect(new SettingsStore(null).get()).toEqual(DEFAULT_SETTINGS);
  });
});

describe('affichage des montants', () => {
  it('complet : tous les chiffres, sans abréviation', () => {
    expect(plain(formatMoney(12_500, 'full'))).toBe('12 500 €');
    expect(plain(formatMoney(3_456_789.9, 'full'))).toBe('3 456 789 €');
    expect(plain(formatRate(12_500, 'full'))).toBe('12 500 €/s');
    expect(plain(formatMoney(2e12, 'full'))).toBe('2,00e12 €');
  });

  it('abrégé par défaut', () => {
    expect(plain(formatMoney(12_500))).toBe('12,5 k€');
  });
});
