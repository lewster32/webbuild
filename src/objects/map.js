import Position from '../geom/position';

export default class Map {
  constructor(version) {
    if (version !== 7) {
      throw new Error(
        "Currently only maps from the released version of Duke Nukem 3D are supported (map version 7)"
      );
    }
    this.version = version;
    this.startPosition = new Position();

    this.sectors = []; // should be length<=1024
    this.walls = []; // should be length<=8192
    this.sprites = []; // should be length<=4096

    this.editorMeta = {}
  }
};