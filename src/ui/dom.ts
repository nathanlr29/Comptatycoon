type Attrs = Record<string, string | number | boolean | undefined>;

/** Crée un élément avec attributs et enfants. `class` et `text` sont des raccourcis. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    if (key === 'class') el.className = String(value);
    else if (key === 'text') el.textContent = String(value);
    else el.setAttribute(key, value === true ? '' : String(value));
  }
  el.append(...children);
  return el;
}

/** N'écrit dans le DOM que si le texte change (évite les mises à jour inutiles). */
export function setText(el: HTMLElement, value: string): void {
  if (el.textContent !== value) el.textContent = value;
}

/** Animations réduites : réglage du joueur (Paramètres) ou de l'appareil. */
export { reducedMotion as prefersReducedMotion } from '../settings';
