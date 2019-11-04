import $ from "jquery";

import Point2 from "../geom/point2";

import Wall from "../objects/wall";
import Player from "../objects/player";

const UPDATE_RATE = 100; // editor update rate in ms (renderer still runs at requestAnimationFrame fps)

export const MODE_PAN = 0;
export const MODE_SELECT = 1;
export const MODE_EDIT = 2;

export default class Editor {
  constructor(renderer2d, renderer3d) {
    this.renderer2d = renderer2d;
    this.renderer3d = renderer3d;

    this.closest;
    this.currentSector;

    this.selected = new Set();

    this.dirty = true;
    this.metaDirty = false;

    $(this.renderer2d.canvas).on("mousedown", e => {
      this.handleMouseDown(e);
    });
    $(this.renderer2d.canvas).on("mouseup", e => {
      this.handleMouseUp(e);
    });
    $(this.renderer2d.canvas).on("mousemove", e => {
      this.handleMouseMove(e);
    });
    $(this.renderer2d.canvas).on("mousewheel", e => {
      this.handleMouseWheel(e);
    });
    $(document).on("keydown", e => {
      this.handleKeyDown(e);
    });
    $(document).on("keyup", e => {
      this.handleKeyUp(e);
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

  handleKeyDown(e) {

    if ([37,38,39,40].find(x => e.keyCode)) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (e.keyCode === 37) {
      this.map.editorMeta.player.turn(-1);
    }
    else if (e.keyCode === 39) {
      this.map.editorMeta.player.turn(1);
    }
    if (e.keyCode === 38) {
      this.map.editorMeta.player.move(1);
    }
    else if (e.keyCode === 40) {
      this.map.editorMeta.player.move(-1);
    }
    
    this.dirty = true;
  }

  handleKeyUp(e) {
    if ([37,38,39,40].find(x => e.keyCode)) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (e.keyCode === 37 || e.keyCode === 39) {
      this.map.editorMeta.player.turn(0);
    }
    if (e.keyCode === 38 || e.keyCode === 40) {
      this.map.editorMeta.player.move(0);
    }
    
    this.dirty = true;
  }


  handleMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();

    this.renderer2d.interaction.isDown = true;

    this.renderer2d.interaction.panStart.set(e.clientX, e.clientY);

    if (this.interaction.mode === MODE_SELECT) {  
      this.interaction.selectionTimer = new Date().getTime();

      this.selected.forEach(object => {
        object.editorTemp.oldPos = object.clone();
      });
    }

    this.dirty = true;
  }

  getRelatedWalls(wall) {
    const relatedWalls = new Set();

    let tmpWall = wall;
    let prevWall;
    let count = this.map.walls.length;
    do {
      // Search anti-clockwise
      if (tmpWall.editorMeta.nextWall) {
        tmpWall = tmpWall.editorMeta.nextWall.editorMeta.wall2;
        relatedWalls.add(tmpWall);
      }
      else {
        // Search clockwise
        tmpWall = wall;
        do {
          prevWall = tmpWall.editorMeta.lastWall;
          if (prevWall.editorMeta.nextWall) {
            tmpWall = prevWall.editorMeta.nextWall;
            relatedWalls.add(tmpWall);
          }
          else {
            break;
          }
          count--;
        } while (tmpWall !== wall && count > 0);
        break;
      }
      count--;
    } while (tmpWall !== wall && count > 0);

    return [...relatedWalls] || [];
  }

  handleMouseUp(e) {
    e.preventDefault();
    e.stopPropagation();

    this.renderer2d.interaction.isDown = false;

    this.renderer2d.interaction.panStart.set(0, 0);

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
        if (Wall.prototype.isPrototypeOf(lastWall)) {
          const relatedWalls = this.getRelatedWalls(lastWall);
          relatedWalls.forEach(relatedWall => {
            this.selected.add(relatedWall);
          });
        }

        this.renderer2d.selected = [...this.selected];
      }
    }

    this.dirty = true;
  }

