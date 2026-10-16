import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/core/actions';
import { createInitialState } from '../src/core/state';
import { LocalSaveService } from '../src/persistence/LocalSaveService';
import { MAX_PROFILES, PROFILE_INDEX_KEY, ProfileStore } from '../src/persistence/ProfileStore';
import { parseSave, SCHEMA_VERSION, serializeSave, validateSave } from '../src/persistence/SaveSchema';
import { backupKey, saveKey } from '../src/persistence/SaveService';
import { makeState, T0 } from './helpers';
import { BrokenStorage, MemoryStorage } from './memoryStorage';

function setup(storage = new MemoryStorage()) {
  let clock = T0;
  let n = 0;
  const now = () => clock;
  const profiles = new ProfileStore(storage, now, () => `p${++n}`);
  const saves = new LocalSaveService(storage, profiles, now);
  return { storage, profiles, saves, advance: (ms: number) => (clock += ms) };
}

function newProfile(profiles: ProfileStore, name = 'Cabinet Test') {
  const result = profiles.create(name);
  if (!result.ok) throw new Error(result.reason);
  return result.profile;
}

const played = makeState({
  money: 1234.56,
  reputation: 7,
  staff: { intern: 3, junior: 2, senior: 1, manager: 0 },
  upgrades: ['dualScreen'],
  effects: [{ id: 'fiscal', incomeMultiplier: 2, expiresAt: T0 + 60_000 }],
  stats: { totalEarned: 5000, clicks: 42 },
});

describe('schéma de sauvegarde', () => {
  it('relit à l’identique ce qu’il écrit', () => {
    const parsed = parseSave(serializeSave(played, T0));
    expect(parsed).toEqual({ ok: true, save: { schemaVersion: SCHEMA_VERSION, savedAt: T0, state: played } });
  });

  it('rejette un JSON invalide', () => {
    expect(parseSave('{pas du json')).toEqual({ ok: false, error: 'JSON invalide' });
  });

  it('rejette un champ manquant ou de mauvais type, en le nommant', () => {
    const { money: _omit, ...withoutMoney } = played;
    const missing = validateSave({ schemaVersion: 1, savedAt: T0, state: withoutMoney });
    expect(missing).toEqual({ ok: false, error: 'state.money : nombre attendu' });
    const wrong = validateSave({ schemaVersion: 1, savedAt: T0, state: { ...played, staff: { ...played.staff, junior: '2' } } });
    expect(wrong).toEqual({ ok: false, error: 'state.staff.junior : nombre attendu' });
  });

  it('ignore une amélioration inconnue sans rejeter la partie', () => {
    const parsed = validateSave({ schemaVersion: 1, savedAt: T0, state: { ...played, upgrades: ['dualScreen', 'removed'] } });
    expect(parsed.ok && parsed.save.state.upgrades).toEqual(['dualScreen']);
  });

  it('lit les pôles et portefeuilles, avec des valeurs par défaut s’ils manquent', () => {
    const { departments: _d, portfolios: _p, ...older } = played;
    const parsed = validateSave({ schemaVersion: 1, savedAt: T0, state: older });
    expect(parsed.ok && [parsed.save.state.departments, parsed.save.state.portfolios]).toEqual([[], 0]);
    const full = validateSave({ schemaVersion: 1, savedAt: T0, state: { ...played, departments: ['social', 'nope'], portfolios: 2 } });
    expect(full.ok && [full.save.state.departments, full.save.state.portfolios]).toEqual([['social'], 2]);
    expect(validateSave({ schemaVersion: 1, savedAt: T0, state: { ...played, portfolios: -1 } }).ok).toBe(false);
  });

  it('migre une sauvegarde v0 (sans version ni statistiques) vers v1', () => {
    const { stats: _omit, ...v0State } = played;
    const parsed = validateSave({ savedAt: T0, state: v0State });
    expect(parsed).toEqual({
      ok: true,
      save: { schemaVersion: 1, savedAt: T0, state: { ...played, stats: { totalEarned: 0, clicks: 0 } } },
    });
  });

  it('refuse une version plus récente que le jeu', () => {
    expect(validateSave({ schemaVersion: SCHEMA_VERSION + 1, savedAt: T0, state: played }).ok).toBe(false);
  });
});

