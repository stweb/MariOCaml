const types = new Map();
function setType(fullName, cons) {
    types.set(fullName, cons);
}

var _Symbol = {
    reflection: Symbol("reflection")
};

class NonDeclaredType {
    constructor(kind, definition, generics) {
        this.kind = kind;
        this.definition = definition;
        this.generics = generics;
    }
    Equals(other) {
        if (this.kind === other.kind && this.definition === other.definition) {
            return typeof this.generics === "object"
                ? equalsRecords(this.generics, other.generics)
                : this.generics === other.generics;
        }
        return false;
    }
}
const Any = new NonDeclaredType("Any");
const Unit = new NonDeclaredType("Unit");

function Tuple(types) {
    return new NonDeclaredType("Tuple", null, types);
}

function Interface(definition) {
    return new NonDeclaredType("Interface", definition);
}




function hasInterface(obj, interfaceName) {
    if (interfaceName === "System.Collections.Generic.IEnumerable") {
        return typeof obj[Symbol.iterator] === "function";
    }
    else if (typeof obj[_Symbol.reflection] === "function") {
        const interfaces = obj[_Symbol.reflection]().interfaces;
        return Array.isArray(interfaces) && interfaces.indexOf(interfaceName) > -1;
    }
    return false;
}
function getPropertyNames(obj) {
    if (obj == null) {
        return [];
    }
    const propertyMap = typeof obj[_Symbol.reflection] === "function" ? obj[_Symbol.reflection]().properties || [] : obj;
    return Object.getOwnPropertyNames(propertyMap);
}

function toString(obj, quoteStrings = false) {
    function isObject(x) {
        return x !== null && typeof x === "object" && !(x instanceof Number) && !(x instanceof String) && !(x instanceof Boolean);
    }
    if (obj == null || typeof obj === "number") {
        return String(obj);
    }
    if (typeof obj === "string") {
        return quoteStrings ? JSON.stringify(obj) : obj;
    }
    if (typeof obj.ToString == "function") {
        return obj.ToString();
    }
    if (hasInterface(obj, "FSharpUnion")) {
        const info = obj[_Symbol.reflection]();
        const uci = info.cases[obj.tag];
        switch (uci.length) {
            case 1:
                return uci[0];
            case 2:
                return uci[0] + " (" + toString(obj.data, true) + ")";
            default:
                return uci[0] + " (" + obj.data.map((x) => toString(x, true)).join(",") + ")";
        }
    }
    try {
        return JSON.stringify(obj, function (k, v) {
            return v && v[Symbol.iterator] && !Array.isArray(v) && isObject(v) ? Array.from(v)
                : v && typeof v.ToString === "function" ? toString(v) : v;
        });
    }
    catch (err) {
        return "{" + Object.getOwnPropertyNames(obj).map(k => k + ": " + String(obj[k])).join(", ") + "}";
    }
}
function hash(x) {
    if (x != null && typeof x.GetHashCode == "function") {
        return x.GetHashCode();
    }
    else {
        let s = JSON.stringify(x);
        let h = 5381, i = 0, len = s.length;
        while (i < len) {
            h = (h * 33) ^ s.charCodeAt(i++);
        }
        return h;
    }
}
function equals(x, y) {
    if (x === y)
        return true;
    else if (x == null)
        return y == null;
    else if (y == null)
        return false;
    else if (Object.getPrototypeOf(x) !== Object.getPrototypeOf(y))
        return false;
    else if (typeof x.Equals === "function")
        return x.Equals(y);
    else if (Array.isArray(x)) {
        if (x.length != y.length)
            return false;
        for (let i = 0; i < x.length; i++)
            if (!equals(x[i], y[i]))
                return false;
        return true;
    }
    else if (ArrayBuffer.isView(x)) {
        if (x.byteLength !== y.byteLength)
            return false;
        const dv1 = new DataView(x.buffer), dv2 = new DataView(y.buffer);
        for (let i = 0; i < x.byteLength; i++)
            if (dv1.getUint8(i) !== dv2.getUint8(i))
                return false;
        return true;
    }
    else if (x instanceof Date)
        return x.getTime() === y.getTime();
    else
        return false;
}

function compare(x, y) {
    if (x === y)
        return 0;
    if (x == null)
        return y == null ? 0 : -1;
    else if (y == null)
        return 1;
    else if (Object.getPrototypeOf(x) !== Object.getPrototypeOf(y))
        return -1;
    else if (typeof x.CompareTo === "function")
        return x.CompareTo(y);
    else if (Array.isArray(x)) {
        if (x.length != y.length)
            return x.length < y.length ? -1 : 1;
        for (let i = 0, j = 0; i < x.length; i++)
            if ((j = compare(x[i], y[i])) !== 0)
                return j;
        return 0;
    }
    else if (ArrayBuffer.isView(x)) {
        if (x.byteLength != y.byteLength)
            return x.byteLength < y.byteLength ? -1 : 1;
        const dv1 = new DataView(x.buffer), dv2 = new DataView(y.buffer);
        for (let i = 0, b1 = 0, b2 = 0; i < x.byteLength; i++) {
            b1 = dv1.getUint8(i), b2 = dv2.getUint8(i);
            if (b1 < b2)
                return -1;
            if (b1 > b2)
                return 1;
        }
        return 0;
    }
    else if (x instanceof Date) {
        let xtime = x.getTime(), ytime = y.getTime();
        return xtime === ytime ? 0 : (xtime < ytime ? -1 : 1);
    }
    else if (typeof x === "object") {
        let xhash = hash(x), yhash = hash(y);
        if (xhash === yhash) {
            return equals(x, y) ? 0 : -1;
        }
        else {
            return xhash < yhash ? -1 : 1;
        }
    }
    else
        return x < y ? -1 : 1;
}
function equalsRecords(x, y) {
    if (x === y) {
        return true;
    }
    else {
        const keys = getPropertyNames(x);
        for (let i = 0; i < keys.length; i++) {
            if (!equals(x[keys[i]], y[keys[i]]))
                return false;
        }
        return true;
    }
}
function compareRecords(x, y) {
    if (x === y) {
        return 0;
    }
    else {
        const keys = getPropertyNames(x);
        for (let i = 0; i < keys.length; i++) {
            let res = compare(x[keys[i]], y[keys[i]]);
            if (res !== 0)
                return res;
        }
        return 0;
    }
}

function compareUnions(x, y) {
    if (x === y) {
        return 0;
    }
    else {
        let res = x.tag < y.tag ? -1 : (x.tag > y.tag ? 1 : 0);
        return res !== 0 ? res : compare(x.data, y.data);
    }
}

const canvas = document.getElementsByTagName("canvas")[0];
const context = canvas.getContext("2d");
class sprite_params {
  constructor(max_frames, max_ticks, img_src, frame_size, src_offset, bbox_offset, bbox_size, loop) {
    this.max_frames = max_frames | 0;
    this.max_ticks = max_ticks | 0;
    this.img_src = img_src;
    this.frame_size = frame_size;
    this.src_offset = src_offset;
    this.bbox_offset = bbox_offset;
    this.bbox_size = bbox_size;
    this.loop = loop;
  }

  [_Symbol.reflection]() {
    return {
      type: "Sprite.sprite_params",
      interfaces: ["FSharpRecord", "System.IEquatable", "System.IComparable"],
      properties: {
        max_frames: "number",
        max_ticks: "number",
        img_src: "string",
        frame_size: Tuple(["number", "number"]),
        src_offset: Tuple(["number", "number"]),
        bbox_offset: Tuple(["number", "number"]),
        bbox_size: Tuple(["number", "number"]),
        loop: "boolean"
      }
    };
  }

  Equals(other) {
    return equalsRecords(this, other);
  }

  CompareTo(other) {
    return compareRecords(this, other) | 0;
  }

}
setType("Sprite.sprite_params", sprite_params);
class sprite {
  constructor(param, context, frame, ticks, img) {
    this.param = param;
    this.context = context;
    this.frame = frame;
    this.ticks = ticks;
    this.img = img;
  }

  [_Symbol.reflection]() {
    return {
      type: "Sprite.sprite",
      interfaces: ["FSharpRecord", "System.IEquatable"],
      properties: {
        param: sprite_params,
        context: Interface("Fable.Import.Browser.CanvasRenderingContext2D"),
        frame: Any,
        ticks: Any,
        img: Interface("Fable.Import.Browser.HTMLImageElement")
      }
    };
  }

  Equals(other) {
    return equalsRecords(this, other);
  }

}
setType("Sprite.sprite", sprite);

