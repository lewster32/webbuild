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
    this.x -= point.x;
    this.y -= point.y;
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

  clone() {
    return new Point2(this.x, this.y);
  }

  static subtract(p1, p2) {
    return p1.clone().subtract(p2);
  }

  static distance(p1, p2) {
    return Math.hypot(p2.x - p1.x, p2.y - p1.y);
  }

  static distanceSquared(p1, p2) {
    return Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2);
  }

/**
 * Finds the closest point on a line between startPoint and endPoint
 * Based on this fiddle: https://jsfiddle.net/soulwire/UA6H5/
 * 
 * @param {Point2} startPoint the point on the line to start from
 * @param {Point2} endPoint the point on the line to end at
 * @param {Point2} point the point to get the closest point on the line from
 * 
 * @returns {Object} an object containing the point and the dot product (to determine which side of the line the point was on)
 */
  static closestPointOnLine(startPoint, endPoint, point) {
    const startToEnd = Point2.subtract(endPoint, startPoint); // new Point2(endPoint.x - startPoint.x, endPoint.y - startPoint.y);
    const startToPoint = Point2.subtract(point, startPoint); // new Point2(point.x - startPoint.x, point.y - startPoint.y);

    const len = startToEnd.x * startToEnd.x + startToEnd.y * startToEnd.y;
    let dot = startToPoint.x * startToEnd.x + startToPoint.y * startToEnd.y;

    const t = Math.min(1, Math.max(0, dot / len));

    dot = (endPoint.x - startPoint.x) * (point.y - startPoint.y) - (endPoint.y - startPoint.y) * (point.x - startPoint.x);

    const pc = new Point2(startPoint.x + startToEnd.x * t, startPoint.y + startToEnd.y * t);

    return {
      point: pc,
      dot: dot
    }
  }
};
