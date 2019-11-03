import $ from "jquery";
import TweenMax from "gsap";

import NAMES from "../data/names";

import Wall from "../objects/wall";
import Sprite from "../objects/sprite";

import Point2 from "../geom/point2";

const DIVIDER = 128; // How much we need to scale the map units down to make things more manageable

const COLORS = {
  default: {
    background: "18,35,52",
    innerWalls: "0,128,255",
    clipWalls: "255,0,255",
    outerWalls: "255,255,255",
    vertices: "0,255,255",
    highlighted: "255,255,255",
    selected: "0,255,255",
    specialSprites: "255,128,0",
    sprites: "0,255,128",
    grid: "60,128,160",
    gizmos: "60,128,160",
    player: "0,255,0",
  },
  classic: {
    background: "0,0,0",
    innerWalls: "255,0,0",
    clipWalls: "255,0,255",
    outerWalls: "255,255,255",
    vertices: "255,255,255",
    highlighted: "255,255,255",
    selected: "0,255,255",
    specialSprites: "255,255,255",
    sprites: "0,255,0",
    grid: "255,255,255",
    gizmos: "255,255,255",
    player: "255,255,255"
  },
  retro: {
    background: "36,29,0",
    innerWalls: "208,162,60",
    clipWalls: "155,50,157",
    outerWalls: "222,189,122",
    vertices: "255,132,18",
    highlighted: "255,195,28",
    selected: "255,255,255",
    specialSprites: "0,163,239",
    sprites: "93,197,63",
    grid: "208,162,60",
    gizmos: "208,162,60",
    player: "255,195,28",
  }
};

function getEditorColor(theme, key) {
  if (COLORS[theme]) {
    return COLORS[theme][key];
  }
  return COLORS.default[key];
}

export default class MapRenderer {
  constructor(canvas) {
    this.debug = true;

    this.theme = "default";

    this.canvas = canvas;
    this.width = $(window).innerWidth();
    this.height = $(window).innerHeight();

    this.metaDirty = false;

    $(window).on("resize", () => {
      this.width = $(window).innerWidth();
      this.height = $(window).innerHeight();
      this.canvas.width = this.width;
      this.canvas.height = this.height;
    });

    this.ctx = canvas.getContext("2d", { alpha: false });
    this.map = null;

    this._zoom = 1 / DIVIDER;

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

    this.closest = null;
    this.selected = [];

    requestAnimationFrame(this.render.bind(this));
  }

  changeZoom(delta, e, callback) {
    const beforeZoomPos = this.screenToWorld(e.offsetX, e.offsetY);

    let newZoom = this._zoom;
    if (delta > 0) {
      newZoom /= 1.4;
      if (newZoom < 0.5 / DIVIDER) {
        newZoom = 0.5 / DIVIDER;
      }
    } else if (delta < 0) {
      newZoom *= 1.4;
      if (newZoom > 150 / DIVIDER) {
        newZoom = 150 / DIVIDER;
      }
    }

    TweenMax.to(this, 0.15, {
      _zoom: newZoom,
      onUpdate: () => {
        const afterZoomPos = this.screenToWorld(e.offsetX, e.offsetY);

        this.interaction.panOffset.x += beforeZoomPos.x - afterZoomPos.x;
        this.interaction.panOffset.y += beforeZoomPos.y - afterZoomPos.y;
      },
      onComplete: () => {
        if (callback) {
          callback(this._zoom);
        }
      }
    });
  }

  get zoom() {
    return this._zoom;
  }

  worldToScreen(wx, wy) {
    return new Point2(
      (wx - this.interaction.panOffset.x) * this._zoom,
      (wy - this.interaction.panOffset.y) * this._zoom
    );
  }

  screenToWorld(sx, sy) {
    return new Point2(
      sx / this._zoom + this.interaction.panOffset.x,
      sy / this._zoom + this.interaction.panOffset.y
    );
  }

  setMap(map) {
    this.interaction.panStart.set(0, 0);
    this.interaction.panOffset.set(
      this.width * DIVIDER * -0.5,
      this.height * DIVIDER * -0.5
    );
    this.map = map;
    this._zoom = 1 / DIVIDER;
  }