function setup_sprite(img_src, bb_off_0, bb_off_1, bb_sz, max_frames, max_ticks, frame_size_0, frame_size_1, src_offset_0, src_offset_1) {
  const bb_off = [bb_off_0, bb_off_1];
  const frame_size = [frame_size_0, frame_size_1];
  const src_offset = [src_offset_0, src_offset_1];
  const img_src_1 = "./sprites/" + img_src;
  return new sprite_params(max_frames, max_ticks, img_src_1, frame_size, src_offset, bb_off, frame_size, true);
}
function setup_sprite2(img_src, max_frames, max_ticks, frame_size_0, frame_size_1, src_offset_0, src_offset_1) {
  const frame_size = [frame_size_0, frame_size_1];
  const src_offset = [src_offset_0, src_offset_1];
  const tupledArg = [0, 0];
  return setup_sprite(img_src, tupledArg[0], tupledArg[1], frame_size, max_frames, max_ticks, frame_size[0], frame_size[1], src_offset[0], src_offset[1]);
}
function make_small_player(typ, dir) {
  if (dir.tag === 1) {
    if (typ.tag === 1) {
      return setup_sprite("mario-small.png", 2, 1, [13, 15], 2, 10, 16, 16, 16, 48);
    } else if (typ.tag === 2) {
      return setup_sprite("mario-small.png", 2, 1, [12, 15], 3, 5, 16, 16, 16, 32);
    } else if (typ.tag === 3) {
      return setup_sprite("mario-small.png", 1, 5, [14, 10], 1, 0, 16, 16, 0, 64);
    } else {
      return setup_sprite("mario-small.png", 1, 1, [11, 15], 1, 0, 16, 16, 0, 32);
    }
  } else if (typ.tag === 1) {
    return setup_sprite("mario-small.png", 2, 1, [13, 15], 2, 10, 16, 16, 16, 16);
  } else if (typ.tag === 2) {
    return setup_sprite("mario-small.png", 2, 1, [12, 15], 3, 5, 16, 16, 16, 0);
  } else if (typ.tag === 3) {
    return setup_sprite("mario-small.png", 1, 5, [14, 10], 1, 0, 16, 16, 0, 64);
  } else {
    return setup_sprite("mario-small.png", 3, 1, [11, 15], 1, 0, 16, 16, 0, 0);
  }
}
function make_big_player(typ, dir) {
  if (dir.tag === 1) {
    if (typ.tag === 1) {
      return setup_sprite("mario-big.png", 2, 1, [12, 25], 1, 0, 16, 26, 48, 70);
    } else if (typ.tag === 2) {
      return setup_sprite("mario-big.png", 2, 1, [13, 25], 4, 10, 16, 27, 0, 101);
    } else if (typ.tag === 3) {
      return setup_sprite("mario-big.png", 2, 10, [13, 17], 1, 0, 16, 27, 32, 69);
    } else {
      return setup_sprite("mario-big.png", 1, 1, [13, 25], 1, 0, 16, 26, 16, 69);
    }
  } else if (typ.tag === 1) {
    return setup_sprite("mario-big.png", 2, 1, [12, 25], 1, 0, 16, 26, 48, 6);
  } else if (typ.tag === 2) {
    return setup_sprite("mario-big.png", 2, 1, [13, 25], 4, 10, 16, 27, 0, 37);
  } else if (typ.tag === 3) {
    return setup_sprite("mario-big.png", 2, 10, [13, 17], 1, 0, 16, 27, 32, 5);
  } else {
    return setup_sprite("mario-big.png", 2, 1, [13, 25], 1, 0, 16, 27, 16, 5);
  }
}
function make_enemy(typ, dir) {
  const matchValue = [typ, dir];

  if (matchValue[0].tag === 1) {
    if (matchValue[1].tag === 1) {
      return setup_sprite("enemies.png", 1, 10, [11, 16], 2, 10, 16, 27, 32, 69);
    } else {
      return setup_sprite("enemies.png", 4, 10, [11, 16], 2, 10, 16, 27, 0, 69);
    }
  } else if (matchValue[0].tag === 2) {
    if (matchValue[1].tag === 1) {
      return setup_sprite("enemies.png", 1, 10, [11, 16], 2, 10, 16, 27, 32, 5);
    } else {
      return setup_sprite("enemies.png", 4, 10, [11, 16], 2, 10, 16, 27, 0, 5);
    }
  } else if (matchValue[0].tag === 3) {
    return setup_sprite("enemies.png", 2, 2, [12, 13], 4, 10, 16, 16, 0, 96);
  } else if (matchValue[0].tag === 4) {
    return setup_sprite("enemies.png", 2, 2, [12, 13], 4, 10, 16, 16, 0, 32);
  } else {
    return setup_sprite("enemies.png", 1, 1, [14, 14], 2, 10, 16, 16, 0, 128);
  }
}
function make_item(_arg1) {
  if (_arg1.tag === 1) {
    return setup_sprite2("items.png", 1, 0, 16, 16, 0, 188);
  } else if (_arg1.tag === 0) {
    return setup_sprite("items.png", 2, 0, [12, 16], 1, 0, 16, 16, 0, 0);
  } else if (_arg1.tag === 2) {
    return setup_sprite2("items.png", 1, 0, 16, 16, 16, 48);
  } else {
    return setup_sprite("items.png", 3, 0, [12, 16], 3, 15, 16, 16, 0, 80);
  }
}
function make_block(_arg1) {
  if (_arg1.tag === 0) {
    return setup_sprite2("blocks.png", 4, 15, 16, 16, 0, 16);
  } else if (_arg1.tag === 1) {
    return setup_sprite2("blocks.png", 1, 0, 16, 16, 0, 32);
  } else if (_arg1.tag === 3) {
    return setup_sprite2("blocks.png", 1, 0, 16, 16, 0, 48);
  } else if (_arg1.tag === 4) {
    return setup_sprite2("blocks.png", 1, 0, 16, 16, 0, 64);
  } else if (_arg1.tag === 5) {
    return setup_sprite2("panel.png", 3, 15, 26, 26, 0, 0);
  } else if (_arg1.tag === 6) {
    return setup_sprite2("ground.png", 1, 0, 16, 16, 0, 32);
  } else {
    return setup_sprite2("blocks.png", 5, 10, 16, 16, 0, 0);
  }
}
function make_particle2(_arg1) {
  if (_arg1.tag === 1) {
    return setup_sprite2("chunks.png", 1, 0, 8, 8, 0, 0);
  } else if (_arg1.tag === 2) {
    return setup_sprite2("chunks.png", 1, 0, 8, 8, 8, 0);
  } else if (_arg1.tag === 3) {
    return setup_sprite2("score.png", 1, 0, 12, 8, 0, 0);
  } else if (_arg1.tag === 4) {
    return setup_sprite2("score.png", 1, 0, 12, 9, 0, 9);
  } else if (_arg1.tag === 5) {
    return setup_sprite2("score.png", 1, 0, 12, 9, 0, 18);
  } else if (_arg1.tag === 6) {
    return setup_sprite2("score.png", 1, 0, 12, 9, 0, 27);
  } else if (_arg1.tag === 7) {
    return setup_sprite2("score.png", 1, 0, 14, 9, 13, 0);
  } else if (_arg1.tag === 8) {
    return setup_sprite2("score.png", 1, 0, 14, 9, 13, 9);
  } else if (_arg1.tag === 9) {
    return setup_sprite2("score.png", 1, 0, 14, 9, 13, 18);
  } else if (_arg1.tag === 10) {
    return setup_sprite2("score.png", 1, 0, 14, 9, 13, 27);
  } else {
    return setup_sprite2("enemies.png", 1, 0, 16, 16, 0, 144);
  }
}
function make_player(pt, spr_type_0, spr_type_1) {
  const spr_type = [spr_type_0, spr_type_1];

  if (pt.tag === 1) {
    return make_small_player(spr_type[0], spr_type[1]);
  } else {
    return make_big_player(spr_type[0], spr_type[1]);
  }
}
function make_type(typ, dir) {
  if (typ.tag === 1) {
    return make_enemy(typ.data, dir);
  } else if (typ.tag === 2) {
    return make_item(typ.data);
  } else if (typ.tag === 3) {
    return make_block(typ.data);
  } else {
    return make_player(typ.data[0], typ.data[1], dir);
  }
}
function make_from_params(param, context_1) {
  const img = document.createElement("img");
  img.src = param.img_src;
  return new sprite(param, context_1, {
    contents: 0
  }, {
    contents: 0
  }, img);
}
function make(spawn, dir, context_1) {
  const param = make_type(spawn, dir);
  return make_from_params(param, context_1);
}
function make_bgd(context_1) {
  const param = setup_sprite2("bgd-1.png", 1, 0, 512, 256, 0, 0);
  return make_from_params(param, context_1);
}
function make_particle(ptyp, context_1) {
  const param = make_particle2(ptyp);
  return make_from_params(param, context_1);
}
function update_animation(spr) {
  const curr_ticks = spr.ticks.contents | 0;

  if (curr_ticks >= spr.param.max_ticks) {
    spr.ticks.contents = 0;

    if (spr.param.loop) {
      spr.frame.contents = (spr.frame.contents + 1) % spr.param.max_frames | 0;
    }
  } else {
    spr.ticks.contents = curr_ticks + 1 | 0;
  }
}
function transform_enemy(enemy_typ, spr, dir) {
  const para = make_enemy(enemy_typ, dir);
  const img = document.createElement("img");
  img.src = para.img_src;
  spr.param = para;
  spr.img = img;
}

class dir_1d {
  constructor(tag, data) {
    this.tag = tag;
    this.data = data;
  }

  [_Symbol.reflection]() {
    return {
      type: "Actors.dir_1d",
      interfaces: ["FSharpUnion", "System.IEquatable", "System.IComparable"],
      cases: [["Left"], ["Right"]]
    };
  }

  Equals(other) {
    return this === other || this.tag === other.tag && equals(this.data, other.data);
  }

  CompareTo(other) {
    return compareUnions(this, other) | 0;
  }

}
setType("Actors.dir_1d", dir_1d);
class dir_2d {
  constructor(tag, data) {
    this.tag = tag;
    this.data = data;
  }

  [_Symbol.reflection]() {
    return {
      type: "Actors.dir_2d",
      interfaces: ["FSharpUnion", "System.IEquatable", "System.IComparable"],
      cases: [["North"], ["South"], ["East"], ["West"]]
    };
  }

  Equals(other) {
    return this === other || this.tag === other.tag && equals(this.data, other.data);
  }

  CompareTo(other) {
    return compareUnions(this, other) | 0;
  }

}
setType("Actors.dir_2d", dir_2d);
function eq_dir_1d(x, y) {
  if (x.tag === 1) {
    return y.Equals(new dir_1d(1));
  } else {
    return y.Equals(new dir_1d(0));
  }
}
class xy {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  [_Symbol.reflection]() {
    return {
      type: "Actors.xy",
      interfaces: ["FSharpRecord", "System.IEquatable", "System.IComparable"],
      properties: {
        x: "number",
        y: "number"
      }
    };
  }

  Equals(other) {
    return equalsRecords(this, other);
  }

  CompareTo(other) {
    return compareRecords(this, other) | 0;
  }

}
setType("Actors.xy", xy);
class controls {
  constructor(tag, data) {
    this.tag = tag;
    this.data = data;
  }

  [_Symbol.reflection]() {
    return {
      type: "Actors.controls",
      interfaces: ["FSharpUnion", "System.IEquatable", "System.IComparable"],
      cases: [["CLeft"], ["CRight"], ["CUp"], ["CDown"]]
    };
  }

  Equals(other) {
    return this === other || this.tag === other.tag && equals(this.data, other.data);
  }

  CompareTo(other) {
    return compareUnions(this, other) | 0;
  }

}
setType("Actors.controls", controls);
class pl_typ {
  constructor(tag, data) {
    this.tag = tag;
    this.data = data;
  }

  [_Symbol.reflection]() {
    return {
      type: "Actors.pl_typ",
      interfaces: ["FSharpUnion", "System.IEquatable", "System.IComparable"],
      cases: [["BigM"], ["SmallM"]]
    };
  }

  Equals(other) {
    return this === other || this.tag === other.tag && equals(this.data, other.data);
  }

  CompareTo(other) {
    return compareUnions(this, other) | 0;
  }

}
setType("Actors.pl_typ", pl_typ);
class item_typ {
  constructor(tag, data) {
    this.tag = tag;
    this.data = data;
  }

  [_Symbol.reflection]() {
    return {
      type: "Actors.item_typ",
      interfaces: ["FSharpUnion", "System.IEquatable", "System.IComparable"],
      cases: [["Mushroom"], ["FireFlower"], ["Star"], ["Coin"]]
    };
  }

  Equals(other) {
    return this === other || this.tag === other.tag && equals(this.data, other.data);
  }

  CompareTo(other) {
    return compareUnions(this, other) | 0;
  }

}
setType("Actors.item_typ", item_typ);
class enemy_typ {
  constructor(tag, data) {
    this.tag = tag;
    this.data = data;
  }

  [_Symbol.reflection]() {
    return {
      type: "Actors.enemy_typ",
      interfaces: ["FSharpUnion", "System.IEquatable", "System.IComparable"],
      cases: [["Goomba"], ["GKoopa"], ["RKoopa"], ["GKoopaShell"], ["RKoopaShell"]]
    };
  }

  Equals(other) {
    return this === other || this.tag === other.tag && equals(this.data, other.data);
  }

  CompareTo(other) {
    return compareUnions(this, other) | 0;
  }

}
setType("Actors.enemy_typ", enemy_typ);
class block_typ {
  constructor(tag, data) {
    this.tag = tag;
    this.data = data;
  }

  [_Symbol.reflection]() {
    return {
      type: "Actors.block_typ",
      interfaces: ["FSharpUnion", "System.IEquatable", "System.IComparable"],
      cases: [["QBlock", item_typ], ["QBlockUsed"], ["Brick"], ["UnBBlock"], ["Cloud"], ["Panel"], ["Ground"]]
    };
  }

  Equals(other) {
    return this === other || this.tag === other.tag && equals(this.data, other.data);
  }

  CompareTo(other) {
    return compareUnions(this, other) | 0;
  }

}
setType("Actors.block_typ", block_typ);
class player_typ {
  constructor(tag, data) {
    this.tag = tag;
    this.data = data;
  }

  [_Symbol.reflection]() {
    return {
      type: "Actors.player_typ",
      interfaces: ["FSharpUnion", "System.IEquatable", "System.IComparable"],
      cases: [["Standing"], ["Jumping"], ["Running"], ["Crouching"]]
    };
  }

