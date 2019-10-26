import $ from 'jquery';
import TweenMax from 'gsap';

import NAMES from '../data/names'

import Wall from '../objects/wall';
import Sprite from '../objects/sprite';

import Point2 from '../geom/point2';

const DIVIDER = Math.pow(2, 7);

export default class MapRenderer {
  constructor(canvas) {
    this.debug = true;

    this.canvas = canvas;
    this.width = $(window).innerWidth();
    this.height = $(window).innerHeight();

    $(window).on("resize", () => {
      this.width = $(window).innerWidth();
      this.height = $(window).innerHeight();
      this.canvas.width = this.width;
      this.canvas.height = this.height;
    });

    this.mapBufferCtx = canvas.getContext("2d", { alpha: false });
    this.map = null;

    this.zoom = 1 / DIVIDER;

    this.spritesZoomThreshold = 3 / DIVIDER;
    this.spriteAnglesZoomThreshold = 4 / DIVIDER;
    this.wallNormalsZoomThreshold = 6 / DIVIDER;
    this.verticesZoomThreshold = 6 / DIVIDER;

    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.interaction = {
      panStart: new Point2(),
      panOffset: new Point2(this.width * -0.5, this.height * -0.5),
      isDown: false,
      mouseWorldPos: new Point2(),
      mouseScreenPos: new Point2(),
      pointDistanceRadius: 512 // this defines the radius at which a point such as a sprite or a vertex will override the nearest wall algorithm
    };

    $(this.canvas).on("mousedown", e => {
      this.handleMouseDown(e);
    });
    $(this.canvas).on("mouseup", e => {
      this.handleMouseUp(e);
    });
    $(this.canvas).on("mousemove", e => {
      this.handleMouseMove(e);
    });
    $(this.canvas).on("mousewheel", e => {
      this.handleMouseWheel(e);
    });

    requestAnimationFrame(this.render.bind(this));
  }

  handleMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();

