import { describe, expect, it } from 'vitest';
import {
  applyFriction,
  clampScrollAxis,
  clampZoom,
  hitTest,
  isTap,
  fitZoom,
  clampScrollIn,
  screenToWorld,
  scrollForZoomAt,
  ZOOM,
} from '../src/game/geometry';

describe('tap ou glissement', () => {
  it('un appui court et immobile est un tap', () => {
    expect(isTap({ maxDistance: 3, durationMs: 120, multiTouch: false })).toBe(true);
  });

  it('un déplacement de plus de 8 px n’est jamais un tap', () => {
    expect(isTap({ maxDistance: 9, durationMs: 100, multiTouch: false })).toBe(false);
  });

  it('un appui long n’est pas un tap', () => {
    expect(isTap({ maxDistance: 0, durationMs: 400, multiTouch: false })).toBe(false);
  });

  it('un pincement n’est jamais un tap, même sans bouger', () => {
    expect(isTap({ maxDistance: 0, durationMs: 100, multiTouch: true })).toBe(false);
  });
});

describe('zoom', () => {
  it('borne le zoom entre le minimum et 2', () => {
    expect(clampZoom(5, ZOOM.min)).toBe(ZOOM.max);
    expect(clampZoom(0.1, ZOOM.min)).toBe(ZOOM.min);
  });

  it('cadre une zone entière dans la vue', () => {
    expect(fitZoom(390, 844, 780, 400)).toBeCloseTo(0.5, 9);
    expect(fitZoom(1000, 500, 500, 500)).toBeCloseTo(1, 9);
  });

  it('borne le défilement à une zone qui ne commence pas en 0', () => {
    // Zone de x = -500 à 500, vue de 200 px au zoom 1 : le bord gauche visible reste dans la zone.
    expect(clampScrollIn(-2000, 200, 1, -500, 1000)).toBe(-500);
    expect(clampScrollIn(2000, 200, 1, -500, 1000)).toBe(300);
    // Zone plus petite que la vue : centrée.
    expect(clampScrollIn(123, 2000, 1, -500, 1000)).toBe(-1000);
  });

  it('garde le même point du monde sous les doigts en zoomant', () => {
    const view = { scrollX: 300, scrollY: 200, width: 390, height: 844, zoom: 1 };
    const before = screenToWorld(view, 100, 600);
    const next = { ...view, ...scrollForZoomAt(view, 1.7, 100, 600), zoom: 1.7 };
    const after = screenToWorld(next, 100, 600);
    expect(after.x).toBeCloseTo(before.x, 9);
    expect(after.y).toBeCloseTo(before.y, 9);
  });
});

describe('limites de la caméra', () => {
  it('empêche de voir au-delà du monde', () => {
    const left = clampScrollAxis(-1_000, 400, 1, 2400);
    expect(screenToWorld({ scrollX: left, scrollY: 0, width: 400, height: 400, zoom: 1 }, 0, 0).x).toBe(0);
    const right = clampScrollAxis(10_000, 400, 0.5, 2400);
    expect(screenToWorld({ scrollX: right, scrollY: 0, width: 400, height: 400, zoom: 0.5 }, 400, 0).x).toBeCloseTo(2400, 9);
  });

  it('centre le monde si la vue est plus grande que lui', () => {
    expect(clampScrollAxis(123, 3000, 1, 2400)).toBe(2400 / 2 - 3000 / 2);
  });
});

describe('sélection', () => {
  const items = [
    { id: 'a', x: 0, y: 0, w: 10, h: 10 },
    { id: 'b', x: 20, y: 0, w: 10, h: 10 },
  ];

  it('trouve l’élément sous le point', () => {
    expect(hitTest(items, 25, 5)?.id).toBe('b');
  });

  it('ne trouve rien dans le vide', () => {
    expect(hitTest(items, 15, 5)).toBeUndefined();
  });
});

describe('inertie', () => {
  it('ralentit puis s’arrête', () => {
    let v = 2;
    for (let i = 0; i < 200; i++) v = applyFriction(v, 16);
    expect(v).toBe(0);
  });

  it('ne dépend pas du découpage du temps', () => {
    expect(applyFriction(applyFriction(1, 8), 8)).toBeCloseTo(applyFriction(1, 16), 9);
  });
});
