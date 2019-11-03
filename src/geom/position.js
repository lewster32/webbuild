import Point3 from '../geom/point3';


// This mainly adds the angle property to allow
// us to use it for sprite positions etc.
export default class Position extends Point3 {
  constructor(x, y, z, angle = 0) {
    super(x, y, z);
    // Angles in the Build engine range from 0-2047
    // with 0 = North, 513 = East etc...
    this._angle = angle;
  }

  set(x = 0, y = 0, z = 0, angle = 0) {
    super.set(x, y, z);
    this.angle = angle;
    return this;
  }

  clone() {
    return new Position(this.x, this.y, this.z, this.angle);
  }

  copyFrom(point) {
    this.x = point.x;
    this.y = point.y;
    this.z = point.z;
    this.angle = point.angle;
    return this;
  }

  project(magnitude) {
    this.x += magnitude * Math.cos(this.angleRadians);
    this.y += magnitude * Math.sin(this.angleRadians);
    return this;
  }

  get angle() {
    return this._angle;
  }

  set angle(val) {
    this._angle = ((val % 2047) + 2047) % 2047;
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