  Equals(other) {
    return this === other || this.tag === other.tag && equals(this.data, other.data);
  }

  CompareTo(other) {
    return compareUnions(this, other) | 0;
  }

}
setType("Actors.player_typ", player_typ);
class part_typ {
  constructor(tag, data) {
    this.tag = tag;
    this.data = data;
  }

  [_Symbol.reflection]() {
    return {
      type: "Actors.part_typ",
      interfaces: ["FSharpUnion", "System.IEquatable", "System.IComparable"],
      cases: [["GoombaSquish"], ["BrickChunkL"], ["BrickChunkR"], ["Score100"], ["Score200"], ["Score400"], ["Score800"], ["Score1000"], ["Score2000"], ["Score4000"], ["Score8000"]]
    };
  }

  Equals(other) {
    return this === other || this.tag === other.tag && equals(this.data, other.data);
  }

  CompareTo(other) {
    return compareUnions(this, other) | 0;
  }

}
setType("Actors.part_typ", part_typ);
class spawn_typ {
  constructor(tag, data) {
    this.tag = tag;
    this.data = data;
  }

  [_Symbol.reflection]() {
    return {
      type: "Actors.spawn_typ",
      interfaces: ["FSharpUnion", "System.IEquatable", "System.IComparable"],
      cases: [["SPlayer", pl_typ, player_typ], ["SEnemy", enemy_typ], ["SItem", item_typ], ["SBlock", block_typ]]
    };
  }

  Equals(other) {
    return this === other || this.tag === other.tag && equals(this.data, other.data);
  }

  CompareTo(other) {
    return compareUnions(this, other) | 0;
  }

}
setType("Actors.spawn_typ", spawn_typ);

function eq_checkloc(a0, a1, b0, b1) {
  if (a0 === b0) {
    return a1 === b1;
  } else {
    return false;
  }
}
function max_float(a, b) {
  if (a > b) {
    return a;
  } else {
    return b;
  }
}
function min_float(a, b) {
  if (a < b) {
    return a;
  } else {
    return b;
  }
}

class viewport {
  constructor(pos, v_dim, m_dim) {
    this.pos = pos;
    this.v_dim = v_dim;
    this.m_dim = m_dim;
  }

  [_Symbol.reflection]() {
    return {
      type: "Viewport.viewport",
      interfaces: ["FSharpRecord", "System.IEquatable", "System.IComparable"],
      properties: {
        pos: xy,
        v_dim: xy,
        m_dim: xy
      }
    };
  }

  Equals(other) {
    return equalsRecords(this, other);
  }

  CompareTo(other) {
    return compareRecords(this, other) | 0;
  }

}
setType("Viewport.viewport", viewport);
function make$1(vx, vy, mx, my) {
  return new viewport(new xy(0, 0), new xy(vx, vy), new xy(mx, my));
}
function calc_viewport_point(cc, vc, mc) {
  const vc_half = vc / 2;
  return min_float(max_float(cc - vc_half, 0), min_float(mc - vc, Math.abs(cc - vc_half)));
}
function in_viewport(v, pos) {
  const patternInput = [v.pos.x - 32, v.pos.x + v.v_dim.x];
  const patternInput_1 = [v.pos.y - 32, v.pos.y + v.v_dim.y];
  const patternInput_2 = [pos.x, pos.y];

  if ((patternInput_2[0] >= patternInput[0] ? patternInput_2[0] <= patternInput[1] : false) ? patternInput_2[1] >= patternInput_1[0] : false) {
    return patternInput_2[1] <= patternInput_1[1];
  } else {
    return false;
  }
}
function out_of_viewport_below(v, y) {
  const v_max_y = v.pos.y + v.v_dim.y;
  return y >= v_max_y;
}
function coord_to_viewport(viewport_1, coord) {
  return new xy(coord.x - viewport_1.pos.x, coord.y - viewport_1.pos.y);
}
function update(vpt, ctr) {
  const new_x = calc_viewport_point(ctr.x, vpt.v_dim.x, vpt.m_dim.x);
  const new_y = calc_viewport_point(ctr.y, vpt.v_dim.y, vpt.m_dim.y);
  return new viewport(new xy(new_x, new_y), vpt.v_dim, vpt.m_dim);
}

function ofArray(args, base) {
    let acc = base || new List$1();
    for (let i = args.length - 1; i >= 0; i--) {
        acc = new List$1(args[i], acc);
    }
    return acc;
}
class List$1 {
    constructor(head, tail) {
        this.head = head;
        this.tail = tail;
    }
    ToString() {
        return "[" + Array.from(this).map(x => toString(x)).join("; ") + "]";
    }
    Equals(x) {
        if (this === x) {
            return true;
        }
        else {
            const iter1 = this[Symbol.iterator](), iter2 = x[Symbol.iterator]();
            for (;;) {
                let cur1 = iter1.next(), cur2 = iter2.next();
                if (cur1.done)
                    return cur2.done ? true : false;
                else if (cur2.done)
                    return false;
                else if (!equals(cur1.value, cur2.value))
                    return false;
            }
        }
    }
    CompareTo(x) {
        if (this === x) {
            return 0;
        }
        else {
            let acc = 0;
            const iter1 = this[Symbol.iterator](), iter2 = x[Symbol.iterator]();
            for (;;) {
                let cur1 = iter1.next(), cur2 = iter2.next();
                if (cur1.done)
                    return cur2.done ? acc : -1;
                else if (cur2.done)
                    return 1;
                else {
                    acc = compare(cur1.value, cur2.value);
                    if (acc != 0)
                        return acc;
                }
            }
        }
    }
    get length() {
        let cur = this, acc = 0;
        while (cur.tail != null) {
            cur = cur.tail;
            acc++;
        }
        return acc;
    }
    [Symbol.iterator]() {
        let cur = this;
        return {
            next: () => {
                const tmp = cur;
                cur = cur.tail;
                return { done: tmp.tail == null, value: tmp.head };
            }
        };
    }
    [_Symbol.reflection]() {
        return {
            type: "Microsoft.FSharp.Collections.FSharpList",
            interfaces: ["System.IEquatable", "System.IComparable"]
        };
    }
}

function fold(f, acc, xs) {
    if (Array.isArray(xs) || ArrayBuffer.isView(xs)) {
        return xs.reduce(f, acc);
    }
    else {
        let cur;
        for (let i = 0, iter = xs[Symbol.iterator]();; i++) {
            cur = iter.next();
            if (cur.done)
                break;
            acc = f(acc, cur.value, i);
        }
        return acc;
    }
}











function iterate(f, xs) {
    fold((_, x) => f(x), null, xs);
}

function append$$1(xs, ys) {
    return fold((acc, x) => new List$1(x, acc), ys, reverse$$1(xs));
}



function filter$$1(f, xs) {
    return reverse$$1(fold((acc, x) => f(x) ? new List$1(x, acc) : acc, new List$1(), xs));
}






function reverse$$1(xs) {
    return fold((acc, x) => new List$1(x, acc), new List$1(), xs);
}

class part_params {
  constructor(sprite$$1, rot, lifetime) {
    this.sprite = sprite$$1;
    this.rot = rot;
    this.lifetime = lifetime | 0;
  }

  [_Symbol.reflection]() {
    return {
      type: "Particle.part_params",
      interfaces: ["FSharpRecord", "System.IEquatable"],
      properties: {
        sprite: sprite,
        rot: "number",
        lifetime: "number"
      }
    };
  }

  Equals(other) {
    return equalsRecords(this, other);
  }

}
setType("Particle.part_params", part_params);
class particle {
  constructor(param, part_type, pos, vel, acc, kill, life) {
    this.param = param;
    this.part_type = part_type;
    this.pos = pos;
    this.vel = vel;
    this.acc = acc;
    this.kill = kill;
    this.life = life | 0;
  }

  [_Symbol.reflection]() {
    return {
      type: "Particle.particle",
      interfaces: ["FSharpRecord", "System.IEquatable"],
      properties: {
        param: part_params,
        part_type: part_typ,
        pos: xy,
        vel: xy,
        acc: xy,
        kill: "boolean",
        life: "number"
      }
    };
  }

  Equals(other) {
    return equalsRecords(this, other);
  }

}
setType("Particle.particle", particle);
function pair_to_xy(pair_0, pair_1) {
  const pair = [pair_0, pair_1];
  return new xy(pair[0], pair[1]);
}
function make_params(s, r, l) {
  return new part_params(s, r, l);
}
function make_type$2(typ, ctx) {
  if (typ.tag === 1) {
    return make_params(make_particle(typ, ctx), 0, 300);
  } else if (typ.tag === 2) {
    return make_params(make_particle(typ, ctx), 0, 300);
  } else if (typ.tag === 3) {
    return make_params(make_particle(typ, ctx), 0, 30);
  } else if (typ.tag === 4) {
    return make_params(make_particle(typ, ctx), 0, 30);
  } else if (typ.tag === 5) {
    return make_params(make_particle(typ, ctx), 0, 30);
  } else if (typ.tag === 6) {
    return make_params(make_particle(typ, ctx), 0, 30);
  } else if (typ.tag === 7) {
    return make_params(make_particle(typ, ctx), 0, 30);
  } else if (typ.tag === 8) {
    return make_params(make_particle(typ, ctx), 0, 30);
  } else if (typ.tag === 9) {
    return make_params(make_particle(typ, ctx), 0, 30);
  } else if (typ.tag === 10) {
    return make_params(make_particle(typ, ctx), 0, 30);
  } else {
    return make_params(make_particle(typ, ctx), 0, 30);
  }
}
function make$3(vel_0, vel_1, acc_0, acc_1, t, pos_0, pos_1, ctx) {
  const vel = [vel_0, vel_1];
  const acc = [acc_0, acc_1];
  const pos = [pos_0, pos_1];
  const p = make_type$2(t, ctx);
  return new particle(p, t, pair_to_xy(pos[0], pos[1]), pair_to_xy(vel[0], vel[1]), pair_to_xy(acc[0], acc[1]), false, p.lifetime);
}
function make0(t, pos_0, pos_1, ctx) {
  const pos = [pos_0, pos_1];
  const tupledArg = [0, 0];
  const tupledArg_1 = [0, 0];
  return make$3(tupledArg[0], tupledArg[1], tupledArg_1[0], tupledArg_1[1], t, pos[0], pos[1], ctx);
}
function make_score(score, pos_0, pos_1, ctx) {
  const pos = [pos_0, pos_1];
  let t;

  switch (score) {
    case 100:
      t = new part_typ(3);
      break;

    case 200:
      t = new part_typ(4);
      break;

    case 400:
      t = new part_typ(5);
      break;

    case 800:
      t = new part_typ(6);
      break;

    case 1000:
      t = new part_typ(7);
      break;

    case 2000:
      t = new part_typ(8);
      break;

    case 4000:
      t = new part_typ(9);
      break;

    case 8000:
      t = new part_typ(10);
      break;

    default:
      t = new part_typ(3);
  }

  const tupledArg = [0.5, -0.7];
  const tupledArg_1 = [0, 0];
  return make$3(tupledArg[0], tupledArg[1], tupledArg_1[0], tupledArg_1[1], t, pos[0], pos[1], ctx);
}
function update_vel$1(part) {
  part.vel.x = part.vel.x + part.acc.x;
  part.vel.y = part.vel.y + part.acc.y;
}
function update_pos$1(part) {
  part.pos.x = part.vel.x + part.pos.x;
  part.pos.y = part.vel.y + part.pos.y;
}
function proc(part) {
  part.life = part.life - 1 | 0;

  if (part.life === 0) {
    part.kill = true;
  }

  update_vel$1(part);
  update_pos$1(part);
}

