import $ from "jquery";
import * as dat from "dat.gui";

import Point3 from "../geom/point3";
import Point2 from "../geom/point2";

const cross = function(x1, y1, x2, y2) {
  return x1 * y2 - y1 * x2;
}

const intersect = function(x1, y1, x2, y2, x3, y3, x4, y4) {
  let x = cross(x1, y1, x2, y2);
  let y = cross(x3, y3, x4, y4);
  const det = cross(x1 - x2, y1 - y2, x3 - x4, y3 - y4);
  x = cross(x, x1-x2, y, x3-x4) / det;
  y = cross(x, y1-y2, y, y3-y4) / det;

  return new Point2(x, y);
}

export default class GameRenderer {
  constructor(canvas) {
    this.debug = true;

    this.canvas = canvas;

    this.ctx = canvas.getContext("2d", { alpha: false });
    this.map = null;

    this.width = $(canvas).width();
    this.height = $(canvas).height();

    this.fov = new Point2(
      1 * 0.73 * this.height / this.width,
      .2
    );

    this.dirty = true;

    this.fov = 255;

    // I don't know what these do but they're involved in the intersection
    // routine. I've tuned the values below which seem to give a good,
    // minimally glitchy output to the 3D window
    this.smallNum = 0.0022;
    this.mediumNum = 1;
    this.bigNum = 255;

    if (this.debug) {
      const gui = new dat.GUI();
      gui.add(this, 'fov', 1, 512);
      gui.add(this, 'smallNum', 0, 1, .00001);
      gui.add(this, 'mediumNum', 1, 64);
      gui.add(this, 'bigNum', 1, 255);
    }

    requestAnimationFrame(this.render.bind(this));
  }

  setMap(map) {
    this.map = map;
  }

  updateGameBuffer() {
    if (this.map.startSectorIndex < 0) {
      return;
    }

    const sector = this.map.sectors[this.map.startSectorIndex];

    const player = this.map.editorMeta.player;
    const playerAngleCos = Math.cos(player.angleRadians);
    const playerAngleSin = Math.sin(player.angleRadians);

    this.ctx.strokeStyle = "#fff";
    this.ctx.beginPath();
    this.map.walls.forEach(wall => {
      // Translate
      const v1 = wall.clone().subtract(player);
      const v2 = wall.editorMeta.wall2.clone().subtract(player);

      // Rotate
      const t1 = new Point3(
        v1.x * playerAngleSin - v1.y * playerAngleCos,
        0,
        v1.x * playerAngleCos + v1.y * playerAngleSin
      );
      const t2 = new Point3(
        v2.x * playerAngleSin - v2.y * playerAngleCos,
        0,
        v2.x * playerAngleCos + v2.y * playerAngleSin
      );

      // If the wall is behind the player, don't render it
      if (t1.z <= 0 && t2.z <= 0) {
        return;
      }
      // If only part of the wall is behind the player, clip the edge to the player's view frustrum
      if (t1.z <= 0 || t2.z <= 0) {
        const i1 = intersect(t1.x, t1.z, t2.x, t2.z, -this.smallNum, this.smallNum, -this.bigNum, this.mediumNum);
        const i2 = intersect(t1.x, t1.z, t2.x, t2.z, this.smallNum, this.smallNum, this.bigNum, this.mediumNum);

        if (t1.z <= 0) { 
          if (i1.y > 0) {
            t1.x = i1.x;
            t1.z = i1.y;
          }
          else {
            t1.x = i2.x;
            t1.z = i2.y;
          }
        }

        if (t2.z <= 0) { 
          if (i1.y > 0) {
            t2.x = i1.x;
            t2.z = i1.y;
          }
          else {
            t2.x = i2.x;
            t2.z = i2.y;
          }
        }
      }

      // Perspective
      // From buildinf.txt: "Note: Z coordinates are all shifted up 4"
      const wallHeight = (wall.editorMeta.sector.ceiling.z - player.z + player.eyeHeight) << 3;
      const floorHeight = (wall.editorMeta.sector.floor.z - player.z + player.eyeHeight) << 3;

      const x1 = -t1.x * this.fov / t1.z; 
      const y1a = wallHeight / t1.z;
      const y1b = floorHeight / t1.z;

      const x2 = -t2.x * this.fov / t2.z; 
      const y2a = wallHeight / t2.z;
      const y2b = floorHeight / t2.z;

      const halfWidth = this.width * .5;
      const halfHeight = this.height * .5;

      this.ctx.moveTo(halfWidth + x1, halfHeight + y1b);
      this.ctx.lineTo(halfWidth + x2, halfHeight + y2b);
      this.ctx.lineTo(halfWidth + x2, halfHeight + y2a);
      this.ctx.lineTo(halfWidth + x1, halfHeight + y1a);
      this.ctx.lineTo(halfWidth + x1, halfHeight + y1b);
    });
    this.ctx.stroke();
  }

  updateMetaData() {
    // noop
  }

  findVisibleBunches(sector) {
    const bunches = [];
    const sectorsToVisit = new Set();
    sectorsToVisit.add(sector);

    let numSectorsLeftToScan = this.map.sectors.length;

    do {
      const currentSector = sectorsToVisit.pop();

      currentSector.rendererMeta.visited = true;

      currentSector.editorMeta.walls.forEach(wall => {
        const p1 = wall.clone();
        const p2 = wall.editorMeta.wall2.clone();

        if (wall.nextSector >= 0 && !wall.stat.oneWay && !this.map.sectors[wall.nextSector].rendererMeta.visited) {
          const cross = p1.x * p2.y - p2.x * p1.y;

          // to finish...
        }
      });

      numSectorsLeftToScan--;
    } while (numSectorsLeftToScan > 0 && sectorsToVisit.length);
  }

  render() {
    if (this.dirty && this.map) {
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.updateGameBuffer();
    }

    requestAnimationFrame(this.render.bind(this));
  }
}