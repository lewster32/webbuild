export default class Point3 {
  constructor(x = 0, y = 0, z = 0) {
    this.set(x, y, z);
  }

  set(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  translate(deltaX = 0, deltaY = 0, deltaZ = 0) {
    this.x += deltaX;
    this.y += deltaY;
    this.z += deltaZ;
    return this;
  }

  clone() {
    return new Point3(this.x, this.y, this.z);
  }

  copyFrom(point) {
    this.x = point.x;
    this.y = point.y;
    this.z = point.z;
    return this;
  }
};
