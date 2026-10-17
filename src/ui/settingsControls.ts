import { h } from './dom';

/** Contrôle de réglage : son élément et sa remise à jour depuis les réglages actuels. */
export interface Control {
  el: HTMLElement;
  sync: () => void;
}

let ids = 0;

function field(label: string, hint: string | undefined, control: HTMLElement, labelId: string): HTMLElement {
  return h(
    'div',
    { class: 'setting' },
    h('div', { class: 'setting__text' }, h('span', { class: 'setting__label', id: labelId, text: label }), ...(hint ? [h('span', { class: 'setting__hint', text: hint })] : [])),
    control,
  );
}

/** Choix exclusif en boutons côte à côte (cibles ≥ 44 px). */
export function segmented<T>(label: string, options: { value: T; label: string }[], get: () => T, set: (value: T) => void, hint?: string): Control {
  const labelId = `setting-${++ids}`;
  const group = h('div', { class: 'segmented', role: 'radiogroup', 'aria-labelledby': labelId });
  const buttons = options.map((option) => {
    const button = h('button', { class: 'segmented__option', type: 'button', role: 'radio', text: option.label });
    button.addEventListener('click', () => set(option.value));
    group.append(button);
    return { button, value: option.value };
  });
  const sync = () => {
    for (const { button, value } of buttons) button.setAttribute('aria-checked', String(value === get()));
  };
  sync();
  return { el: field(label, hint, group, labelId), sync };
}

/** Interrupteur marche / arrêt sur toute la largeur de la ligne. */
export function toggle(label: string, get: () => boolean, set: (value: boolean) => void, hint?: string): Control {
  const labelId = `setting-${++ids}`;
  const knob = h('span', { class: 'switch', 'aria-hidden': 'true' });
  const button = h('button', { class: 'setting setting--toggle', type: 'button', role: 'switch', 'aria-labelledby': labelId });
  button.append(
    h('span', { class: 'setting__text' }, h('span', { class: 'setting__label', id: labelId, text: label }), ...(hint ? [h('span', { class: 'setting__hint', text: hint })] : [])),
    knob,
  );
  button.addEventListener('click', () => set(!get()));
  const sync = () => button.setAttribute('aria-checked', String(get()));
  sync();
  return { el: button, sync };
}

/** Curseur de 0 à 100 %. `onCommit` est appelé au lâcher (pour un aperçu sonore). */
export function slider(label: string, get: () => number, set: (value: number) => void, enabled: () => boolean, onCommit?: () => void): Control {
  const labelId = `setting-${++ids}`;
  const input = h('input', { class: 'slider', type: 'range', min: 0, max: 100, step: 5, 'aria-labelledby': labelId });
  const value = h('span', { class: 'setting__value' });
  input.addEventListener('input', () => set(Number(input.value) / 100));
  input.addEventListener('change', () => onCommit?.());
  const sync = () => {
    const percent = Math.round(get() * 100);
    if (input.value !== String(percent)) input.value = String(percent);
    value.textContent = `${percent} %`;
    input.disabled = !enabled();
  };
  sync();
  return { el: field(label, undefined, h('div', { class: 'slider-row' }, input, value), labelId), sync };
}
