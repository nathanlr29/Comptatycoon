import Phaser from 'phaser';

/** Scène de la carte. Pour l'instant un simple sol : la carte arrive à l'étape 3. */
export class MapScene extends Phaser.Scene {
  constructor() {
    super('map');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#8fbf6a');
  }
}
