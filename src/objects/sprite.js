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

    this.editorMeta = {};
    this.rendererMeta = {};
  }

  getProps() {
    const rows = [
      {
        name: "Position",
        key: "position",
        type: "Point3",
        subType: "Int32",
        value: this.clone()
      },
      { name: "Picnum", key: "picNum", type: "Int16", value: this.picNum },
      { name: "Shade", key: "shade", type: "Int8", value: this.shade },
      { name: "Palette", key: "palette", type: "Uint8", value: this.palette },
      { name: "Clip Distance", key: "clipDistance", type: "Uint8", value: this.clipDistance },
      {
        name: "Repeat",
        key: "repeat",
        type: "Point2",
        subType: "Uint8",
        value: this.repeat
      },
      {
        name: "Offset",
        key: "offset",
        type: "Point2",
        subType: "Uint8",
        value: this.offset
      },
      { name: "Angle", key: "angle", type: "Angle", subType: "Int16", value: this.angle },
      { name: "Lotag", key: "loTag", type: "Int16", value: this.loTag },
      { name: "Hitag", key: "hiTag", type: "Int16", value: this.hiTag },
      { name: "Extra", key: "extra", type: "Int16", value: this.extra }
    ];

    return rows;
  }
};