const friction = 0.9;
const gravity = 0.2;
const max_y_vel = 4.5;
const player_speed = 2.8;
const player_jump = 5.7;
const player_max_jump = -6;
const dampen_jump = 4;
const invuln = 60;
class aabb {
  constructor(center, half) {
    this.center = center;
    this.half = half;
  }

  [_Symbol.reflection]() {
    return {
      type: "Object.aabb",
      interfaces: ["FSharpRecord", "System.IEquatable", "System.IComparable"],
      properties: {
        center: xy,
        half: xy
      }
    };
  }

  Equals(other) {
    return equalsRecords(this, other);
  }

  CompareTo(other) {
    return compareRecords(this, other) | 0;
  }

}
setType("Object.aabb", aabb);
class obj_params {
  constructor(has_gravity, speed) {
    this.has_gravity = has_gravity;
    this.speed = speed;
  }

  [_Symbol.reflection]() {
    return {
      type: "Object.obj_params",
      interfaces: ["FSharpRecord", "System.IEquatable", "System.IComparable"],
      properties: {
        has_gravity: "boolean",
        speed: "number"
      }
    };
  }

  Equals(other) {
    return equalsRecords(this, other);
  }

  CompareTo(other) {
    return compareRecords(this, other) | 0;
  }

}
setType("Object.obj_params", obj_params);
const min_int = -100000;
const id_counter = {
  contents: min_int
};
class obj {
  constructor(param, pos, vel, id, jumping, grounded, dir, invuln, kill, health, crouch, score) {
    this.param = param;
    this.pos = pos;
    this.vel = vel;
    this.id = id | 0;
    this.jumping = jumping;
    this.grounded = grounded;
    this.dir = dir;
    this.invuln = invuln | 0;
    this.kill = kill;
    this.health = health | 0;
    this.crouch = crouch;
    this.score = score | 0;
  }

  [_Symbol.reflection]() {
    return {
      type: "Object.obj",
      interfaces: ["FSharpRecord", "System.IEquatable", "System.IComparable"],
      properties: {
        param: obj_params,
        pos: xy,
        vel: xy,
        id: "number",
        jumping: "boolean",
        grounded: "boolean",
        dir: dir_1d,
        invuln: "number",
        kill: "boolean",
        health: "number",
        crouch: "boolean",
        score: "number"
      }
    };
  }

  Equals(other) {
    return equalsRecords(this, other);
  }

  CompareTo(other) {
    return compareRecords(this, other) | 0;
  }

}
setType("Object.obj", obj);
class collidable {
  constructor(tag, data) {
    this.tag = tag;
    this.data = data;
  }

  [_Symbol.reflection]() {
    return {
      type: "Object.collidable",
      interfaces: ["FSharpUnion", "System.IEquatable"],
      cases: [["Player", pl_typ, sprite, obj], ["Enemy", enemy_typ, sprite, obj], ["Item", item_typ, sprite, obj], ["Block", block_typ, sprite, obj]]
    };
  }

  Equals(other) {
    return this === other || this.tag === other.tag && equals(this.data, other.data);
  }

}
setType("Object.collidable", collidable);
function setup_obj() {
  return new obj_params(true, 1);
}
function setup_obj_spd(s) {
  return new obj_params(true, s);
}
const setup_obj_g_false = new obj_params(false, 1);
function set_vel_to_speed(obj_1) {
  const speed = obj_1.param.speed;
  const matchValue = obj_1.dir;

  if (matchValue.tag === 1) {
    obj_1.vel.x = speed;
  } else {
    obj_1.vel.x = -speed;
  }
}
function make_player$1() {
  return setup_obj_spd(player_speed);
}
function make_item$1(_arg1) {
  if (_arg1.tag === 1) {
    return setup_obj();
  } else if (_arg1.tag === 2) {
    return setup_obj();
  } else if (_arg1.tag === 3) {
    return setup_obj_g_false;
  } else {
    return setup_obj();
  }
}
function make_enemy$1(_arg1) {
  if (_arg1.tag === 1) {
    return setup_obj();
  } else if (_arg1.tag === 2) {
    return setup_obj();
  } else if (_arg1.tag === 3) {
    return setup_obj_spd(3);
  } else if (_arg1.tag === 4) {
    return setup_obj_spd(3);
  } else {
    return setup_obj();
  }
}
function make_block$1(_arg1) {
  const $var1 = _arg1.tag === 1 ? [1] : _arg1.tag === 2 ? [1] : _arg1.tag === 3 ? [1] : _arg1.tag === 4 ? [1] : _arg1.tag === 5 ? [1] : _arg1.tag === 6 ? [1] : [0];

  switch ($var1[0]) {
    case 0:
      return setup_obj_g_false;

    case 1:
      return setup_obj_g_false;
  }
}
function make_type$1(_arg1) {
  if (_arg1.tag === 1) {
    return make_enemy$1(_arg1.data);
  } else if (_arg1.tag === 2) {
    return make_item$1(_arg1.data);
  } else if (_arg1.tag === 3) {
    return make_block$1(_arg1.data);
  } else {
    return make_player$1();
  }
}
function new_id() {
  id_counter.contents = id_counter.contents + 1 | 0;
  return id_counter.contents | 0;
}
function make$2(id, dir, spawnable, context$$1, posx, posy) {
  const s = make(spawnable, dir, context$$1);
  const p = make_type$1(spawnable);
  const i = (id != null ? id : new_id()) | 0;
  const o = new obj(p, new xy(posx, posy), new xy(0, 0), i, false, false, dir, 0, false, 1, false, 0);
  return [s, o];
}
function spawn(spawnable, context$$1, posx, posy) {
  const patternInput = make$2(null, new dir_1d(0), spawnable, context$$1, posx, posy);

  if (spawnable.tag === 1) {
    set_vel_to_speed(patternInput[1]);
    return new collidable(1, [spawnable.data, patternInput[0], patternInput[1]]);
  } else if (spawnable.tag === 2) {
    return new collidable(2, [spawnable.data, patternInput[0], patternInput[1]]);
  } else if (spawnable.tag === 3) {
    return new collidable(3, [spawnable.data, patternInput[0], patternInput[1]]);
  } else {
    return new collidable(0, [spawnable.data[0], patternInput[0], patternInput[1]]);
  }
}
function get_sprite(_arg1) {
  const $var2 = _arg1.tag === 1 ? [0, _arg1.data[1]] : _arg1.tag === 2 ? [0, _arg1.data[1]] : _arg1.tag === 3 ? [0, _arg1.data[1]] : [0, _arg1.data[1]];

  switch ($var2[0]) {
    case 0:
      return $var2[1];
  }
}
function get_obj(_arg1) {
  const $var3 = _arg1.tag === 1 ? [0, _arg1.data[2]] : _arg1.tag === 2 ? [0, _arg1.data[2]] : _arg1.tag === 3 ? [0, _arg1.data[2]] : [0, _arg1.data[2]];

  switch ($var3[0]) {
    case 0:
      return $var3[1];
  }
}
function is_player(_arg1) {
  if (_arg1.tag === 0) {
    return true;
  } else {
    return false;
  }
}
function is_enemy(_arg1) {
  if (_arg1.tag === 1) {
    return true;
  } else {
    return false;
  }
}
function equals$1(col1, col2) {
  return get_obj(col1).id === get_obj(col2).id;
}
function update_player_keys(player, controls$$1) {
  const lr_acc = player.vel.x * 0.2;

  if (controls$$1.tag === 1) {
    if (!player.crouch) {
      if (player.vel.x < player.param.speed) {
        player.vel.x = player.vel.x + (0.4 + lr_acc);
      }

      player.dir = new dir_1d(1);
    }
  } else if (controls$$1.tag === 2) {
    if (!player.jumping ? player.grounded : false) {
      player.jumping = true;
      player.grounded = false;
      player.vel.y = max_float(player.vel.y - (player_jump + Math.abs(player.vel.x) * 0.25), player_max_jump);
    }
  } else if (controls$$1.tag === 3) {
    if (!player.jumping ? player.grounded : false) {
      player.crouch = true;
    }
  } else if (!player.crouch) {
    if (player.vel.x > -player.param.speed) {
      player.vel.x = player.vel.x - (0.4 - lr_acc);
    }

    player.dir = new dir_1d(0);
  }
}
function normalize_pos(pos, p1, p2) {
  pos.x = pos.x - (p2.bbox_size[0] + p2.bbox_offset[0]) + (p1.bbox_size[0] + p1.bbox_offset[0]);
  pos.y = pos.y - (p2.bbox_size[1] + p2.bbox_offset[1]) + (p1.bbox_size[1] + p1.bbox_offset[1]);
}
function update_player(player, keys, context$$1) {
  const prev_jumping = player.jumping;
  const prev_dir = player.dir;
  const prev_vx = Math.abs(player.vel.x);
  iterate(function (controls$$1) {
    update_player_keys(player, controls$$1);
  }, keys);
  const v = player.vel.x * friction;
  const vel_damped = Math.abs(v) < 0.1 ? 0 : v;
  player.vel.x = vel_damped;
  const pl_typ$$1 = player.health <= 1 ? new pl_typ(1) : new pl_typ(0);

  if (!prev_jumping ? player.jumping : false) {
    return [pl_typ$$1, make(new spawn_typ(0, [pl_typ$$1, new player_typ(1)]), player.dir, context$$1)];
  } else if (!eq_dir_1d(prev_dir, player.dir) ? true : (prev_vx === 0 ? Math.abs(player.vel.x) > 0 : false) ? !player.jumping : false) {
    return [pl_typ$$1, make(new spawn_typ(0, [pl_typ$$1, new player_typ(2)]), player.dir, context$$1)];
  } else if ((!eq_dir_1d(prev_dir, player.dir) ? player.jumping : false) ? prev_jumping : false) {
    return [pl_typ$$1, make(new spawn_typ(0, [pl_typ$$1, new player_typ(1)]), player.dir, context$$1)];
  } else if (player.vel.y === 0 ? player.crouch : false) {
    return [pl_typ$$1, make(new spawn_typ(0, [pl_typ$$1, new player_typ(3)]), player.dir, context$$1)];
  } else if (player.vel.y === 0 ? player.vel.x === 0 : false) {
    return [pl_typ$$1, make(new spawn_typ(0, [pl_typ$$1, new player_typ(0)]), player.dir, context$$1)];
  } else {
    return null;
  }
}
function update_vel$$1(obj_1) {
  if (obj_1.grounded) {
    obj_1.vel.y = 0;
  } else if (obj_1.param.has_gravity) {
    if (obj_1.vel.y + gravity + Math.abs(obj_1.vel.y) * 0.01 < max_y_vel) {
      obj_1.vel.y = obj_1.vel.y + gravity + Math.abs(obj_1.vel.y) * 0.01;
    } else {
      obj_1.vel.y = max_y_vel;
    }
  }
}
function update_pos$$1(obj_1) {
  obj_1.pos.x = obj_1.vel.x + obj_1.pos.x;

  if (obj_1.param.has_gravity) {
    obj_1.pos.y = obj_1.vel.y + obj_1.pos.y;
  }
}
function process_obj(obj_1, mapy) {
  update_vel$$1(obj_1);
  update_pos$$1(obj_1);

  if (obj_1.pos.y > mapy) {
    obj_1.kill = true;
  }
}

