import { describe, expect, it } from 'vitest';
import { formatMoney, formatRate } from '../src/core/format';
import { plain } from './helpers';

describe('formatage fr-FR', () => {
  it.each([
    [0, '0 €'],
    [999.99, '999 €'],
    [1_234, '1 234 €'],
    [9_999, '9 999 €'],
    [12_500, '12,5 k€'],
    [3_400_000, '3,40 M€'],
    [1_200_000_000, '1,2 Md€'],
    [1.234e12, '1,23e12 €'],
  ])('formatMoney(%d) = %s', (value, expected) => {
    expect(plain(formatMoney(value))).toBe(expected);
  });

  it('affiche le revenu/s avec une décimale sous 100 €/s', () => {
    expect(plain(formatRate(0.5))).toBe('0,5 €/s');
    expect(plain(formatRate(0.3))).toBe('0,3 €/s');
    expect(plain(formatRate(250))).toBe('250 €/s');
    expect(plain(formatRate(15_000))).toBe('15,0 k€/s');
  });
});
