import { describe, expect, it } from 'vitest';
import { HQ_SLOT, SLOTS, WORLD, getZone, isZoneUnlocked, ZONES } from '../src/data/map';
import { contains } from '../src/game/geometry';

const all = [HQ_SLOT, ...SLOTS];

describe('données de la carte', () => {
  it('chaque emplacement est dans sa zone et dans le monde', () => {
    for (const slot of all) {
      const zone = getZone(slot.zone).rect;
      expect(contains(zone, slot.x, slot.y) && contains(zone, slot.x + slot.w, slot.y + slot.h), slot.id).toBe(true);
      expect(slot.x + slot.w <= WORLD.width && slot.y + slot.h <= WORLD.height, slot.id).toBe(true);
    }
  });

  it('les emplacements ne se chevauchent pas et ont des identifiants uniques', () => {
    expect(new Set(all.map((s) => s.id)).size).toBe(all.length);
    for (const a of all) {
      for (const b of all) {
        if (a === b) continue;
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        expect(overlap, `${a.id} / ${b.id}`).toBe(false);
      }
    }
  });

  it('ouvre les zones selon le niveau du Bureau principal', () => {
    const open = (level: number) => ZONES.filter((z) => isZoneUnlocked(z, level)).map((z) => z.id);
    expect(open(1)).toEqual(['start']);
    expect(open(2)).toEqual(['start', 'east']);
    expect(open(4)).toEqual(['start', 'east', 'north', 'garden']);
  });
});
