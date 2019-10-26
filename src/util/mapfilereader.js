import Map from '../objects/map';
import Sector from '../objects/sector';
import Wall from '../objects/wall';
import Sprite from '../objects/sprite';

export default class MapFileReader {
  constructor(file, callback) {
    this.callback = callback;
    this.reader = new FileReader();
    this.readFile(file);
  }

  parseFile(result) {
    const view = new DataView(result);

    let dataIndex = 0;

    const read = fn => {
      const bytes = parseInt(fn.name.replace(/[a-z]/gi, ""), 10) / 8;
      const val = fn.call(view, dataIndex, true);
      dataIndex += bytes;
      return val;
    };

    this.map = new Map(read(view.getInt32));
    this.map.startPosition.x = read(view.getInt32);
    this.map.startPosition.y = read(view.getInt32);
    this.map.startPosition.z = read(view.getInt32);
    this.map.startPosition.angle = read(view.getInt16);

    const startSector = read(view.getInt16); // not sure why we need this yet, so just capturing it for the sake of it

    const numSectors = read(view.getUint16);
    const sectorSize = 40,
      wallSize = 32,
      spriteSize = 44;
    this.map.sectors = new Array(numSectors);
    for (let i = 0; i < numSectors; i++) {
      const sector = new Sector();
      sector.firstWallIndex = read(view.getInt16);
      sector.numWalls = read(view.getInt16);
      sector.ceiling.z = read(view.getInt32);
      sector.floor.z = read(view.getInt32);

      const ceilingFlags = read(view.getInt16);
      sector.ceiling.stat.parallaxing = !!(ceilingFlags >> 0);
      sector.ceiling.stat.sloped = !!(ceilingFlags >> 1);
      sector.ceiling.stat.swapXY = !!(ceilingFlags >> 2);
      sector.ceiling.stat.doubleSmooshiness = !!(ceilingFlags >> 3);
      sector.ceiling.stat.xFlip = !!(ceilingFlags >> 4);
      sector.ceiling.stat.yFlip = !!(ceilingFlags >> 5);
      sector.ceiling.stat.alignTextureToFirstWall = !!(ceilingFlags >> 6);

      const floorFlags = read(view.getInt16);
      sector.floor.stat.parallaxing = !!(floorFlags >> 0);
      sector.floor.stat.sloped = !!(floorFlags >> 1);
      sector.floor.stat.swapXY = !!(floorFlags >> 2);
      sector.floor.stat.doubleSmooshiness = !!(floorFlags >> 3);
      sector.floor.stat.xFlip = !!(floorFlags >> 4);
      sector.floor.stat.yFlip = !!(floorFlags >> 5);
      sector.floor.stat.alignTextureToFirstWall = !!(floorFlags >> 6);

      sector.ceiling.picNum = read(view.getInt16);
      sector.ceiling.heightNum = read(view.getInt16);
      sector.ceiling.shade = read(view.getInt8);
      sector.ceiling.palette = read(view.getUint8);
      sector.ceiling.panning.set(read(view.getUint8), read(view.getUint8));

      sector.floor.picNum = read(view.getInt16);
      sector.floor.heightNum = read(view.getInt16);
      sector.floor.shade = read(view.getInt8);
      sector.floor.palette = read(view.getUint8);
      sector.floor.panning.set(read(view.getUint8), read(view.getUint8));

      sector.visibility = read(view.getUint8);

      dataIndex += 1; // padding

      sector.loTag = read(view.getInt16);
      sector.hiTag = read(view.getInt16);
      sector.extra = read(view.getInt16);

      this.map.sectors[i] = sector;
    }

    const numWalls = read(view.getUint16);
    this.map.walls = new Array(numWalls);
    for (let i = 0; i < numWalls; i++) {
      const wall = new Wall(read(view.getInt32), read(view.getInt32));
      wall.point2 = read(view.getInt16);
      wall.nextWall = read(view.getInt16);
      wall.nextSector = read(view.getInt16);

      const wallFlags = read(view.getInt16);
      wall.stat.blockClipMove = !!(wallFlags >> 0);
      wall.stat.bottomsInvisibleSwapped = !!(wallFlags >> 1);
      wall.stat.alignPictureBottom = !!(wallFlags >> 2);
      wall.stat.xFlip = !!(wallFlags >> 3);
      wall.stat.mask = !!(wallFlags >> 4);
      wall.stat.oneWay = !!(wallFlags >> 5);
      wall.stat.blockHitScan = !!(wallFlags >> 6);
      wall.stat.translucent = !!(wallFlags >> 7);
      wall.stat.yFlip = !!(wallFlags >> 8);
      wall.stat.translucentReverse = !!(wallFlags >> 9);

      wall.picNum = read(view.getInt16);
      wall.overPicNum = read(view.getInt16);
      wall.shade = read(view.getUint8);
      wall.palette = read(view.getUint8);
      wall.repeat.set(read(view.getUint8), read(view.getUint8));
      wall.panning.set(read(view.getUint8), read(view.getUint8));
      wall.loTag = read(view.getInt16);
      wall.hiTag = read(view.getInt16);
      wall.extra = read(view.getInt16);

      this.map.walls[i] = wall;
    }

    const numSprites = read(view.getUint16);
    this.map.sprites = new Array(numSprites);
    for (let i = 0; i < numSprites; i++) {
      const sprite = new Sprite(
        read(view.getInt32),
        read(view.getInt32),
        read(view.getInt32)
      );

      const spriteFlags = read(view.getInt16);

      sprite.picNum = read(view.getInt16);
      sprite.shade = read(view.getInt8);
      sprite.palette = read(view.getUint8);
      sprite.clipDistance = read(view.getUint8);

      dataIndex += 1; // padding

      sprite.repeat.set(read(view.getUint8), read(view.getUint8));
      sprite.offset.set(read(view.getInt8), read(view.getInt8));
      sprite.currentSectorIndex = read(view.getInt16);
      sprite.currentStatus = read(view.getInt16);
      sprite.angle = read(view.getInt16);
      sprite.owner = read(view.getInt16);

      sprite.velocity.set(
        read(view.getInt16),
        read(view.getInt16),
        read(view.getInt16)
      );

      sprite.loTag = read(view.getInt16);
      sprite.hiTag = read(view.getInt16);
      sprite.extra = read(view.getInt16);

      this.map.sprites[i] = sprite;
    }

    // Log out the info for now
    console.log(this.map);

    // Call the callback with the parsed map
    if (this.callback && typeof this.callback === "function") {
      this.callback(this.map);
    }
  }

  readFile(file) {
    this.reader.onload = () => {
      this.parseFile(this.reader.result);
    };

    this.reader.readAsArrayBuffer(file);
  }
};