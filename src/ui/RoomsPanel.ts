import { canBuild, canUpgrade, getConstructionProgress } from '../core/buildings';
import { formatMoney } from '../core/format';
import type { BuildingState, GameState } from '../core/state';
import { BUILDINGS, CONSTRUCTIBLE, type BuildingType } from '../data/buildings';
import { durationText, effectText, refusalText } from '../data/texts';
import { h, setText } from './dom';

type Row = {
  type: BuildingType;
  level: HTMLElement;
  effect: HTMLElement;
  bar: HTMLElement;
  fill: HTMLElement;
  button: HTMLButtonElement;
  reason: HTMLElement;
};

export interface RoomsHandlers {
  onBuild: (type: BuildingType) => void;
  onUpgrade: (buildingId: string) => void;
}

/** Menu « Pièces » : aménager une pièce (le jeu choisit sa place), puis l'améliorer. */
export class RoomsPanel {
  readonly el = h('div', { class: 'list rooms' });
  private readonly rows: Row[] = [];
  private state: GameState | null = null;

  constructor(handlers: RoomsHandlers) {
    this.el.append(h('p', { class: 'list__summary', text: 'Choisissez une pièce : elle s’installe dans une place libre de vos locaux.' }));
    for (const type of CONSTRUCTIBLE) {
      const def = BUILDINGS[type];
      const level = h('span', { class: 'item__count' });
      const effect = h('span', { class: 'item__meta' });
      const fill = h('span', { class: 'rooms__fill' });
      const bar = h('span', { class: 'rooms__bar', role: 'progressbar', 'aria-label': 'Avancement des travaux' }, fill);
      const button = h('button', { class: 'item__buy', type: 'button' });
      const reason = h('span', { class: 'item__reason' });
      button.addEventListener('click', () => {
        const building = this.find(type);
        if (building) handlers.onUpgrade(building.id);
        else handlers.onBuild(type);
      });
      this.el.append(
        h(
          'article',
          { class: 'item' },
          h(
            'div',
            { class: 'item__info' },
            h('h3', { class: 'item__name' }, `${def.name} `, level),
            h('p', { class: 'item__desc', text: def.description }),
            effect,
            bar,
          ),
          h('div', { class: 'item__action' }, button, reason),
        ),
      );
      this.rows.push({ type, level, effect, bar, fill, button, reason });
    }
  }

  private find(type: BuildingType): BuildingState | undefined {
    return this.state?.buildings.find((b) => b.type === type);
  }

  render(state: GameState, now: number): void {
    this.state = state;
    for (const row of this.rows) {
      const def = BUILDINGS[row.type];
      const building = this.find(row.type);
      const works = building?.pending;
      setText(row.level, building && building.level > 0 ? `niv. ${building.level}` : '');
      row.bar.hidden = !works;
      if (works && building) {
        const pct = Math.round(getConstructionProgress(building, now) * 100);
        row.fill.style.width = `${pct}%`;
        row.bar.setAttribute('aria-valuenow', String(pct));
      }

      if (!building) {
        const check = canBuild(state, row.type);
        setText(row.effect, `${effectText(def, 1)} · travaux ${durationText(check.durationMs)}`);
        setText(row.button, `Aménager · ${formatMoney(check.cost)}`);
        row.button.disabled = !check.ok;
        setText(row.reason, check.ok ? '' : refusalText(check.reason, def.requiresHq));
        continue;
      }

      const check = canUpgrade(state, building.id);
      const maxed = !check.ok && check.reason === 'max_level';
      const shown = Math.max(building.level, 1);
      setText(row.effect, maxed || works ? effectText(def, shown) : `${effectText(def, shown)} → niv. ${building.level + 1} en ${durationText(check.durationMs)}`);
      setText(row.button, works ? 'Travaux' : maxed ? 'Niveau max' : `Améliorer · ${formatMoney(check.cost)}`);
      row.button.disabled = !check.ok;
      row.button.classList.toggle('item__buy--owned', maxed);
      let reason = '';
      if (works) reason = `Encore ${durationText(works.endsAt - now)}`;
      else if (!check.ok && !maxed) reason = refusalText(check.reason);
      setText(row.reason, reason);
    }
  }
}
