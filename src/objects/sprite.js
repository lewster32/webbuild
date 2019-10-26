import Point2 from '../geom/point2';
import Point3 from '../geom/point3';
import Position from '../geom/position';

export const FACE = 0;
export const WALL = 1;
export const FLOOR = 2;

export default class Sprite extends Position {
  constructor(x = 0, y = 0, z = 0, angle = 0) {
    super(x, y, z, angle);
    this.stat = {
      blockClipMove: false,
      translucent: false,
      xFlip: false,
      yFlip: false,
      orientation: FACE,
      oneSided: false,
      realCentered: false,
      blockHitScan: false,
      translucentReverse: false,
      invisible: false
    };
    this.picNum = 0;
    this.shade = 0;
    this.palette = 0;
    this.clipDistance = 0;
    this.repeat = new Point2();
    this.offset = new Point2();
    this.currentSectorIndex = 0;
    this.currentStatus = 0;
    this.owner = 0;
    this.velocity = new Point3();
    this.loTag = 0;
    this.hiTag = 0;
    this.extra = -1;
  }
};