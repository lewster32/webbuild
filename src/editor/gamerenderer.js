import $ from "jquery";

export default class GameRenderer {
  constructor(canvas) {
    this.debug = true;

    this.canvas = canvas;

    this.ctx = canvas.getContext("2d", { alpha: false });
    this.map = null;

    this.width = $(canvas).width();
    this.height = $(canvas).height();

    this.dirty = true;
  }

  setMap(map) {
    this.map = map;
  }

  updateGameBuffer() {
    if (this.map.startSectorIndex < 0) {
      return;
    }

    // const visibleBunches = findVisibleBunches(this.map.sectors[this.map.startSectorIndex])
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

          // No idea...
          if (cross + 262144 < 524288) {
            sectorsToVisit.add(this.map.sectors[wall.nextSector]);
          }
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