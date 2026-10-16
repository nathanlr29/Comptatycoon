import Phaser from 'phaser';
import { MAP_EVENTS, MapScene } from './game/MapScene';
import './styles/main.css';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#8fbf6a',
  scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  input: { mouse: { preventDefaultWheel: true } },
  scene: [MapScene],
});

// Safari iOS : empêche le zoom de la page par pincement (le canvas gère son propre zoom).
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
}

document.querySelector<HTMLButtonElement>('#recenter')?.addEventListener('click', () => {
  game.events.emit(MAP_EVENTS.recenter);
});