function collide_block(check_x, dir, o) {
  const $var4 = dir.tag === 1 ? [1] : dir.tag === 2 ? [2] : dir.tag === 3 ? [2] : [0];

  switch ($var4[0]) {
    case 0:
      o.vel.y = -0.001;
      break;

    case 1:
      o.vel.y = 0;
      o.grounded = true;
      o.jumping = false;
      break;

    case 2:
      if (check_x) {
        o.vel.x = 0;
      }

      break;
  }
}
function collide_block2(dir, o) {
  collide_block(false, dir, o);
}
function opposite_dir(dir) {
  if (dir.tag === 1) {
    return new dir_1d(0);
  } else {
    return new dir_1d(1);
  }
}
function reverse_left_right(obj_1) {
  obj_1.vel.x = -obj_1.vel.x;
  obj_1.dir = opposite_dir(obj_1.dir);
}
function evolve_enemy(player_dir, typ, spr, obj_1, context$$1) {
  const $var5 = typ.tag === 1 ? [0] : typ.tag === 2 ? [1] : typ.tag === 3 ? [2] : typ.tag === 4 ? [2] : [3];

  switch ($var5[0]) {
    case 0:
      const patternInput = make$2(null, obj_1.dir, new spawn_typ(1, new enemy_typ(3)), context$$1, obj_1.pos.x, obj_1.pos.y);
      normalize_pos(patternInput[1].pos, spr.param, patternInput[0].param);
      return new collidable(1, [new enemy_typ(3), patternInput[0], patternInput[1]]);

    case 1:
      const patternInput_1 = make$2(null, obj_1.dir, new spawn_typ(1, new enemy_typ(4)), context$$1, obj_1.pos.x, obj_1.pos.y);
      normalize_pos(patternInput_1[1].pos, spr.param, patternInput_1[0].param);
      return new collidable(1, [new enemy_typ(4), patternInput_1[0], patternInput_1[1]]);

    case 2:
      obj_1.dir = player_dir;

      if (obj_1.vel.x !== 0) {
        obj_1.vel.x = 0;
      } else {
        set_vel_to_speed(obj_1);
      }

      return null;

    case 3:
      obj_1.kill = true;
      return null;
  }
}
function rev_dir(o, t, s) {
  reverse_left_right(o);
  const old_params = s.param;
  transform_enemy(t, s, o.dir);
  normalize_pos(o.pos, old_params, s.param);
}
function dec_health(obj_1) {
  const health = obj_1.health - 1 | 0;

  if (health === 0) {
    obj_1.kill = true;
  } else if (obj_1.invuln === 0) {
    obj_1.health = health | 0;
  }
}
function evolve_block(obj_1, context$$1) {
  dec_health(obj_1);
  const patternInput = make$2(null, new dir_1d(0), new spawn_typ(3, new block_typ(1)), context$$1, obj_1.pos.x, obj_1.pos.y);
  return new collidable(3, [new block_typ(1), patternInput[0], patternInput[1]]);
}

function spawn_above(player_dir, obj_1, typ, context$$1) {
  const item$$1 = spawn(new spawn_typ(2, typ), context$$1, obj_1.pos.x, obj_1.pos.y);
  const item_obj = get_obj(item$$1);
  item_obj.pos.y = item_obj.pos.y - get_sprite(item$$1).param.frame_size[1];
  item_obj.dir = opposite_dir(player_dir);
  set_vel_to_speed(item_obj);
  return item$$1;
}
function get_aabb(obj_1) {
  const spr = get_sprite(obj_1).param;
  const obj_2 = get_obj(obj_1);
  const patternInput = [obj_2.pos.x + spr.bbox_offset[0], obj_2.pos.y + spr.bbox_offset[1]];
  return new aabb(new xy(patternInput[0] + spr.bbox_size[0] / 2, patternInput[1] + spr.bbox_size[1] / 2), new xy(spr.bbox_size[0] / 2, spr.bbox_size[1] / 2));
}
function col_bypass(c1, c2) {
  const o1 = get_obj(c1);
  const o2 = get_obj(c2);
  let ctypes;
  const matchValue = [c1, c2];
  const $var6 = matchValue[0].tag === 2 ? matchValue[1].tag === 1 ? [0] : matchValue[1].tag === 2 ? [0] : [2] : matchValue[0].tag === 1 ? matchValue[1].tag === 2 ? [0] : [2] : matchValue[0].tag === 0 ? matchValue[1].tag === 1 ? [1, matchValue[0].data[2]] : [2] : [2];

  switch ($var6[0]) {
    case 0:
      ctypes = true;
      break;

    case 1:
      if ($var6[1].invuln > 0) {
        ctypes = true;
      } else {
        ctypes = false;
      }

      break;

    case 2:
      ctypes = false;
      break;
  }

  if (o1.kill ? true : o2.kill) {
    return true;
  } else {
    return ctypes;
  }
}
function check_collision(c1, c2) {
  const b1 = get_aabb(c1);
  const b2 = get_aabb(c2);
  const o1 = get_obj(c1);

  if (col_bypass(c1, c2)) {
    return null;
  } else {
    const vx = b1.center.x - b2.center.x;
    const vy = b1.center.y - b2.center.y;
    const hwidths = b1.half.x + b2.half.x;
    const hheights = b1.half.y + b2.half.y;

    if (Math.abs(vx) < hwidths ? Math.abs(vy) < hheights : false) {
      const ox = hwidths - Math.abs(vx);
      const oy = hheights - Math.abs(vy);

      if (ox >= oy) {
        if (vy > 0) {
          o1.pos.y = o1.pos.y + oy;
          return new dir_2d(0);
        } else {
          o1.pos.y = o1.pos.y - oy;
          return new dir_2d(1);
        }
      } else if (vx > 0) {
        o1.pos.x = o1.pos.x + ox;
        return new dir_2d(3);
      } else {
        o1.pos.x = o1.pos.x - ox;
        return new dir_2d(2);
      }
    } else {
      return null;
    }
  }
}
function kill(collid, ctx) {
  if (collid.tag === 1) {
    const pos = [collid.data[2].pos.x, collid.data[2].pos.y];
    const score_1 = collid.data[2].score > 0 ? ofArray([(() => {
      const score = collid.data[2].score | 0;
      return make_score(score, pos[0], pos[1], ctx);
    })()]) : new List$1();
    const remains = collid.data[0].tag === 0 ? ofArray([(() => {
      const t = new part_typ(0);
      return make0(t, pos[0], pos[1], ctx);
    })()]) : new List$1();
    return append$$1(score_1, remains);
  } else if (collid.tag === 3) {
    if (collid.data[0].tag === 2) {
      const pos_1 = [collid.data[2].pos.x, collid.data[2].pos.y];
      let p1;
      const tupledArg = [-5, -5];
      const tupledArg_1 = [0, 0.2];
      const t_1 = new part_typ(1);
      p1 = make$3(tupledArg[0], tupledArg[1], tupledArg_1[0], tupledArg_1[1], t_1, pos_1[0], pos_1[1], ctx);
      let p2;
      const tupledArg_2 = [-3, -4];
      const tupledArg_3 = [0, 0.2];
      const t_2 = new part_typ(1);
      p2 = make$3(tupledArg_2[0], tupledArg_2[1], tupledArg_3[0], tupledArg_3[1], t_2, pos_1[0], pos_1[1], ctx);
      let p3;
      const tupledArg_4 = [3, -4];
      const tupledArg_5 = [0, 0.2];
      const t_3 = new part_typ(2);
      p3 = make$3(tupledArg_4[0], tupledArg_4[1], tupledArg_5[0], tupledArg_5[1], t_3, pos_1[0], pos_1[1], ctx);
      let p4;
      const tupledArg_6 = [5, -5];
      const tupledArg_7 = [0, 0.2];
      const t_4 = new part_typ(2);
      p4 = make$3(tupledArg_6[0], tupledArg_6[1], tupledArg_7[0], tupledArg_7[1], t_4, pos_1[0], pos_1[1], ctx);
      return ofArray([p1, p2, p3, p4]);
    } else {
      return new List$1();
    }
  } else if (collid.tag === 2) {
    if (collid.data[0].tag === 0) {
      return ofArray([make_score(collid.data[2].score, collid.data[2].pos.x, collid.data[2].pos.y, ctx)]);
    } else {
      return new List$1();
    }
  } else {
    return new List$1();
  }
}

const context$1 = canvas.getContext("2d");
function render_bbox(sprite$$1, posx, posy) {
  const patternInput = sprite$$1.param.bbox_offset;
  const patternInput_1 = sprite$$1.param.bbox_size;
  sprite$$1.context.strokeStyle = "#FF0000";
  sprite$$1.context.strokeRect(posx + patternInput[0], posy + patternInput[1], patternInput_1[0], patternInput_1[1]);
}
function render(sprite$$1, posx, posy) {
  const patternInput = sprite$$1.param.src_offset;
  const patternInput_1 = sprite$$1.param.frame_size;
  const patternInput_2 = [posx, posy];
  const patternInput_3 = sprite$$1.param.frame_size;
  const sx = patternInput[0] + sprite$$1.frame.contents * patternInput_1[0];
  sprite$$1.context.drawImage(sprite$$1.img, sx, patternInput[1], patternInput_1[0], patternInput_1[1], patternInput_2[0], patternInput_2[1], patternInput_3[0], patternInput_3[1]);
}
function draw_bgd(bgd, off_x) {
  render(bgd, -off_x, 0);
  render(bgd, bgd.param.frame_size[0] - off_x, 0);
}
function clear_canvas(canvas$$1) {
  const context_1 = canvas$$1.getContext("2d");
  const cwidth = canvas$$1.width;
  const cheight = canvas$$1.height;
  context_1.clearRect(0, 0, cwidth, cheight);
}
function hud(canvas$$1, score, coins) {
  const score_string = "" + score;
  const coin_string = "" + coins;
  const context_1 = canvas$$1.getContext("2d");
  context_1.font = "10px 'Press Start 2P'";
  context_1.fillText("Score: " + score_string, canvas$$1.width - 140, 18);
  context_1.fillText("Coins: " + coin_string, 120, 18);
}
function fps(canvas$$1, fps_val) {
  const fps_str = "" + fps_val;
  context$1.fillText(fps_str, 10, 18);
}
function game_win(ctx) {
  ctx.rect(0, 0, 512, 512);
  ctx.fillStyle = "black";
  ctx.fill();
  ctx.fillStyle = "white";
  ctx.font = "20px 'Press Start 2P'";
  ctx.fillText("You win!", 180, 128);
  throw new Error("Game over.");
}
function game_loss(ctx) {
  ctx.rect(0, 0, 512, 512);
  ctx.fillStyle = "black";
  ctx.fill();
  ctx.fillStyle = "white";
  ctx.font = "20px 'Press Start 2P'";
  ctx.fillText("GAME OVER. You lose!", 60, 128);
  throw new Error("Game over.");
}

class keys {
  constructor(left, right, up, down, bbox) {
    this.left = left;
    this.right = right;
    this.up = up;
    this.down = down;
    this.bbox = bbox | 0;
  }

  [_Symbol.reflection]() {
    return {
      type: "Director.keys",
      interfaces: ["FSharpRecord", "System.IEquatable", "System.IComparable"],
      properties: {
        left: "boolean",
        right: "boolean",
        up: "boolean",
        down: "boolean",
        bbox: "number"
      }
    };
  }

  Equals(other) {
    return equalsRecords(this, other);
  }

