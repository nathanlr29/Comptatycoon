/** Petites icônes SVG en ligne (trait = couleur du texte). */
const svg = (path: string) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" class="icon">${path}</svg>`;

export const ICONS = {
  money: svg('<circle cx="12" cy="12" r="8"/><path d="M15 9.5a3.5 3.5 0 1 0 0 5M7.5 11h5M7.5 13h5"/>'),
  rate: svg('<path d="M4 17l5-5 4 4 7-8"/><path d="M15 8h5v5"/>'),
  star: svg('<path d="M12 4l2.4 5 5.6.6-4.2 3.8 1.2 5.6L12 16.3 7 19l1.2-5.6L4 9.6 9.6 9z"/>'),
  people: svg('<circle cx="9" cy="9" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="10" r="2.5"/><path d="M15.5 14.5a4.5 4.5 0 0 1 5 4.5"/>'),
  hire: svg('<circle cx="10" cy="8" r="3.5"/><path d="M3.5 20a6.5 6.5 0 0 1 13 0M19 8v6M16 11h6"/>'),
  upgrade: svg('<path d="M12 19V6M6 11l6-6 6 6"/><path d="M5 20h14"/>'),
  expand: svg('<path d="M4 20V9l6-4 6 4v11"/><path d="M16 12h4v8M2 20h20M8 20v-5h4v5"/>'),
} as const;
