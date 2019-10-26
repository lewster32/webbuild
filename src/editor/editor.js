import $ from "jquery";

import Point2 from "../geom/point2";

const UPDATE_RATE = 100; // editor update rate in ms (renderer still runs at requestAnimationFrame fps)

export default class Editor {
  constructor(renderer) {
    this.renderer = renderer;

    this.closest;
    this.currentSector;

    this.dirty = true;

    $(this.renderer.canvas).on("mousedown", e => {
      this.handleMouseDown(e);
    });
    $(this.renderer.canvas).on("mouseup", e => {
      this.handleMouseUp(e);
    });
    $(this.renderer.canvas).on("mousemove", e => {
      this.handleMouseMove(e);
    });
    $(this.renderer.canvas).on("mousewheel", e => {
      this.handleMouseWheel(e);
    });

    setTimeout(this.update.bind(this), UPDATE_RATE);
  }

  handleMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();

    this.renderer.interaction.panStart.set(e.clientX, e.clientY);
    this.renderer.interaction.isDown = true;

    this.dirty = true;
  }

  handleMouseUp(e) {
    e.preventDefault();
    e.stopPropagation();

    this.renderer.interaction.panStart.set(0, 0);
    this.renderer.interaction.isDown = false;

    this.dirty = true;
  }

  handleMouseMove(e) {
    this.renderer.interaction.mouseWorldPos = this.renderer.screenToWorld(
      e.offsetX,
      e.offsetY
    );
    this.renderer.interaction.mouseScreenPos.x = e.offsetX;
    this.renderer.interaction.mouseScreenPos.y = e.offsetY;

    this.dirty = true;

    if (!this.renderer.interaction.isDown) {
      return;
    }

    this.renderer.interaction.panOffset.x -=
      (e.clientX - this.renderer.interaction.panStart.x) / this.renderer.zoom;
    this.renderer.interaction.panOffset.y -=
      (e.clientY - this.renderer.interaction.panStart.y) / this.renderer.zoom;
    this.renderer.interaction.panStart.set(e.clientX, e.clientY);
  }

  handleMouseWheel(e) {
    e.preventDefault();
    e.stopPropagation();

    this.dirty = true;

    this.renderer.changeZoom(e.originalEvent.deltaY > 0 ? 1 : -1, e, () => {
      this.dirty = true;
    });
  }

  setMap(map) {
    this.map = map;
    this.renderer.setMap(this.map);
    this.updateMetaData();
    this.renderer.updateMetaData();
    this.dirty = true;
  }

  findClosestObject(pos) {
    const closestWall = this.findClosestWall(pos);
    const closestSprite = this.findClosestSprite(pos);

    this.findCurrentSector(pos);

    let closest;
    if (closestWall && closestSprite) {
      const closestWallDistance = Point2.distanceSquared(
        Point2.closestPointOnLine(
          closestWall,
          this.map.walls[closestWall.point2],
          pos
        ).point,
        pos
      );

      const spritePos = closestSprite.clone();
      const closestSpriteDistance =
        Point2.distanceSquared(spritePos, pos) -
        this.renderer.interaction.pointDistanceRadius;
      closest =
        closestWallDistance < closestSpriteDistance
          ? closestWall
          : closestSprite;
    } else if (closestSprite) {
      closest = closestSprite;
    } else if (closestWall) {
      closest = closestWall;
    }
    if (closest) {
      closest.rendererMeta.highlighted = true;
    }
    return closest;
  }

  findClosestWall(pos) {
    let distance = Number.POSITIVE_INFINITY;
    let closest;
    this.map.walls.forEach(wall => {
      wall.rendererMeta.highlighted = false;
      if (wall.rendererMeta.clipped) {
        return;
      }
      const wallPos = Point2.closestPointOnLine(
        wall,
        this.map.walls[wall.point2],
        pos
      );

      if (wallPos.dot < 1) {
        return;
      }

      const wallDistance = Point2.distanceSquared(wallPos.point, pos);
      if (wallDistance < distance) {
        distance = wallDistance;
        closest = wall;
      }
    });
    return closest;
  }

  findClosestSprite(pos) {
    if (this.zoom <= this.spritesZoomThreshold) {
      return;
    }
    let distance = Number.POSITIVE_INFINITY;
    let closest;
    this.map.sprites.forEach(sprite => {
      sprite.rendererMeta.highlighted = false;
      if (sprite.rendererMeta.clipped) {
        return;
      }
      const spritePos = sprite.clone();

      const spriteDistance =
        Point2.distanceSquared(spritePos, pos) -
        this.renderer.interaction.pointDistanceRadius;
      if (spriteDistance < distance) {
        distance = spriteDistance;
        closest = sprite;
      }
    });
    return closest;
  }

  findCurrentSector(pos) {
    return this.findClosestWall(pos).editorMeta.sector;
  }

  updateMetaData() {
    this.map.walls.forEach((wall, index) => {
      wall.editorMeta = {};
      wall.editorMeta.index = index;
      const wall2 = this.map.walls[wall.point2];
      if (wall2) {
        const wall2Pos = wall2.clone();
        const centroid = wall.clone().centroid(wall2Pos);

        wall.editorMeta.centroid = centroid;
      }
    });

    // Associate sectors with walls and vice versa
    this.map.sectors.forEach((sector, index) => {
      sector.editorMeta = {};
      sector.editorMeta.index = index;
      sector.editorMeta.walls = this.map.walls.slice(
        sector.firstWallIndex,
        sector.firstWallIndex + sector.numWalls
      );
      sector.editorMeta.sprites = [];

      let lastWallIndex = Number.POSITIVE_INFINITY;
      let loop = 1;
      sector.editorMeta.walls.forEach(wall => {
        wall.editorMeta.loop = loop;
        wall.editorMeta.sector = sector;
        if (wall.point2 < lastWallIndex) {
          loop++;
        }
        lastWallIndex = wall.point2;
      });

      sector.editorMeta.numLoops = loop;
    });

    this.map.sprites.forEach((sprite, index) => {
      sprite.editorMeta = {};
      sprite.editorMeta.index = index;
      sprite.editorMeta.sector = this.map.sectors[sprite.currentSectorIndex];
      sprite.editorMeta.sector.editorMeta.sprites.push(sprite);
    });
  }

  update() {
    if (this.dirty) {
      this.dirty = false;
      if (this.map) {
        const closest = this.findClosestObject(
          this.renderer.interaction.mouseWorldPos
        );
        const currentSector = this.findCurrentSector(
          this.renderer.interaction.mouseWorldPos
        );
        if (this.closest !== closest) {
          this.closest = this.renderer.closest = closest;
          if (this.debug) {
            console.log(this.closest);
          }
        }
        if (this.currentSector !== currentSector) {
          this.currentSector = this.renderer.currentSector = currentSector;
          if (this.debug) {
            console.log(this.currentSector);
          }
        }
      }
    }
    setTimeout(this.update.bind(this), UPDATE_RATE);
  }
}
