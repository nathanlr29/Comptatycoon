/**
 * Safari iOS : la page elle-même ne doit jamais zoomer (seule la carte zoome, via la caméra).
 * Sinon un double-tap sur le HUD agrandit la page, et le canvas (touch-action: none)
 * empêche ensuite de la dézoomer au pincement : le joueur reste bloqué.
 */
export function preventPageZoom(): void {
  // Pincement sur l'interface HTML.
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
  }

  // Filet de sécurité : si la page a quand même zoomé (double-tap, champ de saisie),
  // on la ramène à l'échelle 1 en bornant brièvement le viewport.
  const viewport = window.visualViewport;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!viewport || !meta) return;
  const content = meta.content;
  let resetting = false;
  viewport.addEventListener('resize', () => {
    if (resetting || viewport.scale <= 1.01) return;
    resetting = true;
    meta.content = `${content}, maximum-scale=1`;
    window.setTimeout(() => {
      meta.content = content;
      resetting = false;
    }, 300);
  });
}