  CompareTo(other) {
    return compareRecords(this, other) | 0;
  }

}
setType("Director.keys", keys);
class st {
  constructor(bgd, ctx, vpt, map$$1, score, coins, multiplier, game_over) {
    this.bgd = bgd;
    this.ctx = ctx;
    this.vpt = vpt;
    this.map = map$$1;
    this.score = score | 0;
    this.coins = coins | 0;
    this.multiplier = multiplier | 0;
    this.game_over = game_over;
  }

  [_Symbol.reflection]() {
    return {
      type: "Director.st",
      interfaces: ["FSharpRecord", "System.IEquatable"],
      properties: {
        bgd: sprite,
        ctx: Interface("Fable.Import.Browser.CanvasRenderingContext2D"),
        vpt: viewport,
        map: "number",
        score: "number",
        coins: "number",
        multiplier: "number",
        game_over: "boolean"
      }
    };
  }

  Equals(other) {
    return equalsRecords(this, other);
  }

}
setType("Director.st", st);
const pressed_keys = new keys(false, false, false, false, 0);
const collid_objs = {
  contents: new List$1()
};
const particles = {
  contents: new List$1()
};
const last_time = {
  contents: 0
};
function calc_fps(t0, t1) {
  const delta = (t1 - t0) / 1000;
  return 1 / delta;
}
function update_score(state, i) {
  state.score = state.score + i | 0;
}
function player_attack_enemy(s1, o1, typ, s2, o2, state, context$$1) {
  o1.invuln = 10;
  o1.jumping = false;
  o1.grounded = true;
  const $var1 = typ.tag === 3 ? [0] : typ.tag === 4 ? [0] : [1];

  switch ($var1[0]) {
    case 0:
      const r2 = evolve_enemy(o1.dir, typ, s2, o2, context$$1);
      o1.vel.y = -dampen_jump;
      o1.pos.y = o1.pos.y - 5;
      return [null, r2];

    case 1:
      dec_health(o2);
      o1.vel.y = -dampen_jump;

      if (state.multiplier === 8) {
        update_score(state, 800);
        o2.score = 800;
        return [null, evolve_enemy(o1.dir, typ, s2, o2, context$$1)];
      } else {
        const score = 100 * state.multiplier | 0;
        update_score(state, score);
        o2.score = score | 0;
        state.multiplier = state.multiplier * 2 | 0;
        return [null, evolve_enemy(o1.dir, typ, s2, o2, context$$1)];
      }

  }
}
function enemy_attack_player(s1, o1, t2, s2, o2, context$$1) {
  const $var2 = t2.tag === 3 ? [0] : t2.tag === 4 ? [0] : [1];

  switch ($var2[0]) {
    case 0:
      let r2;

      if (o2.vel.x === 0) {
        r2 = evolve_enemy(o1.dir, t2, s2, o2, context$$1);
      } else {
        dec_health(o1);
        o1.invuln = invuln | 0;
        r2 = null;
      }

      return [null, r2];

    case 1:
      dec_health(o1);
      o1.invuln = invuln | 0;
      return [null, null];
  }
}
function col_enemy_enemy(t1, s1, o1, t2, s2, o2, dir) {
  const matchValue = [t1, t2];
  const $var3 = matchValue[0].tag === 3 ? matchValue[1].tag === 3 ? [0] : matchValue[1].tag === 4 ? [0] : [1] : matchValue[0].tag === 4 ? matchValue[1].tag === 4 ? [0] : matchValue[1].tag === 3 ? [0] : [1] : matchValue[1].tag === 4 ? [2] : matchValue[1].tag === 3 ? [2] : [3];

  switch ($var3[0]) {
    case 0:
      dec_health(o1);
      dec_health(o2);
      return [null, null];

    case 1:
      if (o1.vel.x === 0) {
        rev_dir(o2, t2, s2);
        return [null, null];
      } else {
        dec_health(o2);
        return [null, null];
      }

    case 2:
      if (o2.vel.x === 0) {
        rev_dir(o1, t1, s1);
        return [null, null];
      } else {
        dec_health(o1);
        return [null, null];
      }

    case 3:
      const $var4 = dir.tag === 3 ? [0] : dir.tag === 2 ? [0] : [1];

      switch ($var4[0]) {
        case 0:
          rev_dir(o1, t1, s1);
          rev_dir(o2, t2, s2);
          return [null, null];

        case 1:
          return [null, null];
      }

  }
}



function process_collision(dir, c1, c2, state) {
  const matchValue = [c1, c2, dir];
  const $var7 = matchValue[0].tag === 0 ? matchValue[1].tag === 1 ? matchValue[2].tag === 1 ? [0, matchValue[0].data[2], matchValue[1].data[2], matchValue[0].data[1], matchValue[1].data[1], matchValue[1].data[0]] : [1, matchValue[0].data[2], matchValue[1].data[2], matchValue[0].data[1], matchValue[1].data[1], matchValue[1].data[0]] : matchValue[1].tag === 2 ? [2, matchValue[0].data[2], matchValue[1].data[2], matchValue[0].data[1], matchValue[1].data[1], matchValue[1].data[0]] : matchValue[1].tag === 3 ? matchValue[2].tag === 0 ? [7, matchValue[0].data[2], matchValue[1].data[2], matchValue[0].data[1], matchValue[1].data[1], matchValue[1].data[0], matchValue[0].data[0]] : [8, matchValue[0].data[2], matchValue[1].data[2], matchValue[0].data[1], matchValue[1].data[1], matchValue[1].data[0]] : [9] : matchValue[0].tag === 1 ? matchValue[1].tag === 0 ? matchValue[2].tag === 0 ? [0, matchValue[1].data[2], matchValue[0].data[2], matchValue[1].data[1], matchValue[0].data[1], matchValue[0].data[0]] : [1, matchValue[1].data[2], matchValue[0].data[2], matchValue[1].data[1], matchValue[0].data[1], matchValue[0].data[0]] : matchValue[1].tag === 1 ? [3, matchValue[2], matchValue[0].data[2], matchValue[1].data[2], matchValue[0].data[1], matchValue[1].data[1], matchValue[0].data[0], matchValue[1].data[0]] : matchValue[1].tag === 3 ? matchValue[2].tag === 2 ? [4, matchValue[0].data[2], matchValue[1].data[2], matchValue[0].data[1], matchValue[1].data[1], matchValue[0].data[0], matchValue[1].data[0]] : matchValue[2].tag === 3 ? [4, matchValue[0].data[2], matchValue[1].data[2], matchValue[0].data[1], matchValue[1].data[1], matchValue[0].data[0], matchValue[1].data[0]] : [6, matchValue[0].data[2], matchValue[1].data[2], matchValue[0].data[1], matchValue[1].data[1], matchValue[1].data[0]] : [9] : matchValue[0].tag === 2 ? matchValue[1].tag === 0 ? [2, matchValue[1].data[2], matchValue[0].data[2], matchValue[1].data[1], matchValue[0].data[1], matchValue[0].data[0]] : matchValue[1].tag === 3 ? matchValue[2].tag === 2 ? [5, matchValue[0].data[2], matchValue[1].data[2], matchValue[0].data[1], matchValue[1].data[1], matchValue[1].data[0]] : matchValue[2].tag === 3 ? [5, matchValue[0].data[2], matchValue[1].data[2], matchValue[0].data[1], matchValue[1].data[1], matchValue[1].data[0]] : [6, matchValue[0].data[2], matchValue[1].data[2], matchValue[0].data[1], matchValue[1].data[1], matchValue[1].data[0]] : [9] : [9];

  switch ($var7[0]) {
    case 0:
      return player_attack_enemy($var7[3], $var7[1], $var7[5], $var7[4], $var7[2], state, state.ctx);

    case 1:
      return enemy_attack_player($var7[3], $var7[1], $var7[5], $var7[4], $var7[2], state.ctx);

    case 2:
      if ($var7[5].tag === 0) {
        dec_health($var7[2]);

        if ($var7[1].health === 2) {} else {
          $var7[1].health = $var7[1].health + 1 | 0;
        }

        $var7[1].vel.x = 0;
        $var7[1].vel.y = 0;
        update_score(state, 1000);
        $var7[2].score = 1000;
        return [null, null];
      } else if ($var7[5].tag === 3) {
        state.coins = state.coins + 1 | 0;
        dec_health($var7[2]);
        update_score(state, 100);
        return [null, null];
      } else {
        dec_health($var7[2]);
        update_score(state, 1000);
        return [null, null];
      }

    case 3:
      return col_enemy_enemy($var7[6], $var7[4], $var7[2], $var7[7], $var7[5], $var7[3], $var7[1]);

    case 4:
      const matchValue_1 = [$var7[5], $var7[6]];
      const $var8 = matchValue_1[0].tag === 4 ? matchValue_1[1].tag === 2 ? [0] : matchValue_1[1].tag === 0 ? [1, matchValue_1[1].data] : [2] : matchValue_1[0].tag === 3 ? matchValue_1[1].tag === 2 ? [0] : matchValue_1[1].tag === 0 ? [1, matchValue_1[1].data] : [2] : [2];

      switch ($var8[0]) {
        case 0:
          dec_health($var7[2]);
          reverse_left_right($var7[1]);
          return [null, null];

        case 1:
          const updated_block = evolve_block($var7[2], state.ctx);
          const spawned_item = spawn_above($var7[1].dir, $var7[2], $var8[1], state.ctx);
          rev_dir($var7[1], $var7[5], $var7[3]);
          return [updated_block, spawned_item];

        case 2:
          rev_dir($var7[1], $var7[5], $var7[3]);
          return [null, null];
      }

    case 5:
      reverse_left_right($var7[1]);
      return [null, null];

    case 6:
      collide_block2(dir, $var7[1]);
      return [null, null];

    case 7:
      if ($var7[5].tag === 0) {
        const updated_block_1 = evolve_block($var7[2], state.ctx);
        const spawned_item_1 = spawn_above($var7[1].dir, $var7[2], $var7[5].data, state.ctx);
        collide_block2(dir, $var7[1]);
        return [spawned_item_1, updated_block_1];
      } else if ($var7[5].tag === 2) {
        if ($var7[6].Equals(new pl_typ(0))) {
          collide_block2(dir, $var7[1]);
          dec_health($var7[2]);
          return [null, null];
        } else {
          collide_block2(dir, $var7[1]);
          return [null, null];
        }
      } else if ($var7[5].tag === 5) {
        game_win(state.ctx);
        return [null, null];
      } else {
        collide_block2(dir, $var7[1]);
        return [null, null];
      }

    case 8:
      if ($var7[5].tag === 5) {
        game_win(state.ctx);
        return [null, null];
      } else if (dir.tag === 1) {
        state.multiplier = 1;
        collide_block2(dir, $var7[1]);
        return [null, null];
      } else {
        collide_block2(dir, $var7[1]);
        return [null, null];
      }

    case 9:
      return [null, null];
  }
}
function broad_phase(collid, all_collids, state) {
  const obj$$1 = get_obj(collid);
  return filter$$1(function (c) {
    return (in_viewport(state.vpt, obj$$1.pos) ? true : is_player(collid)) ? true : out_of_viewport_below(state.vpt, obj$$1.pos.y);
  }, all_collids);
}
function narrow_phase(c, cs, state) {
  const narrow_helper = function (c_1, cs_1, state_1, acc) {
    narrow_helper: while (true) {
      if (cs_1.tail != null) {
        const c_obj = get_obj(c_1);
        let new_objs;

        if (!equals$1(c_1, cs_1.head)) {
          const matchValue = check_collision(c_1, cs_1.head);

          if (matchValue != null) {
            if (get_obj(cs_1.head).id !== c_obj.id) {
              new_objs = process_collision(matchValue, c_1, cs_1.head, state_1);
            } else {
              new_objs = [null, null];
            }
          } else {
            new_objs = [null, null];
          }
        } else {
          new_objs = [null, null];
        }

        const acc_1 = new_objs[0] != null ? new_objs[1] != null ? ofArray([new_objs[0], new_objs[1]], acc) : new List$1(new_objs[0], acc) : new_objs[1] == null ? acc : new List$1(new_objs[1], acc);
        c_1 = c_1;
        cs_1 = cs_1.tail;
        state_1 = state_1;
        acc = acc_1;
        continue narrow_helper;
      } else {
        return acc;
      }
    }
  };

  return narrow_helper(c, cs, state, new List$1());
}
function check_collisions(collid, all_collids, state) {
  if (collid.tag === 3) {
    return new List$1();
  } else {
    const broad = broad_phase(collid, all_collids, state);
    return narrow_phase(collid, broad, state);
  }
}
function check_bbox_enabled() {
  return pressed_keys.bbox === 1;
}
function update_collidable(state, collid, all_collids) {
  const obj$$1 = get_obj(collid);
  const spr = get_sprite(collid);

  if (obj$$1.invuln > 0) {
    obj$$1.invuln = obj$$1.invuln - 1 | 0;
  } else {
    obj$$1.invuln = 0;
  }

  const viewport_filter = (in_viewport(state.vpt, obj$$1.pos) ? true : is_player(collid)) ? true : out_of_viewport_below(state.vpt, obj$$1.pos.y);

  if (!obj$$1.kill ? viewport_filter : false) {
    obj$$1.grounded = false;
    process_obj(obj$$1, state.map);
    const evolved = check_collisions(collid, all_collids, state);
    const vpt_adj_xy = coord_to_viewport(state.vpt, obj$$1.pos);
    render(spr, vpt_adj_xy.x, vpt_adj_xy.y);

    if (check_bbox_enabled()) {
      render_bbox(spr, vpt_adj_xy.x, vpt_adj_xy.y);
    }

    if (obj$$1.vel.x !== 0 ? true : !is_enemy(collid)) {
      update_animation(spr);
    }

    return evolved;
  } else {
    return new List$1();
  }
}
function translate_keys() {
  const k = pressed_keys;
  const ctrls = ofArray([[k.left, new controls(0)], [k.right, new controls(1)], [k.up, new controls(2)], [k.down, new controls(3)]]);
  return fold(function (a, x) {
    return x[0] ? new List$1(x[1], a) : a;
  }, new List$1(), ctrls);
}
function run_update_collid(state, collid, all_collids) {
  if (collid.tag === 0) {
    const keys_1 = translate_keys();
    collid.data[2].crouch = false;
    let player;
    const matchValue = update_player(collid.data[2], keys_1, state.ctx);

    if (matchValue != null) {
      const new_typ = matchValue[0];
      const new_spr = matchValue[1];
      normalize_pos(collid.data[2].pos, collid.data[1].param, new_spr.param);
      player = new collidable(0, [new_typ, new_spr, collid.data[2]]);
    } else {
      player = collid;
    }

    const evolved = update_collidable(state, player, all_collids);
    collid_objs.contents = append$$1(collid_objs.contents, evolved);
    return player;
  } else {
    const obj$$1 = get_obj(collid);
    const evolved_1 = update_collidable(state, collid, all_collids);

    if (!obj$$1.kill) {
      collid_objs.contents = new List$1(collid, append$$1(collid_objs.contents, evolved_1));
    }

    const new_parts = obj$$1.kill ? kill(collid, state.ctx) : new List$1();
    particles.contents = append$$1(particles.contents, new_parts);
    return collid;
  }
}
function run_update_particle(state, part) {
  proc(part);
  const x = part.pos.x - state.vpt.pos.x;
  const y = part.pos.y - state.vpt.pos.y;
  render(part.param.sprite, x, y);

  if (!part.kill) {
    particles.contents = new List$1(part, particles.contents);
  }
}
function update_loop(canvas$$1, player, objs, map_dim_0, map_dim_1) {
  const map_dim = [map_dim_0, map_dim_1];
  const ctx = canvas$$1.getContext("2d");
  const cwidth = canvas$$1.width / 1;
  const cheight = canvas$$1.height / 1;
  let viewport$$1;
  const tupledArg = [cwidth, cheight];
  viewport$$1 = make$1(tupledArg[0], tupledArg[1], map_dim[0], map_dim[1]);
  let state;
  const bgd = make_bgd(ctx);
  const vpt = update(viewport$$1, get_obj(player).pos);
  state = new st(bgd, ctx, vpt, map_dim[1], 0, 0, 1, false);
  ctx.scale(1, 1);

  const update_helper = function (time, state_1, player_1, objs_1, parts) {
    if (state_1.game_over === true) {
      return game_win(state_1.ctx);
    } else {
      collid_objs.contents = new List$1();
      particles.contents = new List$1();
      const fps$$1 = calc_fps(last_time.contents, time);
      last_time.contents = time;
      clear_canvas(canvas$$1);
      const vpos_x_int = state_1.vpt.pos.x / 5;
      const bgd_width = state_1.bgd.param.frame_size[0];
      draw_bgd(state_1.bgd, vpos_x_int % bgd_width);
      const player_2 = run_update_collid(state_1, player_1, objs_1);

      if (get_obj(player_2).kill) {
        return game_loss(state_1.ctx);
      } else {
        let state_2;
        const vpt_1 = update(state_1.vpt, get_obj(player_2).pos);
        state_2 = new st(state_1.bgd, state_1.ctx, vpt_1, state_1.map, state_1.score, state_1.coins, state_1.multiplier, state_1.game_over);
        iterate(function (obj$$1) {
          run_update_collid(state_2, obj$$1, objs_1);
        }, objs_1);
        iterate(function (part) {
          run_update_particle(state_2, part);
        }, parts);
        fps(canvas$$1, ~~fps$$1);
        hud(canvas$$1, state_2.score, state_2.coins);
        return window.requestAnimationFrame(function (t) {
          update_helper(t, state_2, player_2, collid_objs.contents, particles.contents);
        });
      }
    }
  };

  return update_helper(0, state, player, objs, new List$1());
}
function keydown(evt) {
  const matchValue = ~~evt.keyCode | 0;

  switch (matchValue) {
    case 32:
    case 38:
    case 87:
      pressed_keys.up = true;
      break;

    case 39:
    case 68:
      pressed_keys.right = true;
      break;

    case 37:
    case 65:
      pressed_keys.left = true;
      break;

    case 40:
    case 83:
      pressed_keys.down = true;
      break;

    case 66:
      pressed_keys.bbox = (pressed_keys.bbox + 1) % 2 | 0;
      break;

    default:}

  return null;
}
function keyup(evt) {
  const matchValue = ~~evt.keyCode | 0;

  switch (matchValue) {
    case 32:
    case 38:
    case 87:
      pressed_keys.up = false;
      break;

    case 39:
    case 68:
      pressed_keys.right = false;
      break;

    case 37:
    case 65:
      pressed_keys.left = false;
      break;

    case 40:
    case 83:
      pressed_keys.down = false;
      break;

    default:}

  return null;
}

