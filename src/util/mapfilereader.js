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

  parseBits(input, flagList) {
    if (typeof input === "undefined") {
      throw new Error("An input value must be provided");
    }
    if (!flagList) {
      throw new Error("A flag list must be provided");
    }
    const output = {};
    flagList.forEach(item => {
      if (!item.name || typeof item.index === "undefined") {
        throw new Error("A name and index must be provided on each flag list item");
      }
      // Create a bit mask for the size of item we're wanting to parse
      // e.g.: 1 = 00000001 = 1, 2 = 00000011 = 3, 4 = 00000111 = 7 etc.
      const mask = ((1 << (item.size || 1)) - 1);

      // Shift the binary value i number of bits to the right so the
      // bits we're interested in are shadowed by the mask bits, then
      // bitwise AND the two values together, e.g:
      //
      // input:       11011001 (217)
      // right shift: 01101100 (108)
      // right shift: 00110110 (54)
      // mask:        00000011 (3)
      // bitwise AND: 00000010 (2)
      let value = (input >> item.index) & mask;

      // Finally, if we're only looking a single bit value, coerce that
      // into a boolean.
      if (!item.size || item.size <= 1) {
        value = !!value;
      }
      output[item.name] = value;
    });
    return output;
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

    this.map.startSectorIndex = read(view.getInt16);

    const numSectors = read(view.getUint16);

    this.map.sectors = new Array(numSectors);
    for (let i = 0; i < numSectors; i++) {
      const sector = new Sector();
      sector.firstWallIndex = read(view.getInt16);
      sector.numWalls = read(view.getInt16);
      sector.ceiling.z = read(view.getInt32);
      sector.floor.z = read(view.getInt32);


      const floorCeilingFlagsMap = [
        { name: "parallaxing", index: 0 },
        { name: "sloped", index: 1 },
        { name: "swapXY", index: 2 },
        { name: "doubleSmooshiness", index: 3 },
        { name: "xFlip", index: 4 },
        { name: "yFlip", index: 5 },
        { name: "alignTextureToFirstWall", index: 6 }
      ];

      const ceilingFlags = read(view.getInt16);
      sector.ceiling.stat = this.parseBits(ceilingFlags, floorCeilingFlagsMap);

      const floorFlags = read(view.getInt16);
      sector.floor.stat = this.parseBits(floorFlags, floorCeilingFlagsMap);

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
      wall.stat = this.parseBits(wallFlags, [
        { name: "blockClipMove", index: 0 },
        { name: "bottomsInvisibleSwapped", index: 1 },
        { name: "alignPictureBottom", index: 2 },
        { name: "xFlip", index: 3 },
        { name: "mask", index: 4 },
        { name: "oneWay", index: 5 },
        { name: "blockHitScan", index: 6 },
        { name: "translucent", index: 7 },
        { name: "yFlip", index: 8 },
        { name: "translucentReverse", index: 9 }
      ]);

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
      sprite.stat = this.parseBits(spriteFlags, [
        { name: "blockClipMove", index: 0 },
        { name: "translucent", index: 1 },
        { name: "xFlip", index: 2 },
        { name: "yFlip", index: 3 },
        { name: "orientation", index: 4, size: 2 },
        { name: "oneSided", index: 6 },
        { name: "realCentered", index: 7 },
        { name: "blockHitScan", index: 8 },
        { name: "translucentReverse", index: 9 },
        { name: "invisible", index: 15 }
      ]);

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