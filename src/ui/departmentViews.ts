import { canBuyDepartment, canBuyPortfolio, getMissingRequirements, getPortfolioCost } from '../core/departments';
import { formatMoney } from '../core/format';
import type { GameState } from '../core/state';
import { DEPARTMENTS, DEPARTMENT_IDS, PORTFOLIO, type DepartmentId } from '../data/departments';
import { getExpansionLevel } from '../data/expansion';
import type { DepartmentView } from './DevelopmentPanel';

/** Couleurs d'identité des pôles, les mêmes que sur le plan (src/game/departmentRooms.ts). */
const COLORS: Record<DepartmentId, string> = { social: '#14b8a6', legal: '#ef4444', advisory: '#3b82f6' };

function spaceLabel(level: number): string {
  return `Place dans le cabinet : ${getExpansionLevel(level)?.name ?? `niveau ${level}`}`;
}

/** Traduit l'état du jeu en lignes de l'onglet Développement. Aucune règle ici : tout vient de core/. */
export function departmentViews(state: GameState): DepartmentView[] {
  const views: DepartmentView[] = DEPARTMENT_IDS.map((id) => {
    const def = DEPARTMENTS[id];
    const missing = getMissingRequirements(state, id);
    const check = canBuyDepartment(state, id);
    const owned = state.departments.includes(id);
    return {
      id,
      name: `${def.name} · ${def.tagline}`,
      description: def.description,
      effects: def.effectText.split(' · '),
      owned,
      canBuy: check.ok,
      actionLabel: owned ? 'Ouvert' : `Ouvrir · ${formatMoney(check.cost)}`,
      requirements: [
        { label: spaceLabel(def.minFirmLevel), met: !missing.some((m) => m.kind === 'space') },
        { label: `Réputation ${def.minReputation} (vous : ${Math.floor(state.reputation)})`, met: !missing.some((m) => m.kind === 'reputation') },
        { label: `Fonds : ${formatMoney(check.cost)}`, met: state.money >= check.cost },
      ],
      color: COLORS[id],
    };
  });
  const portfolio = canBuyPortfolio(state);
  const social = state.departments.includes(PORTFOLIO.requires);
  views.push({
    id: 'portfolio',
    name: state.portfolios > 0 ? `${PORTFOLIO.name} (${state.portfolios})` : PORTFOLIO.name,
    description: PORTFOLIO.description,
    effects: PORTFOLIO.effectText.split(' · '),
    owned: false,
    canBuy: portfolio.ok,
    actionLabel: `Racheter · ${formatMoney(portfolio.cost)}`,
    requirements: [
      { label: `${DEPARTMENTS[PORTFOLIO.requires].name} ouvert`, met: social },
      { label: `Fonds : ${formatMoney(getPortfolioCost(state))}`, met: state.money >= portfolio.cost },
    ],
    color: COLORS.social,
  });
  return views;
}
