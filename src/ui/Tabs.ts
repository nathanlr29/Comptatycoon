import type { GameState } from '../core/state';
import { h } from './dom';

type View = { render: (state: GameState, now: number) => void; el: HTMLElement };

/** Plusieurs vues dans un même panneau, avec des onglets en haut. Seule la vue visible est rendue. */
export class Tabs {
  readonly el = h('div');
  private readonly content = h('div', { role: 'tabpanel' });
  private readonly buttons: HTMLButtonElement[] = [];
  private current = 0;
  private last: { state: GameState; now: number } | null = null;

  constructor(private readonly tabs: { label: string; view: View }[]) {
    const bar = h('div', { class: 'tabs', role: 'tablist' });
    tabs.forEach((tab, i) => {
      const button = h('button', { class: 'tabs__tab', type: 'button', role: 'tab', text: tab.label });
      button.addEventListener('click', () => this.select(i));
      this.buttons.push(button);
      bar.append(button);
    });
    this.el.append(bar, this.content);
    this.select(0);
  }

  select(index: number): void {
    this.current = index;
    this.buttons.forEach((b, i) => b.setAttribute('aria-selected', String(i === index)));
    const tab = this.tabs[index];
    if (!tab) return;
    this.content.replaceChildren(tab.view.el);
    if (this.last) tab.view.render(this.last.state, this.last.now);
  }

  render(state: GameState, now: number): void {
    this.last = { state, now };
    this.tabs[this.current]?.view.render(state, now);
  }
}
