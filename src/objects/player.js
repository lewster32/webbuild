import Position from '../geom/position';

const TURN_SPEED = 4;
const MOVE_SPEED = 6;

export default class Player extends Position {
  constructor(x, y, z, angle = 0) {
    super(x, y, z, angle);
    this.velocity = 0;
    this.angularVelocity = 0;

    this.turnDelta = 0;
    this.moveDelta = 0;

    this.currentSector;

    this.eyeHeight = 16384;
  }

  set(x = 0, y = 0, z = 0, angle = 0) {
    super.set(x, y, z, angle);
    return this;
  }

  update() {
    this.velocity += (MOVE_SPEED * this.moveDelta);
    this.angularVelocity += (TURN_SPEED * this.turnDelta);
  
    if (this.velocity !== 0) {
      this.velocity *= .9;
      this.project(this.velocity);
    }
    if (this.angularVelocity !== 0) {
      this.angularVelocity *= .8;
      this.angle += this.angularVelocity;
    }
    if (this.currentSector) {
      this.z = this.currentSector.floor.z;
    }
  }

  turn(delta) {
    this.turnDelta = delta;
  }

  move(delta) {
    this.moveDelta = delta;
  }

  clone() {
    return new Player(this.x, this.y, this.z, this.angle);
  }

  copyFrom(point) {
    this.x = point.x;
    this.y = point.y;
    this.z = point.z;
    this.angle = point.angle;
    return this;
  }
};