    this.interaction.panStart.set(e.clientX, e.clientY);
    this.interaction.isDown = true;
  }

  handleMouseUp(e) {
    e.preventDefault();
    e.stopPropagation();

    this.interaction.panStart.set(0, 0);
    this.interaction.isDown = false;
  }

  handleMouseMove(e) {
    this.interaction.mouseWorldPos = this.screenToWorld(e.offsetX, e.offsetY);
    this.interaction.mouseScreenPos.x = e.offsetX;
    this.interaction.mouseScreenPos.y = e.offsetY;

    if (!this.interaction.isDown) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();

    this.interaction.panOffset.x -=
      (e.clientX - this.interaction.panStart.x) / this.zoom;
    this.interaction.panOffset.y -=
      (e.clientY - this.interaction.panStart.y) / this.zoom;
    this.interaction.panStart.set(e.clientX, e.clientY);
  }

  handleMouseWheel(e) {
    e.preventDefault();
    e.stopPropagation();

    const beforeZoomPos = this.screenToWorld(e.offsetX, e.offsetY);

    let newZoom = this.zoom;
    if (e.originalEvent.deltaY > 0) {
      newZoom /= 1.4;
      if (newZoom < 0.5 / DIVIDER) {
        newZoom = 0.5 / DIVIDER;
      }
    } else if (e.originalEvent.deltaY < 0) {
      newZoom *= 1.4;
      if (newZoom > 150 / DIVIDER) {
        newZoom = 150 / DIVIDER;
      }
    }

    TweenMax.to(this, 0.15, {
      zoom: newZoom,
      onUpdate: () => {
        const afterZoomPos = this.screenToWorld(e.offsetX, e.offsetY);

        this.interaction.panOffset.x += beforeZoomPos.x - afterZoomPos.x;
        this.interaction.panOffset.y += beforeZoomPos.y - afterZoomPos.y;
      }
    });
  }

  findClosestObject(pos) {
    const closestWall = this.findClosestWall(pos);
    const closestSprite = this.findClosestSprite(pos);

    this.findCurrentSector(pos);

    let closest;
    if (closestWall && closestSprite) {
      const closestWallDistance = Point2.distanceSquared(
        Point2.closestPointOnLine(closestWall, this.map.walls[closestWall.point2], pos).point,
        pos
      );

      const spritePos = closestSprite.clone();
      const closestSpriteDistance = Point2.distanceSquared(
        spritePos,
        pos
      ) - this.interaction.pointDistanceRadius;
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
      const wallPos = Point2.closestPointOnLine(wall, this.map.walls[wall.point2], pos);

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

      const spriteDistance = Point2.distanceSquared(spritePos, pos) - this.interaction.pointDistanceRadius;
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

  worldToScreen(wx, wy) {
    return new Point2(
      (wx - this.interaction.panOffset.x) * this.zoom,
      (wy - this.interaction.panOffset.y) * this.zoom
    );
  }

  screenToWorld(sx, sy) {
    return new Point2(
      sx / this.zoom + this.interaction.panOffset.x,
      sy / this.zoom + this.interaction.panOffset.y
    );
  }

  setMap(map) {
    this.interaction.panStart.set(0, 0);
    this.interaction.panOffset.set(
      this.width * DIVIDER * -0.5,
      this.height * DIVIDER * -0.5
    );
    this.map = map;
    this.zoom = 1 / DIVIDER;
    this.updateMetaData();
  }

  drawLine(ctx, x1, y1, x2, y2, batched) {
    ctx = ctx || this.mapBufferCtx;
    if (!batched) {
      ctx.strokeStyle = ctx.fillStyle;
      ctx.beginPath();
    }
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    if (!batched) {
      ctx.stroke();
    }
  }

  drawCircle(ctx, x0, y0, radius, batched) {
    if (!batched) {
      ctx = ctx || this.mapBufferCtx;
      ctx.strokeStyle = ctx.fillStyle;
      ctx.beginPath();
    }
    if (batched) {
      ctx.moveTo(x0 + radius, y0);
    }
    ctx.arc(x0, y0, radius, 0, 2 * Math.PI);
    if (!batched) {
      ctx.stroke();
    }
  }

  drawNormal(
    ctx,
    wall,
    normalIndicatorMagnitude,
    normalIndicatorAngle,
    p1x,
    p1y,
    p2x,
    p2y,
    pcx,
    pcy,
    batched
  ) {
    if (this.zoom <= this.wallNormalsZoomThreshold) {
      return;
    }
    let angle = Math.atan2(p2y - p1y, p2x - p1x) + normalIndicatorAngle;
    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);
    this.drawLine(
      ctx,
      pcx,
      pcy,
      pcx + normalIndicatorMagnitude * cosAngle,
      pcy + normalIndicatorMagnitude * sinAngle,
      batched
    );
  }

  drawClosestPointOnWall(
    ctx,
    normalIndicatorMagnitude,
    normalIndicatorAngle,
    p1x,
    p1y,
    p2x,
    p2y,
    batched
  ) {
    const pc = Point2.closestPointOnLine(new Point2(p1x, p1y), new Point2(p2x, p2y), this.interaction.mouseScreenPos)
    const normalIndicatorMagnitudeHalf = normalIndicatorMagnitude * .5;

    const angle = Math.atan2(p2y - p1y, p2x - p1x) + normalIndicatorAngle;
    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);

    this.drawLine(
      ctx,
      pc.point.x - normalIndicatorMagnitudeHalf * cosAngle,
      pc.point.y - normalIndicatorMagnitudeHalf * sinAngle,
      pc.point.x + normalIndicatorMagnitudeHalf * cosAngle,
      pc.point.y + normalIndicatorMagnitudeHalf * sinAngle,
      batched
    );
  }

  renderWalls(wallClipPadding, normalIndicatorMagnitude) {
    const normalIndicatorAngle = 1.5707963267948966; // 90 degrees clockwise
    const solidWalls = this.map.walls.filter(
      wall => wall.nextSector === -1 && !wall.rendererMeta.highlighted
    );
    const midWalls = this.map.walls.filter(
      wall =>
        wall.nextSector > -1 && !wall.rendererMeta.highlighted && !wall.stat.blockClipMove
    );
    const clipWalls = this.map.walls.filter(
      wall =>
        wall.nextSector > -1 && !wall.rendererMeta.highlighted && wall.stat.blockClipMove
    );

    // Mid walls
    this.mapBufferCtx.strokeStyle = this.mapBufferCtx.fillStyle =
      "rgba(0,128,255,.5)";
    this.mapBufferCtx.beginPath();
    midWalls.forEach(wall => {
      if (wall.rendererMeta.skip) {
        return;
      }
      if (wall.nextWall > -1) {
        this.map.walls[wall.nextWall].rendererMeta.skip = true;
      }

      const pc = this.worldToScreen(wall.editorMeta.centroid.x, wall.editorMeta.centroid.y);

      const boundingRadius = wall.rendererMeta.boundingRadius * this.zoom;
      if (
        pc.x + boundingRadius < -wallClipPadding ||
        pc.x - boundingRadius > this.width + wallClipPadding ||
        pc.y + boundingRadius < -wallClipPadding ||
        pc.y - boundingRadius > this.height + wallClipPadding
      ) {
        wall.rendererMeta.clipped = true;
        return;
      }
      wall.rendererMeta.clipped = false;

      const wall2 = this.map.walls[wall.point2];
      const p1 = this.worldToScreen(wall.x, wall.y);
      const p2 = this.worldToScreen(wall2.x, wall2.y);

      this.drawLine(this.mapBufferCtx, p1.x, p1.y, p2.x, p2.y, true);

      this.drawNormal(
        this.mapBufferCtx,
        wall,
        normalIndicatorMagnitude,
        normalIndicatorAngle,
        p1.x,
        p1.y,
        p2.x,
        p2.y,
        pc.x,
        pc.y,
        true
      );
    });
    this.mapBufferCtx.stroke();

    // Clip walls
    this.mapBufferCtx.strokeStyle = this.mapBufferCtx.fillStyle =
      "rgba(255,0,255,.5)";
    this.mapBufferCtx.beginPath();
    clipWalls.forEach(wall => {
      if (wall.rendererMeta.skip) {
        return;
      }
      if (wall.nextWall > -1) {
        this.map.walls[wall.nextWall].rendererMeta.skip = true;
      }

      const pc = this.worldToScreen(wall.editorMeta.centroid.x, wall.editorMeta.centroid.y);

      const boundingRadius = wall.rendererMeta.boundingRadius * this.zoom;
      if (
        pc.x + boundingRadius < -wallClipPadding ||
        pc.x - boundingRadius > this.width + wallClipPadding ||
        pc.y + boundingRadius < -wallClipPadding ||
        pc.y - boundingRadius > this.height + wallClipPadding
      ) {
        wall.rendererMeta.clipped = true;
        return;
      }
      wall.rendererMeta.clipped = false;

      const wall2 = this.map.walls[wall.point2];
      const p1 = this.worldToScreen(wall.x, wall.y);
      const p2 = this.worldToScreen(wall2.x, wall2.y);

      if (!wall.rendererMeta.skip) {
        this.drawLine(this.mapBufferCtx, p1.x, p1.y, p2.x, p2.y, true);
      }

      this.drawNormal(
        this.mapBufferCtx,
        wall,
        normalIndicatorMagnitude,
        normalIndicatorAngle,
        p1.x,
        p1.y,
        p2.x,
        p2.y,
        pc.x,
        pc.y,
        true
      );
    });
    this.mapBufferCtx.stroke();

    // Solid walls
    this.mapBufferCtx.strokeStyle = this.mapBufferCtx.fillStyle =
      "rgba(255,255,255,.8)";
    this.mapBufferCtx.beginPath();
    solidWalls.forEach(wall => {
      const pc = this.worldToScreen(wall.editorMeta.centroid.x, wall.editorMeta.centroid.y);

      const boundingRadius = wall.rendererMeta.boundingRadius * this.zoom;
      if (
        pc.x + boundingRadius < -wallClipPadding ||
        pc.x - boundingRadius > this.width + wallClipPadding ||
        pc.y + boundingRadius < -wallClipPadding ||
        pc.y - boundingRadius > this.height + wallClipPadding
      ) {
        wall.rendererMeta.clipped = true;
        return;
      }
      wall.rendererMeta.clipped = false;

      const wall2 = this.map.walls[wall.point2];
      const p1 = this.worldToScreen(wall.x, wall.y);
      const p2 = this.worldToScreen(wall2.x, wall2.y);

      this.drawLine(this.mapBufferCtx, p1.x, p1.y, p2.x, p2.y, true);

      this.drawNormal(
        this.mapBufferCtx,
        wall,
        normalIndicatorMagnitude,
        normalIndicatorAngle,
        p1.x,
        p1.y,
        p2.x,
        p2.y,
        pc.x,
        pc.y,
        true
      );
    });
    this.mapBufferCtx.stroke();

    // Vertices
    if (this.zoom > this.verticesZoomThreshold) {
      this.mapBufferCtx.strokeStyle = this.mapBufferCtx.fillStyle =
        "rgba(0,255,255,.75)";
      this.mapBufferCtx.beginPath();
      this.map.walls.forEach(wall => {
        if (wall.rendererMeta.clipped || wall.rendererMeta.skip) {
          return;
        }
        const p1 = this.worldToScreen(wall.x, wall.y);
        this.mapBufferCtx.rect(p1.x - 3, p1.y - 3, 5, 5);
      });
      this.mapBufferCtx.stroke();
    }

    // Highlighted wall
    if (this.closest && Wall.prototype.isPrototypeOf(this.closest)) {
      const wall = this.closest;
      const wall2 = this.map.walls[wall.point2];
      const p1 = this.worldToScreen(wall.x, wall.y);
      const p2 = this.worldToScreen(wall2.x, wall2.y);
      const pc = this.worldToScreen(wall.editorMeta.centroid.x, wall.editorMeta.centroid.y);
      this.mapBufferCtx.strokeStyle = this.mapBufferCtx.fillStyle =
        "rgba(255,255,255," +
        (Math.sin(new Date().getTime() / 50) * 0.2 + 0.8) +
        ")";
      this.mapBufferCtx.beginPath();
      this.drawLine(this.mapBufferCtx, p1.x, p1.y, p2.x, p2.y, true);
      this.drawNormal(
        this.mapBufferCtx,
        wall,
        normalIndicatorMagnitude,
        normalIndicatorAngle,
        p1.x,
        p1.y,
        p2.x,
        p2.y,
        pc.x,
        pc.y,
        true
      );
      this.drawClosestPointOnWall(
        this.mapBufferCtx,
        normalIndicatorMagnitude,
        normalIndicatorAngle,
        p1.x,
        p1.y,
        p2.x,
        p2.y,
        true
      )
      this.mapBufferCtx.stroke();
    }
  }

  renderSprites(spriteClipPadding, angleIndicatorMagnitude) {
    if (this.zoom <= this.spritesZoomThreshold) {
      return;
    }
    const specialSprites = this.map.sprites.filter(
      sprite => sprite.picNum <= 10 && !sprite.rendererMeta.highlighted
    );
    const normalSprites = this.map.sprites.filter(
      sprite => sprite.picNum > 10 && !sprite.rendererMeta.highlighted
    );
    const timer = new Date().getTime();

    // Special sprites
    this.mapBufferCtx.strokeStyle = this.mapBufferCtx.fillStyle =
      "rgba(255,128,0,.8)";
    this.mapBufferCtx.beginPath();
    specialSprites.forEach(sprite => {
      const p = this.worldToScreen(sprite.x, sprite.y);
      if (
        p.x < -spriteClipPadding ||
        p.y < -spriteClipPadding ||
        p.x > this.width + spriteClipPadding ||
        p.y > this.height + spriteClipPadding
      ) {
        sprite.rendererMeta.clipped = true;
        return;
      }
      sprite.rendererMeta.clipped = false;

      this.drawCircle(
        this.mapBufferCtx,
        p.x,
        p.y,
        this.zoom > this.verticesZoomThreshold * 2 ? 5 : 2,
        true
      );

      if (this.zoom > this.spriteAnglesZoomThreshold) {
        const rads = sprite.angleRadians;
        this.drawLine(
          this.mapBufferCtx,
          p.x,
          p.y,
          p.x + angleIndicatorMagnitude * Math.cos(rads),
          p.y + angleIndicatorMagnitude * Math.sin(rads),
          true
        );
      }
    });
    this.mapBufferCtx.stroke();

    // Special sprite radii
    this.mapBufferCtx.strokeStyle = this.mapBufferCtx.fillStyle =
      "rgba(255,128,0,.2)";
    this.mapBufferCtx.setLineDash([4, 4]);
    this.mapBufferCtx.beginPath();
    specialSprites
      .filter(
        sprite =>
          NAMES[sprite.picNum] === "MUSICANDSFX" && !sprite.rendererMeta.clipped
      )
      .forEach(sprite => {
        const p = this.worldToScreen(sprite.x, sprite.y);
        if (
          p.x + sprite.hiTag * this.zoom < -spriteClipPadding ||
          p.y + sprite.hiTag * this.zoom < -spriteClipPadding ||
          p.x - sprite.hiTag * this.zoom > this.width + spriteClipPadding ||
          p.y - sprite.hiTag * this.zoom > this.height + spriteClipPadding
        ) {
          sprite.rendererMeta.clipped = true;
          return;
        }
        this.drawCircle(
          this.mapBufferCtx,
          p.x,
          p.y,
          sprite.hiTag * this.zoom,
          true
        );
      });
    this.mapBufferCtx.stroke();
    this.mapBufferCtx.setLineDash([]);

    // Normal sprites
    this.mapBufferCtx.strokeStyle = this.mapBufferCtx.fillStyle =
      "rgba(0,255,128,.8)";
    this.mapBufferCtx.beginPath();
    normalSprites.forEach(sprite => {
      const p = this.worldToScreen(sprite.x, sprite.y);
      if (
        p.x < -spriteClipPadding ||
        p.y < -spriteClipPadding ||
        p.x > this.width + spriteClipPadding ||
        p.y > this.height + spriteClipPadding
      ) {
        sprite.rendererMeta.clipped = true;
        return;
      }
      sprite.rendererMeta.clipped = false;

      this.drawCircle(
        this.mapBufferCtx,
        p.x,
        p.y,
        this.zoom > this.verticesZoomThreshold * 2 ? 5 : 2,
        true
      );

      if (this.zoom > this.spriteAnglesZoomThreshold) {
        const rads = sprite.angleRadians;
        this.drawLine(
          this.mapBufferCtx,
          p.x,
          p.y,
          p.x + angleIndicatorMagnitude * Math.cos(rads),
          p.y + angleIndicatorMagnitude * Math.sin(rads),
          true
        );
      }
    });
    this.mapBufferCtx.stroke();

    // Highlighted sprite
    if (this.closest && Sprite.prototype.isPrototypeOf(this.closest)) {
      const sprite = this.closest;
      const p = this.worldToScreen(sprite.x, sprite.y);
      this.mapBufferCtx.strokeStyle = this.mapBufferCtx.fillStyle =
        "rgba(255,255,255," + (Math.sin(timer / 50) * 0.2 + 0.8) + ")";
      this.mapBufferCtx.beginPath();
      this.drawCircle(
        this.mapBufferCtx,
        p.x,
        p.y,
        this.zoom > this.verticesZoomThreshold * 2 ? 5 : 2,
        true
      );
      if (this.zoom > this.spriteAnglesZoomThreshold) {
        const rads = sprite.angleRadians;
        this.drawLine(
          this.mapBufferCtx,
          p.x,
          p.y,
          p.x + angleIndicatorMagnitude * Math.cos(rads),
          p.y + angleIndicatorMagnitude * Math.sin(rads),
          true
        );
      }
      this.mapBufferCtx.stroke();

      if (NAMES[sprite.picNum] === "MUSICANDSFX") {
        this.mapBufferCtx.strokeStyle = this.mapBufferCtx.fillStyle =
          "rgba(255,255,255," + (Math.sin(timer / 50) * 0.05 + 0.2) + ")";
        this.mapBufferCtx.setLineDash([4, 4]);
        this.mapBufferCtx.lineDashOffset = (timer / 50) % 8;
        this.mapBufferCtx.beginPath();
        this.drawCircle(
          this.mapBufferCtx,
          p.x,
          p.y,
          sprite.hiTag * this.zoom,
          true
        );
        this.mapBufferCtx.stroke();
        this.mapBufferCtx.setLineDash([]);
        this.mapBufferCtx.lineDashOffset = 0;
      }
    }
  }

  updateMapBuffer() {
    const wallClipPadding = 0;
    const spriteClipPadding = 32;
    const angleIndicatorMagnitude = 160 * this.zoom;
    const normalIndicatorMagnitude = 6;
    const mapSize = 131072;

    this.renderGrid(this.mapBufferCtx, mapSize, this.gridSizeFromZoom());

    this.renderGizmos(this.mapBufferCtx, mapSize);

    this.renderWalls(wallClipPadding, normalIndicatorMagnitude);

    this.renderSprites(spriteClipPadding, angleIndicatorMagnitude);
  }

  gridSizeFromZoom() {
    if (this.zoom > 1) {
      return 8;
    }
    if (this.zoom > 0.5) {
      return 16;
    }
    if (this.zoom > 0.25) {
      return 32;
    }
    if (this.zoom > 0.1) {
      return 64;
    }
    if (this.zoom > 0.05) {
      return 128;
    }
    if (this.zoom > 0.025) {
      return 256;
    }
    if (this.zoom > 0.0125) {
      return 512;
    }
    return 1024;
  }

  updateMetaData() {
    this.map.walls.forEach((wall, index) => {
      wall.editorMeta = {};
      wall.rendererMeta = {};
      wall.editorMeta.index = index;
      const wall2 = this.map.walls[wall.point2];
      if (wall2) {
        const wall2Pos = wall2.clone();
        const centroid = wall.clone().centroid(wall2Pos);

        wall.editorMeta.centroid = centroid;
        wall.rendererMeta.boundingRadius = Point2.distance(wall.editorMeta.centroid, wall2Pos);
      }
    });

    // Associate sectors with walls and vice versa
    this.map.sectors.forEach((sector, index) => {
      sector.editorMeta = {};
      sector.rendererMeta = {};
      sector.editorMeta.index = index;
      sector.editorMeta.walls = this.map.walls.slice(sector.firstWallIndex, sector.firstWallIndex + sector.numWalls);
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
      })

      sector.editorMeta.numLoops = loop;
    });

    this.map.sprites.forEach((sprite, index) => {
      sprite.editorMeta = {};
      sprite.rendererMeta = {};
      sprite.editorMeta.index = index;
      sprite.editorMeta.sector = this.map.sectors[sprite.currentSectorIndex];
      sprite.editorMeta.sector.editorMeta.sprites.push(sprite);
    });
  }

  renderGrid(ctx, mapSize, step, majorStep = 8) {
    const gridPadding = 0;
    const gridColor = "60,128,160";
    const gridMajorOpacity = 0.1;
    const gridMinorOpacity = 0.05;

    // Major grid lines
    ctx.strokeStyle = ctx.fillStyle =
      "rgba(" + gridColor + "," + gridMajorOpacity + ")";
    ctx.beginPath();
    for (let i = mapSize * -0.5; i <= mapSize * 0.5; i += step * majorStep) {
      let lineStartX = this.worldToScreen(i, mapSize * -0.5);
      if (
        lineStartX.x > -gridPadding &&
        lineStartX.x < this.width + gridPadding
      ) {
        let lineEndX = this.worldToScreen(i, mapSize * 0.5);
        lineStartX.x = Math.max(lineStartX.x, -gridPadding);
        lineStartX.y = Math.max(lineStartX.y, -gridPadding);
        lineEndX.x = Math.min(lineEndX.x, this.width + gridPadding);
        lineEndX.y = Math.min(lineEndX.y, this.height + gridPadding);
        this.drawLine(
          ctx,
          lineStartX.x,
          lineStartX.y,
          lineEndX.x,
          lineEndX.y,
          true
        );
      }

      let lineStartY = this.worldToScreen(mapSize * -0.5, i);
      if (
        lineStartY.y > -gridPadding &&
        lineStartY.y < this.height + gridPadding
      ) {
        let lineEndY = this.worldToScreen(mapSize * 0.5, i);
        lineStartY.x = Math.max(lineStartY.x, -gridPadding);
        lineStartY.y = Math.max(lineStartY.y, -gridPadding);
        lineEndY.x = Math.min(lineEndY.x, this.width + gridPadding);
        lineEndY.y = Math.min(lineEndY.y, this.height + gridPadding);
        this.drawLine(
          ctx,
          lineStartY.x,
          lineStartY.y,
          lineEndY.x,
          lineEndY.y,
          true
        );
      }
    }
    ctx.stroke();

    // Minor grid lines
    ctx.strokeStyle = ctx.fillStyle =
      "rgba(" + gridColor + "," + gridMinorOpacity + ")";
    ctx.beginPath();
    for (let i = mapSize * -0.5; i <= mapSize * 0.5; i += step) {
      let lineStartX = this.worldToScreen(i, mapSize * -0.5);
      if (
        lineStartX.x > -gridPadding &&
        lineStartX.x < this.width + gridPadding
      ) {
        let lineEndX = this.worldToScreen(i, mapSize * 0.5);
        lineStartX.x = Math.max(lineStartX.x, -gridPadding);
        lineStartX.y = Math.max(lineStartX.y, -gridPadding);
        lineEndX.x = Math.min(lineEndX.x, this.width + gridPadding);
        lineEndX.y = Math.min(lineEndX.y, this.height + gridPadding);
        this.drawLine(
          ctx,
          lineStartX.x,
          lineStartX.y,
          lineEndX.x,
          lineEndX.y,
          true
        );
      }

      let lineStartY = this.worldToScreen(mapSize * -0.5, i);
      if (
        lineStartY.y > -gridPadding &&
        lineStartY.y < this.height + gridPadding
      ) {
        let lineEndY = this.worldToScreen(mapSize * 0.5, i);
        lineStartY.x = Math.max(lineStartY.x, -gridPadding);
        lineStartY.y = Math.max(lineStartY.y, -gridPadding);
        lineEndY.x = Math.min(lineEndY.x, this.width + gridPadding);
        lineEndY.y = Math.min(lineEndY.y, this.height + gridPadding);
        this.drawLine(
          ctx,
          lineStartY.x,
          lineStartY.y,
          lineEndY.x,
          lineEndY.y,
          true
        );
      }
    }
    ctx.stroke();
  }

  renderGizmos(ctx, mapSize) {
    const gizmoColor = "60,128,160";
    const gizmoOpacity = .2;
    ctx.strokeStyle = ctx.fillStyle = "rgba(" + gizmoColor + "," + gizmoOpacity + ")";
    ctx.beginPath();
    this.drawLine(
      ctx,
      this.interaction.mouseScreenPos.x,
      0,
      this.interaction.mouseScreenPos.x,
      this.height,
      true
    );
    this.drawLine(
      ctx,
      0,
      this.interaction.mouseScreenPos.y,
      this.width,
      this.interaction.mouseScreenPos.y,
      true
    );
    ctx.stroke();

    if (this.currentSector) {
      ctx.fillStyle = "rgba(" + gizmoColor + "," + (gizmoOpacity * .25) + ")";
      const sectorPath = new Path2D();
      let lastLoop = 0;
      this.currentSector.editorMeta.walls.forEach((wall, i) => {
        const p1 = this.worldToScreen(wall.x, wall.y);
        const wall2 = this.map.walls[wall.point2];
        const p2 = this.worldToScreen(wall2.x, wall2.y);
        if (i === 0 || wall.editorMeta.loop > lastLoop) {
          sectorPath.moveTo(p1.x, p1.y);
          if (wall.editorMeta.loop > lastLoop) {
            lastLoop = wall.editorMeta.loop;
          }
        }
        sectorPath.lineTo(p2.x, p2.y);
      });


      sectorPath.closePath();
      ctx.fill(sectorPath);
    }
  }

  render() {
    if (this.map) {
      const closest = this.findClosestObject(this.interaction.mouseWorldPos);
      const currentSector = this.findCurrentSector(this.interaction.mouseWorldPos);
      if (this.closest !== closest) {
        this.closest = closest;
        if (this.debug) {
          console.log(this.closest);
        }
      }
      if (this.currentSector !== currentSector) {
        this.currentSector = currentSector;
        if (this.debug) {
          console.log(this.currentSector);
        }
      }
    }

    if (this.map) {
      this.mapBufferCtx.clearRect(0, 0, this.width, this.height);
      this.updateMapBuffer();
    }

    requestAnimationFrame(this.render.bind(this));
  }
};