  drawPosition(ctx, x0, y0, angle, radius, batched) {
    ctx = ctx || this.ctx;
    if (!batched) {
      ctx.strokeStyle = ctx.fillStyle;
      ctx.beginPath();
    }

    const origin = new Point2(x0, y0);

    const p1 = Point2.rotate(new Point2(origin.x + radius, origin.y), origin, angle);
    const p2 = Point2.rotate(new Point2(origin.x - radius, origin.y - (radius * .5)), origin, angle)
    const p3 = Point2.rotate(new Point2(origin.x - radius, origin.y + (radius * .5)), origin, angle)

    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.lineTo(p1.x, p1.y);

    if (!batched) {
      ctx.stroke();
    }
  }

  drawLine(ctx, x1, y1, x2, y2, batched) {
    ctx = ctx || this.ctx;
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
      ctx = ctx || this.ctx;
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
    if (this._zoom <= this.wallNormalsZoomThreshold) {
      return;
    }
    const thisSector = wall.editorMeta.sector;
    const nextSector = wall.nextSector > -1 ? this.map.sectors[wall.nextSector] : null;
    if (!nextSector || (thisSector.floor.z >= nextSector.floor.z)) {
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
    if (nextSector && (thisSector.floor.z <= nextSector.floor.z)) {
      let angle = Math.atan2(p2y - p1y, p2x - p1x) + (normalIndicatorAngle * -1);
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
    const pc = Point2.closestPointOnLine(
      new Point2(p1x, p1y),
      new Point2(p2x, p2y),
      this.interaction.mouseScreenPos
    );
    const normalIndicatorMagnitudeHalf = normalIndicatorMagnitude * 0.5;

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
        wall.nextSector > -1 &&
        !wall.rendererMeta.highlighted &&
        !wall.stat.blockClipMove
    );
    const clipWalls = this.map.walls.filter(
      wall =>
        wall.nextSector > -1 &&
        !wall.rendererMeta.highlighted &&
        wall.stat.blockClipMove
    );

    // Mid walls
    this.ctx.strokeStyle = this.ctx.fillStyle = `rgba(${getEditorColor(this.theme, "innerWalls")},.5)`;
    this.ctx.beginPath();
    midWalls.forEach(wall => {
      if (wall.rendererMeta.skip) {
        return;
      }
      if (wall.nextWall > -1) {
        this.map.walls[wall.nextWall].rendererMeta.skip = true;
      }

      const pc = this.worldToScreen(
        wall.rendererMeta.centroid.x,
        wall.rendererMeta.centroid.y
      );

      const boundingRadius = wall.rendererMeta.boundingRadius * this._zoom;
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

      this.drawLine(this.ctx, p1.x, p1.y, p2.x, p2.y, true);

      this.drawNormal(
        this.ctx,
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
    this.ctx.stroke();

    // Clip walls
    this.ctx.strokeStyle = this.ctx.fillStyle = `rgba(${getEditorColor(this.theme, "clipWalls")},.5)`;
    this.ctx.beginPath();
    clipWalls.forEach(wall => {
      if (wall.rendererMeta.skip) {
        return;
      }
      if (wall.nextWall > -1) {
        this.map.walls[wall.nextWall].rendererMeta.skip = true;
      }

      const pc = this.worldToScreen(
        wall.rendererMeta.centroid.x,
        wall.rendererMeta.centroid.y
      );

      const boundingRadius = wall.rendererMeta.boundingRadius * this._zoom;
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
        this.drawLine(this.ctx, p1.x, p1.y, p2.x, p2.y, true);
      }

      this.drawNormal(
        this.ctx,
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
    this.ctx.stroke();

    // Solid walls
    this.ctx.strokeStyle = this.ctx.fillStyle = `rgba(${getEditorColor(this.theme, "outerWalls")},.8)`;
    this.ctx.beginPath();
    solidWalls.forEach(wall => {
      const pc = this.worldToScreen(
        wall.rendererMeta.centroid.x,
        wall.rendererMeta.centroid.y
      );

      const boundingRadius = wall.rendererMeta.boundingRadius * this._zoom;
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

      this.drawLine(this.ctx, p1.x, p1.y, p2.x, p2.y, true);

      this.drawNormal(
        this.ctx,
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
    this.ctx.stroke();

    // Vertices
    if (this._zoom > this.verticesZoomThreshold) {
      this.ctx.strokeStyle = this.ctx.fillStyle = `rgba(${getEditorColor(this.theme, "vertices")},.75)`;
      this.ctx.beginPath();
      this.map.walls.forEach(wall => {
        if (wall.rendererMeta.clipped || wall.rendererMeta.skip) {
          return;
        }
        const p1 = this.worldToScreen(wall.x, wall.y);
        this.ctx.rect(p1.x - 3, p1.y - 3, 5, 5);
      });
      this.ctx.stroke();
    }

    // Highlighted wall
    if (this.closest && Wall.prototype.isPrototypeOf(this.closest)) {
      this.ctx.strokeStyle = this.ctx.fillStyle =
      `rgba(${getEditorColor(this.theme, "highlighted")},` +
      (Math.sin(new Date().getTime() / 50) * 0.2 + 0.8) +
      ")";
      this.ctx.beginPath();
      const wall = this.closest;
      const p1 = this.worldToScreen(wall.x, wall.y);
      if (this.closest.rendererMeta.highlightedVertex) {
        if (this._zoom > this.verticesZoomThreshold) {
          this.ctx.rect(p1.x - 3, p1.y - 3, 5, 5);
        }
        else {
          this.ctx.rect(p1.x - 1, p1.y - 1, 3, 3);
        }
      }
      else {
        const wall2 = this.map.walls[wall.point2];
        const p2 = this.worldToScreen(wall2.x, wall2.y);
        const pc = this.worldToScreen(
          wall.rendererMeta.centroid.x,
          wall.rendererMeta.centroid.y
        );
        this.drawLine(this.ctx, p1.x, p1.y, p2.x, p2.y, true);
        this.drawNormal(
          this.ctx,
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
          this.ctx,
          normalIndicatorMagnitude,
          normalIndicatorAngle,
          p1.x,
          p1.y,
          p2.x,
          p2.y,
          true
        );
      }
      this.ctx.stroke();
    }

    // Selected vert(ex/ices)
    if (this.selected) {
      const selectedWalls = this.selected.filter(wall => Wall.prototype.isPrototypeOf(wall));
      this.ctx.lineWidth = 2;
      this.ctx.strokeStyle = this.ctx.fillStyle =
        `rgba(${getEditorColor(this.theme, "selected")},` +
        (Math.sin(new Date().getTime() / 50) * 0.2 + 0.8) +
        ")";
      this.ctx.beginPath();
      selectedWalls.forEach(wall => {
        const wall2 = this.map.walls[wall.point2];
        const p1 = this.worldToScreen(wall.x, wall.y);
        const p2 = this.worldToScreen(wall2.x, wall2.y);

        if (this._zoom > this.verticesZoomThreshold) {
          this.ctx.rect(p1.x - 3, p1.y - 3, 5, 5);
        }
        else {
          this.ctx.rect(p1.x - 1, p1.y - 1, 3, 3);
        }

          /*
        else {
          const pc = this.worldToScreen(
            wall.rendererMeta.centroid.x,
            wall.rendererMeta.centroid.y
          );
          this.drawLine(this.ctx, p1.x, p1.y, p2.x, p2.y, true);
          this.drawNormal(
            this.ctx,
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
        }
        */
        this.drawClosestPointOnWall(
          this.ctx,
          normalIndicatorMagnitude,
          normalIndicatorAngle,
          p1.x,
          p1.y,
          p2.x,
          p2.y,
          true
        );
      });
      this.ctx.stroke();
      this.ctx.lineWidth = 1;
    }
  }

  drawSprite(sprite, spriteClipPadding, angleIndicatorMagnitude) {
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

    let size = this._zoom > this.verticesZoomThreshold * 2 ? 5 : 2;

    if (sprite.picNum <= 10) {
      size *= 1.8;
      this.ctx.rect(p.x - size * .5, p.y - size * .5, size, size);
    }
    else {
      this.drawCircle(
        this.ctx,
        p.x,
        p.y,
        size,
        true
      );
    }

    if (this._zoom > this.spriteAnglesZoomThreshold) {
      const rads = sprite.angleRadians;
      this.drawLine(
        this.ctx,
        p.x,
        p.y,
        p.x + angleIndicatorMagnitude * Math.cos(rads),
        p.y + angleIndicatorMagnitude * Math.sin(rads),
        true
      );
    }
  }

  renderSprites(spriteClipPadding, angleIndicatorMagnitude) {
    if (this._zoom <= this.spritesZoomThreshold) {
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
    this.ctx.strokeStyle = this.ctx.fillStyle = `rgba(${getEditorColor(this.theme, "specialSprites")},.8)`;
    this.ctx.beginPath();
    specialSprites.forEach(sprite => {
      this.drawSprite(sprite, spriteClipPadding, angleIndicatorMagnitude);
    });
    this.ctx.stroke();

    // Special sprite radii
    this.ctx.strokeStyle = this.ctx.fillStyle = `rgba(${getEditorColor(this.theme, "specialSprites")},.2)`;
    this.ctx.setLineDash([4, 4]);
    this.ctx.beginPath();
    specialSprites
      .filter(
        sprite =>
          NAMES[sprite.picNum] === "MUSICANDSFX" && !sprite.rendererMeta.clipped
      )
      .forEach(sprite => {
        const p = this.worldToScreen(sprite.x, sprite.y);
        if (
          p.x + sprite.hiTag * this._zoom < -spriteClipPadding ||
          p.y + sprite.hiTag * this._zoom < -spriteClipPadding ||
          p.x - sprite.hiTag * this._zoom > this.width + spriteClipPadding ||
          p.y - sprite.hiTag * this._zoom > this.height + spriteClipPadding
        ) {
          sprite.rendererMeta.clipped = true;
          return;
        }
        this.drawCircle(this.ctx, p.x, p.y, sprite.hiTag * this._zoom, true);
      });
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Normal sprites
    this.ctx.strokeStyle = this.ctx.fillStyle = `rgba(${getEditorColor(this.theme, "sprites")},.8)`;
    this.ctx.beginPath();
    normalSprites.forEach(sprite => {
      this.drawSprite(sprite, spriteClipPadding, angleIndicatorMagnitude);
    });
    this.ctx.stroke();

    // Highlighted sprite
    if (this.closest && Sprite.prototype.isPrototypeOf(this.closest)) {
      const sprite = this.closest;
      this.ctx.strokeStyle = this.ctx.fillStyle =
        `rgba(${getEditorColor(this.theme, "highlighted")},` + (Math.sin(timer / 50) * 0.2 + 0.8) + ")";
      this.ctx.beginPath();
      this.drawSprite(sprite, spriteClipPadding, angleIndicatorMagnitude);
      this.ctx.stroke();

      if (NAMES[sprite.picNum] === "MUSICANDSFX") {
        const p = this.worldToScreen(sprite.x, sprite.y);
        this.ctx.strokeStyle = this.ctx.fillStyle =
          `rgba(${getEditorColor(this.theme, "highlighted")},` + (Math.sin(timer / 50) * 0.05 + 0.2) + ")";
        this.ctx.setLineDash([4, 4]);
        this.ctx.lineDashOffset = (timer / 50) % 8;
        this.ctx.beginPath();
        this.drawCircle(this.ctx, p.x, p.y, sprite.hiTag * this._zoom, true);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        this.ctx.lineDashOffset = 0;
      }
    }

    // Selected sprite(s)
    if (this.selected) {
      const selectedSprites = this.selected.filter(sprite => Sprite.prototype.isPrototypeOf(sprite));
      this.ctx.lineWidth = 2;
      this.ctx.strokeStyle = this.ctx.fillStyle =
      `rgba(${getEditorColor(this.theme, "selected")},` + (Math.sin(timer / 50) * 0.2 + 0.8) + ")";
      this.ctx.beginPath();
      selectedSprites.forEach(sprite => {
        this.drawSprite(sprite, spriteClipPadding, angleIndicatorMagnitude);
  
        if (NAMES[sprite.picNum] === "MUSICANDSFX") {
          const p = this.worldToScreen(sprite.x, sprite.y);
          this.ctx.stroke();
          this.ctx.strokeStyle = this.ctx.fillStyle =
          `rgba(${getEditorColor(this.theme, "selected")},` + (Math.sin(timer / 50) * 0.05 + 0.2) + ")";
          this.ctx.setLineDash([4, 4]);
          this.ctx.lineDashOffset = (timer / 50) % 8;
          this.ctx.beginPath();
          this.drawCircle(this.ctx, p.x, p.y, sprite.hiTag * this._zoom, true);
          this.ctx.stroke();
          this.ctx.setLineDash([]);
          this.ctx.lineDashOffset = 0;
        }
      });
      this.ctx.stroke();
      this.ctx.lineWidth = 1;
    }
  }

  renderPlayer(ctx) {
    const timer = new Date().getTime();
    this.ctx.strokeStyle = this.ctx.fillStyle = `rgba(${getEditorColor(this.theme, "player")},` + (Math.sin(timer / 50) * 0.2 + 0.8) + ")";
    const p1 = this.worldToScreen(this.map.editorMeta.player.x, this.map.editorMeta.player.y);
    this.drawPosition(this.ctx, p1.x, p1.y, this.map.editorMeta.player.angleRadians, 128 * this.zoom);
  }

  updateMapBuffer() {
    const wallClipPadding = 0;
    const spriteClipPadding = 32;
    const angleIndicatorMagnitude = 160 * this._zoom;
    const normalIndicatorMagnitude = 6;
    const mapSize = 131072;

    this.renderGrid(this.ctx, mapSize, this.gridSizeFromZoom());

    this.renderGizmos(this.ctx, mapSize);

    this.renderWalls(wallClipPadding, normalIndicatorMagnitude);

    this.renderSprites(spriteClipPadding, angleIndicatorMagnitude);

    this.ctx.strokeStyle = this.ctx.fillStyle = `rgba(${getEditorColor(this.theme, "gizmos")},` + "1)";
    const p1 = this.worldToScreen(this.map.startPosition.x, this.map.startPosition.y);
    this.drawPosition(this.ctx, p1.x, p1.y, this.map.startPosition.angleRadians, 128 * this.zoom);

    if (this.map.editorMeta.player) {
      this.map.editorMeta.player.update();
      this.renderPlayer(this.ctx);
    }
  }

  gridSizeFromZoom() {
    if (this._zoom > 1) {
      return 8;
    }
    if (this._zoom > 0.5) {
      return 16;
    }
    if (this._zoom > 0.25) {
      return 32;
    }
    if (this._zoom > 0.1) {
      return 64;
    }
    if (this._zoom > 0.05) {
      return 128;
    }
    if (this._zoom > 0.025) {
      return 256;
    }
    if (this._zoom > 0.0125) {
      return 512;
    }
    return 1024;
  }

  updateMetaData() {
    if (!this.map) {
      return;
    }
    this.map.walls.forEach(wall => {
      wall.rendererMeta = {};
      const wall2 = this.map.walls[wall.point2];
      if (wall2) {
        const wall2Pos = wall2.clone();
        const centroid = wall.clone().centroid(wall2Pos);

        wall.rendererMeta.centroid = centroid;
        wall.rendererMeta.boundingRadius = Point2.distance(
          wall.rendererMeta.centroid,
          wall2Pos
        );
      }
    });

    this.map.sectors.forEach(sector => {
      sector.rendererMeta = {};
    });

    this.map.sprites.forEach(sprite => {
      sprite.rendererMeta = {};
    });

    this.metaDirty = false;
  }

  renderGrid(ctx, mapSize, step, majorStep = 8) {
    const gridPadding = 0;
    const gridColor = getEditorColor(this.theme, "grid");
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
    const gizmoColor = getEditorColor(this.theme, "gizmos");
    const gizmoOpacity = 0.2;
    ctx.strokeStyle = ctx.fillStyle =
      "rgba(" + gizmoColor + "," + gizmoOpacity + ")";
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
      ctx.fillStyle = "rgba(" + gizmoColor + "," + gizmoOpacity * 0.25 + ")";
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
    if (this.metaDirty) {
      this.updateMetaData();
    }
    if (this.map) {
      this.ctx.fillStyle = `rgb(${getEditorColor(this.theme, "background")})`;
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.updateMapBuffer();
    }

    requestAnimationFrame(this.render.bind(this));
  }
}