  handleMouseMove(e) {
    this.renderer2d.interaction.mouseWorldPos = this.renderer2d.screenToWorld(
      e.offsetX,
      e.offsetY
    );
    this.renderer2d.interaction.mouseScreenPos.x = e.offsetX;
    this.renderer2d.interaction.mouseScreenPos.y = e.offsetY;

    this.dirty = true;

    if (!this.renderer2d.interaction.isDown) {
      return;
    }

    if (this.interaction.mode === MODE_SELECT) {
      if (this.selected.size > 0) {
        const snap = this.renderer2d.gridSizeFromZoom();
        this.selected.forEach(object => {
          object.x = snap * Math.round((object.editorTemp.oldPos.x + (e.clientX - this.renderer2d.interaction.panStart.x) / this.renderer2d.zoom) / snap);
          object.y = snap * Math.round((object.editorTemp.oldPos.y + (e.clientY - this.renderer2d.interaction.panStart.y) / this.renderer2d.zoom) / snap);
        });
        this.metaDirty = true;
        this.renderer2d.metaDirty = true;
      }
    }

    if (this.interaction.mode === MODE_PAN) {
      this.renderer2d.interaction.panOffset.x -=
        (e.clientX - this.renderer2d.interaction.panStart.x) / this.renderer2d.zoom;
      this.renderer2d.interaction.panOffset.y -=
        (e.clientY - this.renderer2d.interaction.panStart.y) / this.renderer2d.zoom;
      this.renderer2d.interaction.panStart.set(e.clientX, e.clientY);
    }
  }

  setMode(mode) {
    this.interaction.mode = mode;
  }

  handleMouseWheel(e) {
    e.preventDefault();
    e.stopPropagation();

    this.dirty = true;

    this.renderer2d.changeZoom(e.originalEvent.deltaY > 0 ? 1 : -1, e, () => {
      this.dirty = true;
    });
  }

  setMap(map) {
    this.map = map;
    this.renderer2d.setMap(this.map);
    this.renderer3d.setMap(this.map);
    this.updateMetaData();
    this.renderer2d.updateMetaData();
    this.renderer3d.updateMetaData();
    
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
        distance: Point2.distanceSquared(closestVertex, pos) - (this.renderer2d.interaction.pointDistanceRadius * 2)
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
        distance: Point2.distanceSquared(closestSprite, pos) - this.renderer2d.interaction.pointDistanceRadius
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
    if (this.renderer2d.zoom <= this.renderer2d.spritesZoomThreshold) {
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
        this.renderer2d.interaction.pointDistanceRadius;
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
      sector.editorMeta.firstWall = this.map.walls[sector.firstWallIndex];
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
        if (lastWallIndex !== Number.POSITIVE_INFINITY) {
          if (wall.point2 < lastWallIndex) {
            wall.editorMeta.sector.editorMeta.lastWallIndex = lastWallIndex;
            loop++;
          }
        }
        lastWallIndex = wall.point2;
        this.map.walls[lastWallIndex].editorMeta.lastWall = wall;
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

    // If one hasn't been instantiated, create a player at the start position
    if (!this.map.editorMeta.player) {
      this.map.editorMeta.player = new Player().copyFrom(this.map.startPosition);
    }

    this.metaDirty = false;
  }

  update() {
    if (this.metaDirty) {
      this.updateMetaData();
    }
    if (this.dirty) {
      this.dirty = false;
      if (this.map) {
        if (this.map.editorMeta.player) {
          const player = this.map.editorMeta.player;
          const currentSector = this.findCurrentSector(new Point2().copyFrom(player));
          if (currentSector) {
            player.currentSector = currentSector;
          }
        }
        const closest = this.findClosestObject(
          this.renderer2d.interaction.mouseWorldPos
        );
        const currentSector = this.findCurrentSector(
          this.renderer2d.interaction.mouseWorldPos
        );
        if (this.closest !== closest) {
          this.closest = this.renderer2d.closest = closest;
          if (this.debug) {
            console.log(this.closest);
          }
        }
        if (this.currentSector !== currentSector) {
          this.currentSector = this.renderer2d.currentSector = currentSector;
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
