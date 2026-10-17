import { describe, expect, it } from 'vitest';
import { facadeLayout, facadeStalls } from '../src/data/facade';
import { MAX_STAGE, type TileRect } from '../src/data/office';

const overlaps = (a: TileRect, b: TileRect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const inside = (a: TileRect, outer: TileRect) => a.x >= outer.x && a.y >= outer.y && a.x + a.w <= outer.x + outer.w && a.y + a.h <= outer.y + outer.h;

describe('façade', () => {
  it('a un gabarit pour chaque niveau du cabinet, qui ne rapetisse jamais', () => {
    let floors = 0;
    let width = 0;
    for (let stage = 1; stage <= MAX_STAGE; stage++) {
      const main = facadeLayout(stage).buildings[0]!;
      expect(main.kind).toBe('main');
      expect(main.floors).toBeGreaterThanOrEqual(floors);
      expect(main.w).toBeGreaterThanOrEqual(width);
      floors = main.floors;
      width = main.w;
    }
  });

  it("montre l'annexe au niveau 6 et le campus au niveau 7, pas avant", () => {
    expect(facadeLayout(5).buildings.map((b) => b.kind)).toEqual(['main']);
    expect(facadeLayout(6).buildings.map((b) => b.kind)).toEqual(['main', 'annex']);
    expect(facadeLayout(7).buildings.map((b) => b.kind)).toEqual(['main', 'annex', 'campus']);
    expect(facadeLayout(5).bridge).toBeNull();
    expect(facadeLayout(6).bridge).not.toBeNull();
  });

  it('ne superpose ni les bâtiments ni le parking, et tout tient sur le socle', () => {
    for (let stage = 1; stage <= MAX_STAGE; stage++) {
      const l = facadeLayout(stage);
      const rects: TileRect[] = [...l.buildings, l.parking];
      rects.forEach((a, i) => rects.slice(i + 1).forEach((b) => expect(overlaps(a, b), `niveau ${stage}`).toBe(false)));
      for (const r of rects) expect(inside(r, l.plate), `niveau ${stage}`).toBe(true);
      for (const [x, y] of l.trees) expect(l.buildings.some((b) => overlaps({ x: x - 0.3, y: y - 0.3, w: 0.6, h: 0.6 }, b))).toBe(false);
    }
  });

  it('découpe le parking en places égales qui le remplissent', () => {
    const p = facadeLayout(5).parking;
    const stalls = facadeStalls(p);
    expect(stalls.length).toBeGreaterThanOrEqual(2);
    expect(stalls.reduce((s, r) => s + r.w, 0)).toBeCloseTo(p.w);
  });

  it('borne les niveaux hors plage', () => {
    expect(facadeLayout(0)).toEqual(facadeLayout(1));
    expect(facadeLayout(99)).toEqual(facadeLayout(MAX_STAGE));
  });
});
