import { describe, expect, it } from 'vitest';
import { OFFICE_STAGES, ROOMS, deskRect, getStage, visibleDesks, type TileRect } from '../src/data/office';
import { depthOf, isoToScreen, screenToIso } from '../src/game/iso';

const inside = (r: TileRect, x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
const within = (outer: TileRect, r: TileRect) => r.x >= outer.x && r.y >= outer.y && r.x + r.w <= outer.x + outer.w && r.y + r.h <= outer.y + outer.h;
const overlap = (a: TileRect, b: TileRect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe('projection isométrique', () => {
  it('screenToIso inverse isoToScreen', () => {
    for (const [x, y] of [[0, 0], [3.5, 1.25], [12, 7], [0, 9]] as const) {
      const p = isoToScreen(x, y);
      const back = screenToIso(p.x, p.y);
      expect(back.x).toBeCloseTo(x);
      expect(back.y).toBeCloseTo(y);
    }
  });

  it('un objet plus en avant est dessiné par-dessus', () => {
    expect(depthOf(2, 2)).toBeGreaterThan(depthOf(1, 2));
    expect(depthOf(2, 2)).toBeGreaterThan(depthOf(2, 1));
    expect(depthOf(2, 2, 40)).toBeGreaterThan(depthOf(2, 2));
  });
});

describe('plan du cabinet', () => {
  it('chaque niveau agrandit le précédent', () => {
    OFFICE_STAGES.forEach((s, i) => {
      expect(s.stage).toBe(i + 1);
      const prev = OFFICE_STAGES[i - 1];
      if (prev) expect(s.size.w >= prev.size.w && s.size.h >= prev.size.h && s.size.w * s.size.h > prev.size.w * prev.size.h).toBe(true);
    });
    expect(getStage(0).stage).toBe(1);
    expect(getStage(99).stage).toBe(OFFICE_STAGES.length);
  });

  it('chaque pièce tient dans son niveau, sans chevauchement, postes et mobilier compris', () => {
    for (const room of ROOMS) {
      const { w, h } = getStage(room.minStage).size;
      expect(room.rect.x + room.rect.w <= w && room.rect.y + room.rect.h <= h, room.type).toBe(true);
      for (const d of [...room.desks, ...room.furniture]) expect(inside(room.rect, d.x, d.y), `${room.type} ${d.x},${d.y}`).toBe(true);
      for (const d of room.desks) expect(within(room.rect, deskRect(d)), `bureau ${room.type} ${d.x},${d.y}`).toBe(true);
      for (const other of ROOMS) if (other !== room) expect(overlap(room.rect, other.rect), `${room.type}/${other.type}`).toBe(false);
    }
    expect(new Set(ROOMS.map((r) => r.type)).size).toBe(ROOMS.length);
  });

  it("les postes de l'espace commun sont dans leur niveau et hors des pièces", () => {
    for (const s of OFFICE_STAGES) {
      for (const d of s.desks) {
        expect(inside({ x: 0, y: 0, ...s.size }, d.x, d.y), `niveau ${s.stage}`).toBe(true);
        expect(within({ x: 0, y: 0, ...s.size }, deskRect(d)), `bureau niveau ${s.stage}`).toBe(true);
        for (const room of ROOMS) expect(overlap(room.rect, deskRect(d)) || inside(room.rect, d.x, d.y), `niveau ${s.stage} dans ${room.type}`).toBe(false);
      }
    }
  });

  it('postes visibles : réservés en tête, rien pour une pièce non achetée', () => {
    const start = visibleDesks(1, ['headquarters']);
    expect(start[0]?.reserved).toBe('director');
    expect(start.length).toBe(3 + getStage(1).desks.length);
    expect(visibleDesks(1, ['headquarters', 'openSpace']).length).toBe(start.length + 6);
    expect(visibleDesks(1, ['headquarters', 'meetingRoom']).length).toBe(start.length);
  });
});
