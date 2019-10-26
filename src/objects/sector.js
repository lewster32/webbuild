import { Floor, Ceiling } from './floorceiling'

export default class Sector {
  constructor() {
    this.firstWallIndex;
    this.numWalls = 0;
    this.ceiling = new Ceiling();
    this.floor = new Floor();
    this.visibility = 0;
    this.loTag = 0;
    this.hiTag = 0;
    this.extra = -1;

    this.editorMeta = {};
    this.rendererMeta = {};
  }
};