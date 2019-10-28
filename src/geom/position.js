import Point3 from '../geom/point3';

// This mainly adds the angle property to allow
export default class Position extends Point3 {
// us to use it for sprite positions etc.
  constructor(x, y, z, angle = 0) {
    super(x, y, z);
    // Angles in the Build engine range from 0-2047
    // with 0 = North, 513 = East etc...
    this.angle = angle;
  }

  set(x = 0, y = 0, z = 0, angle = 0) {
    super.set(x, y, z);
    this.angle = angle;
  }

  // Some helper accessors so we can get more
  // familiar units for our angles
  get angleDegrees() {
    return this.angle / 5.7;
  }

  set angleDegrees(val) {
    this.angle = val * 5.7;
    return this.angleDegrees;
  }

  get angleRadians() {
    return (this.angleDegrees * Math.PI) / 180;
  }

  set angleRadians(val) {
    this.angleDegrees = (val / Math.PI) * 180;
    return this.angleRadians;
  }

  static toDegrees(angle) {
    return angle / 5.7;
  }

  static toRadians(angle) {
    return (Position.toDegrees(angle) * Math.PI) / 180
  }
};