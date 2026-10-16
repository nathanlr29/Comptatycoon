import { getIncomePerSecond } from '../core/economy';
import { formatRate } from '../core/format';
import { getCapacity, getStaffCount } from '../core/recruitment';
import type { GameState } from '../core/state';
import { h, setText } from './dom';

/** Fiche du Bureau principal (l'amélioration arrive avec les bâtiments). */
export class BuildingInfo {
  readonly el = h('div', { class: 'facts' });
  private readonly level = h('dd');
  private readonly team = h('dd');
  private readonly income = h('dd');

  constructor() {
    this.el.append(
      h('p', { class: 'facts__lead', text: 'Le cœur de votre cabinet. Vos associés y reçoivent les clients.' }),
      h('dl', {}, h('dt', { text: 'Niveau' }), this.level, h('dt', { text: 'Équipe' }), this.team, h('dt', { text: 'Production' }), this.income),
    );
  }

  render(state: GameState, now: number): void {
    const hq = state.buildings.find((b) => b.id === 'hq');
    setText(this.level, String(hq?.level ?? 1));
    setText(this.team, `${getStaffCount(state)} sur ${getCapacity(state)} places, ${state.partners} associé${state.partners > 1 ? 's' : ''}`);
    setText(this.income, formatRate(getIncomePerSecond(state, now)));
  }
}
