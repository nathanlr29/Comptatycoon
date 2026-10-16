import type { GameState } from '../core/state';
import { h, setText } from './dom';

/** Ce que l'onglet affiche d'un pôle. Tout est calculé par core/ (voir `departmentViews`). */
export interface DepartmentView {
  id: string;
  name: string;
  description: string;
  /** Effets en clair, une ligne chacun. */
  effects: string[];
  owned: boolean;
  /** Texte du bouton (« Ouvrir · 20 000 € », « Ouvert », « Racheter · … »). */
  actionLabel: string;
  /** Conditions d'achat, remplies ou non (locaux, réputation, fonds). */
  requirements: { label: string; met: boolean }[];
  canBuy: boolean;
  /** Couleur d'identité du pôle (CSS). */
  color: string;
}

interface Row {
  card: HTMLElement;
  button: HTMLButtonElement;
  reqs: HTMLUListElement;
}

/** Onglet « Développement » : les pôles du cabinet, leurs effets et ce qui manque pour les ouvrir. */
export class DevelopmentPanel {
  readonly el = h('div', { class: 'list' });
  private readonly rows = new Map<string, Row>();

  constructor(
    private readonly views: (state: GameState) => DepartmentView[],
    private readonly onBuy: (id: string) => void,
  ) {
    this.el.append(h('p', { class: 'list__summary', text: 'Ouvrez de nouveaux pôles pour proposer plus de missions à vos clients.' }));
  }

  render(state: GameState): void {
    for (const view of this.views(state)) {
      const row = this.rows.get(view.id) ?? this.create(view);
      row.card.classList.toggle('dept--owned', view.owned);
      setText(row.button, view.actionLabel);
      row.button.disabled = view.owned || !view.canBuy;
      row.button.classList.toggle('item__buy--owned', view.owned);
      row.reqs.hidden = view.owned || view.requirements.every((r) => r.met);
      view.requirements.forEach((req, i) => {
        const li = row.reqs.children[i] as HTMLElement | undefined;
        if (!li) return;
        li.classList.toggle('dept__req--met', req.met);
        setText(li, req.label);
      });
    }
  }

  private create(view: DepartmentView): Row {
    const button = h('button', { class: 'item__buy dept__buy', type: 'button' });
    button.addEventListener('click', () => this.onBuy(view.id));
    const reqs = h('ul', { class: 'dept__reqs', 'aria-label': 'Conditions' }, ...view.requirements.map(() => h('li', { class: 'dept__req' })));
    const card = h(
      'article',
      { class: 'dept' },
      h('h3', { class: 'item__name', text: view.name }),
      h('p', { class: 'item__desc', text: view.description }),
      h('ul', { class: 'dept__effects' }, ...view.effects.map((e) => h('li', { text: e }))),
      reqs,
      button,
    );
    card.style.setProperty('--dept', view.color);
    this.el.append(card);
    const row = { card, button, reqs };
    this.rows.set(view.id, row);
    return row;
  }
}
