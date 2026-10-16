import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/core/actions';
import { getTeam } from '../src/core/team';
import { assignSeats, lookIndex, type Seat } from '../src/game/characters/seating';
import { officeSeats } from '../src/game/characters/officeSeats';
import { makeState, T0 } from './helpers';

const staff = (intern = 0, junior = 0, senior = 0, manager = 0) => ({ intern, junior, senior, manager });

describe('équipe visible', () => {
  it('une personne par associé et par collaborateur, avec des ids stables', () => {
    const team = getTeam(makeState({ partners: 2, staff: staff(2, 1) }));
    expect(team.map((m) => m.id)).toEqual(['partner-0', 'partner-1', 'junior-0', 'intern-0', 'intern-1']);
  });

  it('suit les embauches et les départs du cœur', () => {
    let state = makeState({ money: 1_000 });
    state = applyAction(state, { type: 'hire', role: 'intern' }, T0).state;
    state = applyAction(state, { type: 'hire', role: 'intern' }, T0).state;
    expect(getTeam(state).filter((m) => m.role === 'intern')).toHaveLength(2);
    state = applyAction(state, { type: 'dismiss', role: 'intern' }, T0).state;
    expect(getTeam(state).map((m) => m.id)).toEqual(['partner-0', 'intern-0']);
  });
});

describe('placement aux bureaux', () => {
  const seats: Seat[] = [
    { x: 0, y: 0, kind: 'partner', depth: 0 },
    { x: 10, y: 0, kind: 'staff', depth: 0 },
    { x: 20, y: 0, kind: 'staff', depth: 0 },
    { x: 30, y: 0, kind: 'staff', depth: 0 },
  ];

  it('les associés vont aux bureaux d’associé, les autres aux postes', () => {
    const team = getTeam(makeState({ staff: staff(1, 1) }));
    const seating = assignSeats(new Map(), team, seats);
    expect(seating.get('partner-0')).toBe(0);
    expect(seats[seating.get('intern-0')!]!.kind).toBe('staff');
  });

  it('une arrivée ou un départ ne déplace personne d’autre', () => {
    const before = assignSeats(new Map(), getTeam(makeState({ staff: staff(2) })), seats);
    // Un junior arrive : il apparaît avant les alternants dans la liste mais prend un siège libre.
    const withJunior = assignSeats(before, getTeam(makeState({ staff: staff(2, 1) })), seats);
    expect(withJunior.get('intern-0')).toBe(before.get('intern-0'));
    expect(withJunior.get('intern-1')).toBe(before.get('intern-1'));
    expect(withJunior.get('junior-0')).toBe(3);
    // Le premier alternant reste, le dernier part.
    const after = assignSeats(withJunior, getTeam(makeState({ staff: staff(1, 1) })), seats);
    expect(after.has('intern-1')).toBe(false);
    expect(after.get('intern-0')).toBe(before.get('intern-0'));
  });

  it('sans siège libre, la personne n’est pas affichée', () => {
    const seating = assignSeats(new Map(), getTeam(makeState({ staff: staff(5) })), seats);
    expect(seating.size).toBe(4);
  });

  it('la même personne garde la même apparence', () => {
    expect(lookIndex('junior-3', 8)).toBe(lookIndex('junior-3', 8));
    const looks = new Set(Array.from({ length: 16 }, (_, i) => lookIndex(`intern-${i}`, 8)));
    expect(looks.size).toBeGreaterThan(3);
  });

  it('le petit bureau a un poste pour vous et des postes en plus avec l’open space', () => {
    const start = officeSeats(1, ['headquarters']);
    expect(start[0]?.kind).toBe('partner');
    const withOpenSpace = officeSeats(1, ['headquarters', 'openSpace']);
    expect(withOpenSpace.filter((s) => s.kind === 'staff').length).toBe(start.filter((s) => s.kind === 'staff').length + 6);
  });
});
