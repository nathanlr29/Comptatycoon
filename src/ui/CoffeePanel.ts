import { canTakeCoffeeBreak, canUpgradeCoffeeMachine, getCoffeeBreakEnd, getCoffeeMachine } from '../core/coffee';
import { formatMoney } from '../core/format';
import type { GameState } from '../core/state';
import { getCoffeeMachineDef, MAX_COFFEE_LEVEL, type CoffeeMachine } from '../data/coffee';
import { COFFEE_TEXTS, durationText, multiplierText, refusalText } from '../data/texts';
import { h, setText } from './dom';

export interface CoffeeHandlers {
  onBreak: () => void;
  onUpgrade: () => void;
}

function machineEffect(m: CoffeeMachine): string {
  return `${COFFEE_TEXTS.effect(multiplierText(m.multiplier), durationText(m.durationMs))} · ${COFFEE_TEXTS.cooldown(durationText(m.cooldownMs))}`;
}

/** Panneau « Pause café » : lancer la pause, voir le délai, changer de machine. */
export class CoffeePanel {
  readonly el = h('div', { class: 'list coffee' });
  private readonly status = h('p', { class: 'coffee__status', role: 'status' });
  private readonly start = h('button', { class: 'coffee__start', type: 'button', text: COFFEE_TEXTS.start });
  private readonly currentName = h('h3', { class: 'item__name' });
  private readonly currentMeta = h('span', { class: 'item__meta' });
  private readonly nextName = h('h3', { class: 'item__name' });
  private readonly nextDesc = h('p', { class: 'item__desc' });
  private readonly nextMeta = h('span', { class: 'item__meta' });
  private readonly buy = h('button', { class: 'item__buy', type: 'button' });
  private readonly reason = h('span', { class: 'item__reason' });
  private readonly next = h(
    'article',
    { class: 'item' },
    h('div', { class: 'item__info' }, h('span', { class: 'coffee__label', text: COFFEE_TEXTS.next }), this.nextName, this.nextDesc, this.nextMeta),
    h('div', { class: 'item__action' }, this.buy, this.reason),
  );
  private readonly maxed = h('p', { class: 'list__summary', text: COFFEE_TEXTS.maxed });

  constructor(handlers: CoffeeHandlers) {
    this.start.addEventListener('click', handlers.onBreak);
    this.buy.addEventListener('click', handlers.onUpgrade);
    this.el.append(
      h('p', { class: 'list__summary', text: COFFEE_TEXTS.intro }),
      this.start,
      this.status,
      h('h3', { class: 'coffee__heading', text: COFFEE_TEXTS.machineHeading }),
      h(
        'article',
        { class: 'item' },
        h('div', { class: 'item__info' }, h('span', { class: 'coffee__label', text: COFFEE_TEXTS.current }), this.currentName, this.currentMeta),
      ),
      this.next,
      this.maxed,
    );
  }

  render(state: GameState, now: number): void {
    const end = getCoffeeBreakEnd(state, now);
    const check = canTakeCoffeeBreak(state, now);
    this.start.disabled = !check.ok;
    let status = '';
    if (end !== null) status = COFFEE_TEXTS.active(Math.ceil((end - now) / 1000));
    else if (!check.ok && check.readyAt !== undefined) status = COFFEE_TEXTS.waiting(durationText(check.readyAt - now));
    setText(this.status, status);

    const machine = getCoffeeMachine(state);
    setText(this.currentName, machine.name);
    setText(this.currentMeta, machineEffect(machine));
    const isMax = machine.level >= MAX_COFFEE_LEVEL;
    this.next.hidden = isMax;
    this.maxed.hidden = !isMax;
    if (isMax) return;
    const next = getCoffeeMachineDef(machine.level + 1);
    setText(this.nextName, next.name);
    setText(this.nextDesc, next.description);
    setText(this.nextMeta, machineEffect(next));
    const upgrade = canUpgradeCoffeeMachine(state);
    setText(this.buy, formatMoney(next.cost));
    this.buy.disabled = !upgrade.ok;
    setText(this.reason, upgrade.ok ? '' : refusalText(upgrade.reason));
  }
}

/** Bandeau de la pause café avec compte à rebours (sous celui de la Période fiscale). */
export class CoffeeBanner {
  readonly el = h('div', { class: 'fiscal-banner coffee-banner', role: 'status', hidden: true });

  render(state: GameState, now: number): void {
    const end = getCoffeeBreakEnd(state, now);
    this.el.hidden = end === null;
    if (end !== null) setText(this.el, COFFEE_TEXTS.banner(multiplierText(getCoffeeMachine(state).multiplier), Math.ceil((end - now) / 1000)));
  }
}
