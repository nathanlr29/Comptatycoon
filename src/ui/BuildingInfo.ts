import { getIncomePerSecond } from '../core/economy';
import { formatRate } from '../core/format';
import { getCapacity, getStaffCount } from '../core/recruitment';
import type { GameState } from '../core/state';
import { h, setText } from './dom';

/** Fiche du Bureau principal ; son niveau est celui du cabinet (menu « Agrandir »). */
export class BuildingInfo {
  readonly el = h('div', { class: 'facts' });
  private readonly level = h('dd');
  private readonly team = h('dd');
  private readonly income = h('dd');

  constructor(onOpenExpansion: () => void) {
    const cta = h('button', { class: 'item__buy panel-cta', type: 'button', text: 'Agrandir le cabinet' });
    cta.addEventListener('click', onOpenExpansion);
    this.el.append(
      h('p', { class: 'facts__lead', text: 'Le cœur de votre cabinet. Vos associés y reçoivent les clients.' }),
      h('dl', {}, h('dt', { text: 'Niveau' }), this.level, h('dt', { text: 'Équipe' }), this.team, h('dt', { text: 'Production' }), this.income),
      cta,
    );
  }

  render(state: GameState, now: number): void {
    const hq = state.buildings.find((b) => b.id === 'hq');
    setText(this.level, String(hq?.level ?? 1));
    setText(this.team, `${getStaffCount(state)} sur ${getCapacity(state)} places, ${state.partners} associé${state.partners > 1 ? 's' : ''}`);
    setText(this.income, formatRate(getIncomePerSecond(state, now)));
  }
}
