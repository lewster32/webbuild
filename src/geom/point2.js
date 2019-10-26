export default class Point2 {
  constructor(x = 0, y = 0) {
    this.set(x, y);
  }

  set(x = 0, y = 0) {
    this.x = x;
    this.y = y;
    return this;
  }

  translate(deltaX = 0, deltaY = 0) {
    this.x += deltaX;
    this.y += deltaY;
    return this;
  }

  add(point) {
    this.x += point.x;
    this.y += point.y;
    return this;
  }

  subtract(point) {
    this.x += point.x;
    this.y += point.y;
    return this;
  }

  centroid(point) {
    return new Point2((this.x + point.x) * 0.5, (this.y + point.y) * 0.5);
  }

  round() {
    this.x = Math.round(this.x);
    this.y = Math.round(this.y);
    return this;
  }

  distance(point) {
    return Point2.distance(this, point);
  }

  static distance(p1, p2) {
    return Math.hypot(p2.x - p1.x, p2.y - p1.y);
  }

  static distanceSquared(p1, p2) {
    return Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2);
  }
};
