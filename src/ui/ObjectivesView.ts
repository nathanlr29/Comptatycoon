import { formatMoney, formatRate } from '../core/format';
import { getObjectiveProgress, getVisibleObjectives } from '../core/objectives';
import type { GameState } from '../core/state';
import { VISIBLE_OBJECTIVES, type ObjectiveDefinition } from '../data/objectives';
import { OBJECTIVE_TEXTS } from '../data/texts';
import { h, setText } from './dom';

interface Card {
  el: HTMLElement;
  title: HTMLElement;
  progress: HTMLElement;
  bar: HTMLElement;
  reward: HTMLElement;
  button: HTMLButtonElement;
  id: string;
}

function rewardText(def: ObjectiveDefinition): string {
  const parts: string[] = [];
  if (def.reward.money) parts.push(formatMoney(def.reward.money));
  if (def.reward.reputation) parts.push(OBJECTIVE_TEXTS.reputation(def.reward.reputation));
  return OBJECTIVE_TEXTS.reward(parts);
}

function progressText(def: ObjectiveDefinition, current: number, target: number): string {
  switch (def.condition.kind) {
    case 'building':
      return '';
    case 'income':
      return `${formatRate(current)} / ${formatRate(target)}`;
    case 'totalEarned':
      return `${formatMoney(current)} / ${formatMoney(target)}`;
    default:
      return `${Math.floor(current)} / ${target}`;
  }
}

/** Un ou deux objectifs en cours, au-dessus de la barre d'action, avec la récompense à réclamer. */
export class ObjectivesView {
  readonly el = h('section', { class: 'objectives', 'aria-label': 'Objectifs' });
  private readonly cards: Card[] = [];

  constructor(onClaim: (id: string) => void) {
    for (let i = 0; i < VISIBLE_OBJECTIVES; i++) {
      const title = h('strong', { class: 'objective__title' });
      const progress = h('span', { class: 'objective__progress' });
      const bar = h('span', { class: 'objective__bar-fill' });
      const reward = h('span', { class: 'objective__reward' });
      const button = h('button', { class: 'objective__claim', type: 'button', text: OBJECTIVE_TEXTS.claim });
      const card: Card = { el: h('article', { class: 'objective', hidden: true }), title, progress, bar, reward, button, id: '' };
      button.addEventListener('click', () => onClaim(card.id));
      card.el.append(
        h('div', { class: 'objective__info' }, title, h('span', { class: 'objective__bar' }, bar), h('div', { class: 'objective__meta' }, progress, reward)),
        button,
      );
      this.el.append(card.el);
      this.cards.push(card);
    }
  }

  render(state: GameState, now: number): void {
    const visible = getVisibleObjectives(state);
    this.cards.forEach((card, i) => {
      const def = visible[i];
      card.el.hidden = !def;
      if (!def) return;
      const p = getObjectiveProgress(state, def, now);
      card.id = def.id;
      setText(card.title, def.title);
      setText(card.progress, progressText(def, p.current, p.target));
      setText(card.reward, rewardText(def));
      card.bar.style.width = `${Math.round((p.current / p.target) * 100)}%`;
      card.button.hidden = !p.done;
      card.el.classList.toggle('objective--done', p.done);
    });
  }
}