function random_int(min, max) {
  return min + ~~(Math.random() * (max - min)) | 0;
}

function mem_loc(checkloc_0, checkloc_1, loclist) {
  mem_loc: while (true) {
    const checkloc = [checkloc_0, checkloc_1];

    if (loclist.tail != null) {
      if ((() => {
        const tupledArg = loclist.head[1];
        return eq_checkloc(checkloc[0], checkloc[1], tupledArg[0], tupledArg[1]);
      })()) {
        return true;
      } else {
        checkloc_0 = checkloc[0];
        checkloc_1 = checkloc[1];
        loclist = loclist.tail;
        continue mem_loc;
      }
    } else {
      return false;
    }
  }
}
function convert_list(lst) {
  if (lst.tail != null) {
    return append$$1(ofArray([[lst.head[0], [lst.head[1][0] * 16, lst.head[1][1] * 16]]]), convert_list(lst.tail));
  } else {
    return new List$1();
  }
}
function choose_enemy_typ(typ) {
  switch (typ) {
    case 0:
      return new enemy_typ(2);

    case 1:
      return new enemy_typ(1);

    case 2:
      return new enemy_typ(0);

    default:
      throw new Error("Shouldn't reach here");
  }
}
function choose_sblock_typ(typ) {
  switch (typ) {
    case 0:
      return new block_typ(2);

    case 1:
      return new block_typ(3);

    case 2:
      return new block_typ(4);

    case 3:
      return new block_typ(0, new item_typ(0));

    case 4:
      return new block_typ(6);

    default:
      throw new Error("Shouldn't reach here");
  }
}
function avoid_overlap(lst, currentLst) {
  avoid_overlap: while (true) {
    if (lst.tail != null) {
      if ((() => {
        const tupledArg = lst.head[1];
        return mem_loc(tupledArg[0], tupledArg[1], currentLst);
      })()) {
        lst = lst.tail;
        currentLst = currentLst;
        continue avoid_overlap;
      } else {
        return append$$1(ofArray([lst.head]), avoid_overlap(lst.tail, currentLst));
      }
    } else {
      return new List$1();
    }
  }
}
function trim_edges(lst, blockw, blockh) {
  trim_edges: while (true) {
    if (lst.tail != null) {
      const cx = lst.head[1][0];
      const cy = lst.head[1][1];
      const pixx = blockw * 16;
      const pixy = blockh * 16;

      if (((cx < 128 ? true : pixx - cx < 528) ? true : cy === 0) ? true : pixy - cy < 48) {
        lst = lst.tail;
        blockw = blockw;
        blockh = blockh;
        continue trim_edges;
      } else {
        return append$$1(ofArray([lst.head]), trim_edges(lst.tail, blockw, blockh));
      }
    } else {
      return new List$1();
    }
  }
}
function generate_ground_stairs(cbx, cby, typ) {
  const four = ofArray([[typ, [cbx, cby]], [typ, [cbx + 1, cby]], [typ, [cbx + 2, cby]], [typ, [cbx + 3, cby]]]);
  const three = ofArray([[typ, [cbx + 1, cby - 1]], [typ, [cbx + 2, cby - 1]], [typ, [cbx + 3, cby - 1]]]);
  const two = ofArray([[typ, [cbx + 2, cby - 2]], [typ, [cbx + 3, cby - 2]]]);
  const one = ofArray([[typ, [cbx + 3, cby - 3]]]);
  return append$$1(four, append$$1(three, append$$1(two, one)));
}
function generate_airup_stairs(cbx, cby, typ) {
  const one = ofArray([[typ, [cbx, cby]], [typ, [cbx + 1, cby]]]);
  const two = ofArray([[typ, [cbx + 3, cby - 1]], [typ, [cbx + 4, cby - 1]]]);
  const three = ofArray([[typ, [cbx + 4, cby - 2]], [typ, [cbx + 5, cby - 2]], [typ, [cbx + 6, cby - 2]]]);
  return append$$1(one, append$$1(two, three));
}
function generate_airdown_stairs(cbx, cby, typ) {
  const three = ofArray([[typ, [cbx, cby]], [typ, [cbx + 1, cby]], [typ, [cbx + 2, cby]]]);
  const two = ofArray([[typ, [cbx + 2, cby + 1]], [typ, [cbx + 3, cby + 1]]]);
  const one = ofArray([[typ, [cbx + 5, cby + 2]], [typ, [cbx + 6, cby + 2]]]);
  return append$$1(three, append$$1(two, one));
}
function generate_clouds(cbx, cby, typ, num) {
  if (num === 0) {
    return new List$1();
  } else {
    return append$$1(ofArray([[typ, [cbx, cby]]]), generate_clouds(cbx + 1, cby, typ, num - 1));
  }
}
function generate_coins(block_coord) {
  generate_coins: while (true) {
    const place_coin = random_int(0, 2) | 0;

    if (block_coord.tail != null) {
      if (place_coin === 0) {
        const xc = block_coord.head[1][0];
        const yc = block_coord.head[1][1];
        return append$$1(ofArray([[0, [xc, yc - 16]]]), generate_coins(block_coord.tail));
      } else {
        block_coord = block_coord.tail;
        continue generate_coins;
      }
    } else {
      return new List$1();
    }
  }
}
function choose_block_pattern(blockw, blockh, cbx, cby, prob) {
  if (cbx > blockw ? true : cby > blockh) {
    return new List$1();
  } else {
    const block_typ$$1 = random_int(0, 4) | 0;
    const stair_typ = random_int(0, 2) | 0;
    const life_block_chance = random_int(0, 5) | 0;
    const middle_block = (life_block_chance === 0 ? 3 : stair_typ) | 0;

    switch (prob) {
      case 0:
        if (blockw - cbx > 2) {
          return ofArray([[stair_typ, [cbx, cby]], [middle_block, [cbx + 1, cby]], [stair_typ, [cbx + 2, cby]]]);
        } else if (blockw - cbx > 1) {
          return ofArray([[block_typ$$1, [cbx, cby]], [block_typ$$1, [cbx + 1, cby]]]);
        } else {
          return ofArray([[block_typ$$1, [cbx, cby]]]);
        }

      case 1:
        const num_clouds = random_int(0, 5) + 5 | 0;

        if (cby < 5) {
          return generate_clouds(cbx, cby, 2, num_clouds);
        } else {
          return new List$1();
        }

      case 2:
        if (blockh - cby === 1) {
          return generate_ground_stairs(cbx, cby, stair_typ);
        } else {
          return new List$1();
        }

      case 3:
        if (stair_typ === 0 ? blockh - cby > 3 : false) {
          return generate_airdown_stairs(cbx, cby, stair_typ);
        } else if (blockh - cby > 2) {
          return generate_airup_stairs(cbx, cby, stair_typ);
        } else {
          return ofArray([[stair_typ, [cbx, cby]]]);
        }

      case 4:
        if (cby + 3 - blockh === 2) {
          return ofArray([[stair_typ, [cbx, cby]]]);
        } else if (cby + 3 - blockh === 1) {
          return ofArray([[stair_typ, [cbx, cby]], [stair_typ, [cbx, cby + 1]]]);
        } else {
          return ofArray([[stair_typ, [cbx, cby]], [stair_typ, [cbx, cby + 1]], [stair_typ, [cbx, cby + 2]]]);
        }

      case 5:
        return ofArray([[3, [cbx, cby]]]);

      default:
        throw new Error("Shouldn't reach here");
    }
  }
}
function generate_enemies(blockw, blockh, cbx, cby, acc) {
  generate_enemies: while (true) {
    if (cbx > blockw - 32) {
      return new List$1();
    } else if (cby > blockh - 1 ? true : cbx < 15) {
      blockw = blockw;
      blockh = blockh;
      cbx = cbx + 1;
      cby = 0;
      acc = acc;
      continue generate_enemies;
    } else if (mem_loc(cbx, cby, acc) ? true : cby === 0) {
      blockw = blockw;
      blockh = blockh;
      cbx = cbx;
      cby = cby + 1;
      acc = acc;
      continue generate_enemies;
    } else {
      const prob = random_int(0, 30) | 0;

      if (prob < 3 ? blockh - 1 === cby : false) {
        const enemy = ofArray([[prob, [cbx * 16, cby * 16]]]);
        return append$$1(enemy, generate_enemies(blockw, blockh, cbx, cby + 1, acc));
      } else {
        blockw = blockw;
        blockh = blockh;
        cbx = cbx;
        cby = cby + 1;
        acc = acc;
        continue generate_enemies;
      }
    }
  }
}
function generate_block_enemies(block_coord) {
  generate_block_enemies: while (true) {
    const place_enemy = random_int(0, 20) | 0;
    const enemy_typ$$1 = random_int(0, 3) | 0;

    if (block_coord.tail != null) {
      if (place_enemy === 0) {
        const xc = block_coord.head[1][0];
        const yc = block_coord.head[1][1];
        return append$$1(ofArray([[enemy_typ$$1, [xc, yc - 16]]]), generate_block_enemies(block_coord.tail));
      } else {
        block_coord = block_coord.tail;
        continue generate_block_enemies;
      }
    } else {
      return new List$1();
    }
  }
}
function generate_block_locs(blockw, blockh, cbx, cby, acc) {
  generate_block_locs: while (true) {
    if (blockw - cbx < 33) {
      return acc;
    } else if (cby > blockh - 1) {
      blockw = blockw;
      blockh = blockh;
      cbx = cbx + 1;
      cby = 0;
      acc = acc;
      continue generate_block_locs;
    } else if (mem_loc(cbx, cby, acc) ? true : cby === 0) {
      blockw = blockw;
      blockh = blockh;
      cbx = cbx;
      cby = cby + 1;
      acc = acc;
      continue generate_block_locs;
    } else {
      const prob = random_int(0, 100) | 0;

      if (prob < 5) {
        const newacc = choose_block_pattern(blockw, blockh, cbx, cby, prob);
        const undup_lst = avoid_overlap(newacc, acc);
        const called_acc = append$$1(acc, undup_lst);
        blockw = blockw;
        blockh = blockh;
        cbx = cbx;
        cby = cby + 1;
        acc = called_acc;
        continue generate_block_locs;
      } else {
        blockw = blockw;
        blockh = blockh;
        cbx = cbx;
        cby = cby + 1;
        acc = acc;
        continue generate_block_locs;
      }
    }
  }
}
function generate_panel(context, blockw, blockh) {
  return spawn(new spawn_typ(3, new block_typ(5)), context, blockw * 16 - 256, blockh * 16 * 2 / 3);
}
function generate_ground(blockw, blockh, inc, acc) {
  generate_ground: while (true) {
    if (inc > blockw) {
      return acc;
    } else if (inc > 10) {
      const skip = random_int(0, 10) | 0;
      const newacc = append$$1(acc, ofArray([[4, [inc * 16, blockh * 16]]]));

      if (skip === 7 ? blockw - inc > 32 : false) {
        blockw = blockw;
        blockh = blockh;
        inc = inc + 1;
        acc = acc;
        continue generate_ground;
      } else {
        blockw = blockw;
        blockh = blockh;
        inc = inc + 1;
        acc = newacc;
        continue generate_ground;
      }
    } else {
      const newacc_1 = append$$1(acc, ofArray([[4, [inc * 16, blockh * 16]]]));
      blockw = blockw;
      blockh = blockh;
      inc = inc + 1;
      acc = newacc_1;
      continue generate_ground;
    }
  }
}
function convert_to_block_obj(lst, context) {
  if (lst.tail != null) {
    const sblock_typ = choose_sblock_typ(lst.head[0]);
    let ob;
    const spawnable = new spawn_typ(3, sblock_typ);
    const tupledArg = lst.head[1];
    ob = spawn(spawnable, context, tupledArg[0], tupledArg[1]);
    return append$$1(ofArray([ob]), convert_to_block_obj(lst.tail, context));
  } else {
    return new List$1();
  }
}
function convert_to_enemy_obj(lst, context) {
  if (lst.tail != null) {
    const senemy_typ = choose_enemy_typ(lst.head[0]);
    let ob;
    const spawnable = new spawn_typ(1, senemy_typ);
    const tupledArg = lst.head[1];
    ob = spawn(spawnable, context, tupledArg[0], tupledArg[1]);
    return append$$1(ofArray([ob]), convert_to_enemy_obj(lst.tail, context));
  } else {
    return new List$1();
  }
}
function convert_to_coin_obj(lst, context) {
  if (lst.tail != null) {
    const sitem_typ = new item_typ(3);
    let ob;
    const spawnable = new spawn_typ(2, sitem_typ);
    const tupledArg = lst.head[1];
    ob = spawn(spawnable, context, tupledArg[0], tupledArg[1]);
    return append$$1(ofArray([ob]), convert_to_coin_obj(lst.tail, context));
  } else {
    return new List$1();
  }
}
function generate_helper(blockw, blockh, cx, cy, context) {
  const block_locs = generate_block_locs(blockw, blockh, 0, 0, new List$1());
  const converted_block_locs = trim_edges(convert_list(block_locs), blockw, blockh);
  const obj_converted_block_locs = convert_to_block_obj(converted_block_locs, context);
  const ground_blocks = generate_ground(blockw, blockh, 0, new List$1());
  const obj_converted_ground_blocks = convert_to_block_obj(ground_blocks, context);
  const block_locations = append$$1(block_locs, ground_blocks);
  const all_blocks = append$$1(obj_converted_block_locs, obj_converted_ground_blocks);
  const enemy_locs = generate_enemies(blockw, blockh, 0, 0, block_locations);
  const obj_converted_enemies = convert_to_enemy_obj(enemy_locs, context);
  const coin_locs = generate_coins(converted_block_locs);
  const undup_coin_locs = trim_edges(avoid_overlap(coin_locs, converted_block_locs), blockw, blockh);
  const converted_block_coin_locs = append$$1(converted_block_locs, coin_locs);
  const enemy_block_locs = generate_block_enemies(converted_block_locs);
  const undup_enemy_block_locs = avoid_overlap(enemy_block_locs, converted_block_coin_locs);
  const obj_enemy_blocks = convert_to_enemy_obj(undup_enemy_block_locs, context);
  const coin_objects = convert_to_coin_obj(undup_coin_locs, context);
  const obj_panel = generate_panel(context, blockw, blockh);
  return append$$1(all_blocks, append$$1(obj_converted_enemies, append$$1(coin_objects, append$$1(obj_enemy_blocks, ofArray([obj_panel])))));
}
function generate(w, h, context) {
  const blockw = w / 16;
  const blockh = h / 16 - 1;
  const collide_list = generate_helper(blockw, blockh, 0, 0, context);
  const player = spawn(new spawn_typ(0, [new pl_typ(1), new player_typ(0)]), context, 100, 224);
  return [player, collide_list];
}
function init() {}

function load(_arg1) {
  const canvas = document.getElementById("canvas");
  const context = canvas.getContext("2d");
  document.addEventListener("keydown", function (e) {
    return keydown(e);
  });
  document.addEventListener("keyup", function (e_1) {
    return keyup(e_1);
  });
  init();
  const tupledArg = generate(2400, 256, context);
  const tupledArg_1 = [2400, 256];
  update_loop(canvas, tupledArg[0], tupledArg[1], tupledArg_1[0], tupledArg_1[1]);
}

function preload(_arg1) {
  const loadCount = {
    contents: 0
  };

  const inc_counter = function (_arg2) {
    loadCount.contents = loadCount.contents + 1 | 0;

    if (loadCount.contents === 4) {
      load();
    }

    return null;
  };

  iterate(function (img_src) {
    const img_src_1 = "sprites/" + img_src;
    const img = document.createElement("img");
    img.src = img_src_1;
    img.addEventListener("load", function (ev) {
      return inc_counter();
    });
  }, ofArray(["blocks.png", "items.png", "enemies.png", "mario-small.png"]));
}

window.addEventListener("load", function (_arg1) {
  preload();
  return null;
});
