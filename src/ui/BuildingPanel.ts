import { canUpgrade } from '../core/buildings';
import { getIncomePerSecond } from '../core/economy';
import { formatMoney, formatRate } from '../core/format';
import { getCapacity, getStaffCount } from '../core/recruitment';
import type { GameState } from '../core/state';
import { BUILDINGS } from '../data/buildings';
import { durationText, effectText, refusalText } from '../data/texts';
import { h, setText } from './dom';

/** Fiche d'une pièce aménagée : niveau, effet actuel et suivant, amélioration. */
export class BuildingPanel {
  readonly el = h('div', { class: 'facts' });
  private buildingId = '';
  private readonly lead = h('p', { class: 'facts__lead' });
  private readonly level = h('dd');
  private readonly effect = h('dd');
  private readonly next = h('dd');
  private readonly nextLabel = h('dt', { text: 'Niveau suivant' });
  private readonly works = h('dd');
  private readonly worksLabel = h('dt', { text: 'Travaux' });
  private readonly team = h('dd');
  private readonly teamLabel = h('dt', { text: 'Équipe' });
  private readonly income = h('dd');
  private readonly incomeLabel = h('dt', { text: 'Production' });
  private readonly button = h('button', { class: 'item__buy facts__action', type: 'button' });
  private readonly reason = h('p', { class: 'item__reason facts__reason' });

  constructor(onUpgrade: (buildingId: string) => void) {
    this.button.addEventListener('click', () => onUpgrade(this.buildingId));
    this.el.append(
      this.lead,
      h(
        'dl',
        {},
        h('dt', { text: 'Niveau' }),
        this.level,
        h('dt', { text: 'Effet' }),
        this.effect,
        this.nextLabel,
        this.next,
        this.worksLabel,
        this.works,
        this.teamLabel,
        this.team,
        this.incomeLabel,
        this.income,
      ),
      this.button,
      this.reason,
    );
  }

  /** Choisit la pièce affichée ; renvoie son nom pour le titre du panneau. */
  select(buildingId: string, state: GameState): string {
    this.buildingId = buildingId;
    const building = state.buildings.find((b) => b.id === buildingId);
    return building ? BUILDINGS[building.type].name : '';
  }

  render(state: GameState, now: number): void {
    const building = state.buildings.find((b) => b.id === this.buildingId);
    if (!building) return;
    const def = BUILDINGS[building.type];
    const check = canUpgrade(state, building.id);
    const atMax = building.level >= def.maxLevel;
    const isHq = building.type === 'headquarters';

    setText(this.lead, def.description);
    setText(this.level, building.level === 0 ? 'En travaux' : `${building.level} / ${def.maxLevel}`);
    setText(this.effect, building.level === 0 ? 'Aucun pendant les travaux' : effectText(def, building.level));
    const nextLevel = building.pending?.targetLevel ?? building.level + 1;
    show([this.nextLabel, this.next], !atMax);
    setText(this.next, atMax ? '' : effectText(def, nextLevel));
    show([this.worksLabel, this.works], !!building.pending);
    setText(this.works, building.pending ? `niv. ${nextLevel}, encore ${durationText(building.pending.endsAt - now)}` : '');
    show([this.teamLabel, this.team, this.incomeLabel, this.income], isHq);
    if (isHq) {
      setText(this.team, `${getStaffCount(state)} sur ${getCapacity(state)} places, ${state.partners} associé${state.partners > 1 ? 's' : ''}`);
      setText(this.income, formatRate(getIncomePerSecond(state, now)));
    }

    this.button.hidden = atMax || !!building.pending;
    setText(this.button, `Améliorer · ${formatMoney(check.cost)} · ${durationText(check.durationMs)}`);
    this.button.disabled = !check.ok;
    const reason = check.ok ? '' : refusalText(check.reason);
    setText(this.reason, check.ok || this.button.hidden ? '' : reason);
  }
}

function show(els: HTMLElement[], visible: boolean): void {
  for (const el of els) el.hidden = !visible;
}