describe('sauvegarde locale', () => {
  it('restaure une sauvegarde valide à l’identique', () => {
    const { profiles, saves } = setup();
    const p = newProfile(profiles);
    expect(saves.save(p.id, played)).toEqual({ ok: true });
    expect(saves.load(p.id)).toEqual({ status: 'ok', state: played });
  });

  it('démarre une partie neuve pour un cabinet jamais sauvegardé', () => {
    const { profiles, saves } = setup();
    const p = newProfile(profiles);
    expect(saves.load(p.id)).toEqual({ status: 'new', state: createInitialState(T0) });
  });

  it('JSON invalide → état initial, donnée brute conservée, secours proposé', () => {
    const { storage, profiles, saves, advance } = setup();
    const p = newProfile(profiles);
    saves.save(p.id, played);
    saves.save(p.id, played); // la première devient la copie de secours
    storage.data.set(saveKey(p.id), '{cassé');
    advance(1000);
    const result = saves.load(p.id);
    expect(result.status).toBe('corrupt');
    if (result.status !== 'corrupt') return;
    expect(result.state).toEqual(createInitialState(T0 + 1000));
    expect(result.corruptKey).toBe(`${saveKey(p.id)}:corrupt-${T0 + 1000}`);
    expect(storage.getItem(result.corruptKey!)).toBe('{cassé');
    expect(result.backupAvailable).toBe(true);
    expect(saves.restoreBackup(p.id)).toEqual(played);
    expect(saves.load(p.id)).toEqual({ status: 'ok', state: played });
  });

  it('ne plante pas si le stockage est inaccessible', () => {
    const storage = new BrokenStorage();
    const profiles = new ProfileStore(storage, () => T0);
    const saves = new LocalSaveService(storage, profiles, () => T0);
    expect(profiles.list()).toEqual([]);
    expect(profiles.create('Cabinet')).toEqual({ ok: false, reason: 'unavailable' });
    expect(saves.load('x').status).toBe('unavailable');
    expect(saves.save('x', played).ok).toBe(false);
  });

  it('signale un quota dépassé sans planter', () => {
    const { storage, profiles, saves } = setup();
    const p = newProfile(profiles);
    storage.failWrites = true;
    expect(saves.save(p.id, played)).toEqual({ ok: false, reason: 'quota' });
  });

  it('le résumé de l’index suit la dernière sauvegarde', () => {
    const { profiles, saves, advance } = setup();
    const p = newProfile(profiles);
    advance(5000);
    saves.save(p.id, played);
    const entry = profiles.get(p.id)!;
    expect(entry.lastPlayedAt).toBe(T0 + 5000);
    expect(entry.summary.money).toBe(played.money);
    expect(entry.summary.incomePerSecond).toBeCloseTo((3 * 0.5 + 2 * 4 + 30) * 1.07 * 2, 9);
  });

  it('export puis import = même état, dans un nouveau cabinet', () => {
    const { profiles, saves } = setup();
    const p = newProfile(profiles, 'Fiduciaire Dupont');
    saves.save(p.id, played);
    const text = saves.exportText(p.id)!;
    const imported = saves.importText(text);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    expect(imported.profile.id).not.toBe(p.id);
    expect(imported.profile.name).toBe('Fiduciaire Dupont');
    expect(saves.load(imported.profile.id)).toEqual({ status: 'ok', state: played });
  });

  it('refuse un import invalide sans créer de cabinet', () => {
    const { profiles, saves } = setup();
    expect(saves.importText('bonjour').ok).toBe(false);
    expect(saves.importText(JSON.stringify({ format: 'comptatycoon-cabinet', schemaVersion: 1, savedAt: T0, state: {} })).ok).toBe(false);
    expect(profiles.list()).toEqual([]);
  });
});

describe('profils', () => {
  it('deux cabinets ne partagent aucune donnée', () => {
    const { profiles, saves } = setup();
    const a = newProfile(profiles, 'Cabinet A');
    const b = newProfile(profiles, 'Cabinet B');
    saves.save(a.id, played);
    const clicked = applyAction(createInitialState(T0), { type: 'click' }, T0).state;
    saves.save(b.id, clicked);
    expect(saves.load(a.id)).toEqual({ status: 'ok', state: played });
    expect(saves.load(b.id)).toEqual({ status: 'ok', state: clicked });
  });

  it('supprimer un cabinet ne touche pas les autres', () => {
    const { storage, profiles, saves } = setup();
    const a = newProfile(profiles, 'Cabinet A');
    const b = newProfile(profiles, 'Cabinet B');
    saves.save(a.id, played);
    saves.save(a.id, played);
    saves.save(b.id, played);
    saves.remove(a.id);
    expect(storage.getItem(saveKey(a.id))).toBeNull();
    expect(storage.getItem(backupKey(a.id))).toBeNull();
    expect(profiles.list().map((p) => p.name)).toEqual(['Cabinet B']);
    expect(saves.load(b.id)).toEqual({ status: 'ok', state: played });
  });

  it('refuse un 6ᵉ cabinet', () => {
    const { profiles } = setup();
    for (let i = 1; i <= MAX_PROFILES; i++) newProfile(profiles, `Cabinet ${i}`);
    expect(profiles.create('Cabinet 6')).toEqual({ ok: false, reason: 'limit' });
    expect(profiles.list()).toHaveLength(MAX_PROFILES);
  });

  it('valide le nom (2 à 24 caractères) et renomme', () => {
    const { profiles } = setup();
    expect(profiles.create(' A ')).toEqual({ ok: false, reason: 'invalid_name' });
    expect(profiles.create('x'.repeat(25))).toEqual({ ok: false, reason: 'invalid_name' });
    const p = newProfile(profiles, '  Mon   cabinet ');
    expect(p.name).toBe('Mon cabinet');
    const renamed = profiles.rename(p.id, 'Audit & Conseil');
    expect(renamed.ok && renamed.profile.name).toBe('Audit & Conseil');
  });

  it('liste le dernier cabinet joué en tête', () => {
    const { profiles, saves, advance } = setup();
    const a = newProfile(profiles, 'Cabinet A');
    advance(10);
    newProfile(profiles, 'Cabinet B');
    advance(10);
    saves.save(a.id, played);
    expect(profiles.list().map((p) => p.name)).toEqual(['Cabinet A', 'Cabinet B']);
  });

  it('met de côté un index illisible au lieu de l’écraser', () => {
    const { storage, profiles } = setup();
    storage.data.set(PROFILE_INDEX_KEY, 'oups');
    expect(profiles.list()).toEqual([]);
    expect(storage.getItem(`${PROFILE_INDEX_KEY}:corrupt-${T0}`)).toBe('oups');
  });
});
