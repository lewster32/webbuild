import Point2 from '../geom/point2';

export default class Wall extends Point2 {
  constructor(x = 0, y = 0) {
    super(x, y);
    this.point2;
    this.nextWall = -1;
    this.nextSector = -1;
    this.stat = {
      blockClipMove: false,
      bottomsInvisibleSwapped: false,
      alignPictureBottom: false,
      xFlip: false,
      mask: false,
      oneWay: false,
      blockHitScan: false,
      translucent: false,
      yFlip: false,
      translucentReverse: false
    };
    this.picNum = 0;
    this.overPicNum = 0;
    this.shade = 0;
    this.palette = 0;
    this.repeat = new Point2();
    this.panning = new Point2();
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
        type: "Point2",
        subType: "Int32",
        value: this.clone()
      },
      { name: "Picnum", type: "Int16", value: this.picNum },
      { name: "Shade", type: "Int8", value: this.shade },
      { name: "Palette", type: "Uint8", value: this.palette },
      {
        name: "Repeat",
        type: "Point2",
        subType: "Uint8",
        value: this.repeat
      },
      {
        name: "Panning",
        type: "Point2",
        subType: "Uint8",
        value: this.panning
      },
      { name: "Lotag", type: "Int16", value: this.loTag},
      { name: "Hitag", type: "Int16", value: this.hiTag },
      { name: "Extra", type: "Int16", value: this.extra }
    ];

    return rows;
  }
};