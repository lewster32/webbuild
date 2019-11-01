import $ from "jquery";

import Point2 from "../geom/point2";

import Wall from "../objects/wall";
import Sprite from "../objects/sprite";

const UPDATE_RATE = 100; // editor update rate in ms (renderer still runs at requestAnimationFrame fps)

export const MODE_PAN = 0;
export const MODE_SELECT = 1;
export const MODE_EDIT = 2;

export default class Editor {
  constructor(renderer) {
    this.renderer = renderer;

    this.closest;
    this.currentSector;

    this.selected = new Set();

    this.dirty = true;
    this.metaDirty = false;

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

    this.interaction = {
      selectionTimer: 0,
      selectionClickDuration: 150,
      mode: MODE_PAN
    };

    this.lastUpdate = new Date().getTime();
  }

  onUpdate(callback) {
    this.callback = callback;
  }

  handleMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();

    this.renderer.interaction.isDown = true;

    this.renderer.interaction.panStart.set(e.clientX, e.clientY);

    if (this.interaction.mode === MODE_SELECT) {  
      this.interaction.selectionTimer = new Date().getTime();

      this.selected.forEach(object => {
        object.editorTemp.oldPos = object.clone();
      });
    }

    this.dirty = true;
  }

  handleMouseUp(e) {
    e.preventDefault();
    e.stopPropagation();

    this.renderer.interaction.isDown = false;

    this.renderer.interaction.panStart.set(0, 0);

    if (this.interaction.mode === MODE_SELECT) {  
      if (this.interaction.selectionTimer + this.interaction.selectionClickDuration > new Date().getTime()) {
        let newSelection;
        this.interaction.selectionTimer = 0;
        if (this.closest) {
          if (e.originalEvent.shiftKey) {
            this.selected.add(this.closest);
            newSelection = this.closest;
          }
          else if (e.originalEvent.ctrlKey) {
            if (this.selected.has(this.closest)) {
              this.selected.delete(this.closest);
            }
            else {
              this.selected.add(this.closest);
              newSelection = this.closest;
            }
          }
          else if (e.originalEvent.altKey) {
            this.selected.delete(this.closest);
          }
          else {
            this.selected.clear();
            this.selected.add(this.closest);
            newSelection = this.closest;
          }
        }
        // const walls = [...this.selected];
        const lastWall = newSelection;
        if (Wall.prototype.isPrototypeOf(lastWall) && !lastWall.rendererMeta.highlightedVertex) {
          this.selected.add(lastWall.editorMeta.wall2);
          if (lastWall.editorMeta.nextWall) {
            this.selected.add(lastWall.editorMeta.nextWall);
            this.selected.add(lastWall.editorMeta.nextWall.editorMeta.wall2);
          }
        }

        this.renderer.selected = [...this.selected];
      }
    }

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

    if (this.interaction.mode === MODE_SELECT) {
      if (this.selected.size > 0) {
        const snap = this.renderer.gridSizeFromZoom();
        this.selected.forEach(object => {
          object.x = snap * Math.round((object.editorTemp.oldPos.x + (e.clientX - this.renderer.interaction.panStart.x) / this.renderer.zoom) / snap);
          object.y = snap * Math.round((object.editorTemp.oldPos.y + (e.clientY - this.renderer.interaction.panStart.y) / this.renderer.zoom) / snap);
        });
        this.metaDirty = true;
        this.renderer.metaDirty = true;
      }
    }

    if (this.interaction.mode === MODE_PAN) {
      this.renderer.interaction.panOffset.x -=
        (e.clientX - this.renderer.interaction.panStart.x) / this.renderer.zoom;
      this.renderer.interaction.panOffset.y -=
        (e.clientY - this.renderer.interaction.panStart.y) / this.renderer.zoom;
      this.renderer.interaction.panStart.set(e.clientX, e.clientY);
    }
  }

  setMode(mode) {
    this.interaction.mode = mode;
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
    const closestVertex = this.findClosestVertex(pos);
    const closestWall = this.findClosestWall(pos);
    const closestSprite = this.findClosestSprite(pos);

    this.findCurrentSector(pos);
    let closest;

    const candidates = [];

    if (closestVertex) {
      candidates.push({
        type: "vertex",
        object: closestVertex,
        distance: Point2.distanceSquared(closestVertex, pos) - (this.renderer.interaction.pointDistanceRadius * 2)
      });
    }

    if (closestWall) {
      candidates.push({
        type: "wall",
        object: closestWall,
        distance: Point2.distanceSquared(Point2.closestPointOnLine(
          closestWall,
          this.map.walls[closestWall.point2],
          pos
        ).point, pos)
      });
    }

    if (closestSprite) {
      candidates.push({
        type: "sprite",
        object: closestSprite,
        distance: Point2.distanceSquared(closestSprite, pos) - this.renderer.interaction.pointDistanceRadius
      });
    }

    if (candidates.length) {
      closest = candidates.sort((a, b) => a.distance < b.distance ? -1 : 1)[0];
    }

    if (closest) {
      if (closest.type === "vertex") {
        closest.object.rendererMeta.highlightedVertex = true;
      }
      else {
        closest.object.rendererMeta.highlighted = true;
      }
    }
    return closest.object;
  }

  findClosestVertex(pos) {
    let distance = Number.POSITIVE_INFINITY;
    let closest;
    this.map.walls.forEach(wall => {
      wall.rendererMeta.highlightedVertex = false;
      if (wall.rendererMeta.clipped) {
        return;
      }
      const wallDistance = Point2.distanceSquared(wall, pos);
      if (wallDistance < distance) {
        distance = wallDistance;
        closest = wall;
      }
    });
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
    if (this.renderer.zoom <= this.renderer.spritesZoomThreshold) {
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
      wall.editorMeta = {
        type: "Wall"
      };
      wall.editorMeta.index = index;
      const wall2 = this.map.walls[wall.point2];
      if (wall2) {
        const wall2Pos = wall2.clone();
        const centroid = wall.clone().centroid(wall2Pos);

        wall.editorMeta.centroid = centroid;
        wall.editorMeta.wall2 = wall2;
      }

      if (wall.nextWall > -1) {
        wall.editorMeta.nextWall = this.map.walls[wall.nextWall];
      }

    });

    // Associate sectors with walls and vice versa
    this.map.sectors.forEach((sector, index) => {
      sector.editorMeta = {
        type: "Sector"
      };
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
      sprite.editorMeta = {
        type: "Sprite"
      };
      sprite.editorMeta.index = index;
      sprite.editorMeta.sector = this.map.sectors[sprite.currentSectorIndex];
      sprite.editorMeta.sector.editorMeta.sprites.push(sprite);
    });

    this.metaDirty = false;
  }

  update() {
    if (this.metaDirty) {
      this.updateMetaData();
    }
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
      if (this.callback) {
        this.callback(this);
      }
      this.lastUpdate = new Date().getTime();
    }
    setTimeout(this.update.bind(this), UPDATE_RATE);
  }
}
