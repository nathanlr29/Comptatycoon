import { describe, expect, it } from 'vitest';
import type { GameAction } from '../src/core/actions';
import { getBaseIncomePerSecond, getHireCost, getPartnerCost } from '../src/core/economy';
import { getFirmLevel } from '../src/core/expansion';
import { canSellFirm } from '../src/core/prestige';
import { createRng } from '../src/core/random';
import { getCapacity, getStaffCount } from '../src/core/recruitment';
import { createInitialState, type GameState } from '../src/core/state';
import { GameStore } from '../src/core/store';
import { CONSTRUCTIBLE } from '../src/data/buildings';
import { DEPARTMENT_IDS, DEPARTMENTS } from '../src/data/departments';
import type { DifficultyId } from '../src/data/difficulty';
import { OBJECTIVES } from '../src/data/objectives';
import { STAFF, STAFF_ROLES, type StaffRole } from '../src/data/staff';
import { UPGRADE_IDS, UPGRADES } from '../src/data/upgrades';

/**
 * Partie simulée par un joueur appliqué : 2 saisies/s, achète dès que possible, recrute le meilleur
 * collaborateur payable en moins d'une minute de revenu, cède le cabinet quand la cession double son réseau.
 * Rapport détaillé : `npm run simulate` (variables MINUTES, CPS, DIFFICULTY).
 */
export interface SimReport {
  /** Minute de chaque première fois (« Pôle Social », « Le siège », « Cession 1 »…). */
  milestones: Record<string, number>;
  lines: string[];
}

function byCost(a: string, b: string): number {
  return UPGRADES[a as keyof typeof UPGRADES].cost - UPGRADES[b as keyof typeof UPGRADES].cost;
}

export function simulateSession(minutes: number, cps = 2, difficulty: DifficultyId = 'normal'): SimReport {
  const rng = createRng(42);
  let now = 0;
  const store = new GameStore(createInitialState(now, { difficulty }), rng);
  const milestones: Record<string, number> = {};
  const lines: string[] = [];
  const mark = (key: string, sec: number) => {
    if (!(key in milestones)) milestones[key] = Math.round(sec / 6) / 10;
  };
  const act = (a: GameAction) => store.dispatch(a, now).ok;
  const income = (s: GameState) => getBaseIncomePerSecond(s) + cps;

  for (let sec = 1; sec <= minutes * 60; sec++) {
    for (let c = 0; c < cps; c++) store.dispatch({ type: 'click' }, now + (c * 1000) / cps);
    now = sec * 1000;
    store.tick(now);
    for (const o of OBJECTIVES) act({ type: 'claimObjective', id: o.id });
    for (const id of [...UPGRADE_IDS].sort(byCost)) act({ type: 'buyUpgrade', id });
    act({ type: 'upgradeBuilding', buildingId: 'hq' });
    for (const id of DEPARTMENT_IDS) if (act({ type: 'buyDepartment', id })) mark(DEPARTMENTS[id].name, sec);
    for (const b of CONSTRUCTIBLE) if (!store.getState().buildings.some((x) => x.type === b)) act({ type: 'build', building: b });
    for (let k = 0; k < 20; k++) {
      const s = store.getState();
      const unlocked = STAFF_ROLES.filter((r) => s.reputation >= STAFF[r].minReputation);
      const target: StaffRole = [...unlocked].reverse().find((r) => getHireCost(s, r) <= Math.max(income(s) * 60, 30)) ?? 'intern';
      if (getStaffCount(s) < getCapacity(s)) {
        if (!act({ type: 'hire', role: target })) break;
        continue;
      }
      if (getPartnerCost(s) <= s.money) {
        act({ type: 'hirePartner' });
        continue;
      }
      const low = STAFF_ROLES.find((r) => s.staff[r] > 0);
      if (!low || STAFF_ROLES.indexOf(low) >= STAFF_ROLES.indexOf(target) || getHireCost(s, target) * 1.5 > s.money) break;
      act({ type: 'dismiss', role: low });
      act({ type: 'hire', role: target });
    }
    const s = store.getState();
    const level = getFirmLevel(s);
    if (level >= 2) mark('Niveau 2', sec);
    if (level >= 5) mark(`Le siège (partie ${s.prestige.sales + 1})`, sec);
    if (getBaseIncomePerSecond(s) >= 1_000) mark('1 000 €/s', sec);
    const sale = canSellFirm(s);
    if (sale.ok && sale.contacts >= Math.max(10, s.prestige.contacts)) {
      act({ type: 'sellFirm' });
      mark(`Cession ${s.prestige.sales + 1} (+${sale.contacts})`, sec);
    }
    if (sec % 600 === 0 || sec === 60 || sec === 300) {
      lines.push(
        `${String(sec / 60).padStart(4)} min · ${getBaseIncomePerSecond(s).toExponential(2)} €/s · niv. ${level} · rép. ${s.reputation} · ` +
          `équipe ${getStaffCount(s)}/${getCapacity(s)} · pôles ${s.departments.length} · contacts ${s.prestige.contacts}`,
      );
    }
  }
  return { milestones, lines };
}

describe('rythme de la partie (joueur simulé)', () => {
  it('le premier pôle arrive après 5 min et le siège ne s’atteint pas en un quart d’heure', () => {
    const { milestones } = simulateSession(40);
    expect(milestones['Pôle Social']).toBeGreaterThan(5);
    expect(milestones['Le siège (partie 1)'] ?? Infinity).toBeGreaterThan(15);
  });

  it.skipIf(!process.env.SIMULATE)('rapport détaillé', () => {
    const minutes = Number(process.env.MINUTES ?? 240);
    const difficulty = (process.env.DIFFICULTY ?? 'normal') as DifficultyId;
    const report = simulateSession(minutes, Number(process.env.CPS ?? 2), difficulty);
    process.stdout.write(`\n${report.lines.join('\n')}\n${JSON.stringify(report.milestones, null, 1)}\n`);
  }, 600_000);
});
