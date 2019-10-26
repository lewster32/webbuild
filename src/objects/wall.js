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
};