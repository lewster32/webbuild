import Point2 from '../geom/point2'

class FloorCeiling {
  constructor() {
    // This is an abstract class, so make sure
    // it's not instantiated
    if (new.target === FloorCeiling) {
      throw new TypeError("Cannot construct abstract instances directly");
    }
    this.z = 0;
    this.stat = {
      parallaxing: false,
      sloped: false,
      swapXY: false,
      doubleSmooshiness: false,
      xFlip: false,
      yFlip: false,
      alignTextureToFirstWall: false
    };

    this.picNum = 0;
    this.heightNum = 0;
    this.shade = 0;
    this.palette = 0;
    this.panning = new Point2();
  }
};

export class Floor extends FloorCeiling {
  constructor() {
    super();
  }
};

export class Ceiling extends FloorCeiling {
  constructor() {
    super();
  }
};