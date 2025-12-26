import { ItemType, WeaponSlot, ArmorSlot, Rarity } from "./Enums.js";
import { Stats } from "./Stats.js";

let nextItemId = 1;

export class Item {
  constructor({
    id = `item_${nextItemId++}`,
    name,
    type,
    level = 1,
    rarity = Rarity.COMMON,
    tags = [],
    stats = new Stats(),
    description = "",
    meta = {},
  }) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.level = level;
    this.rarity = rarity;
    this.tags = tags;
    this.stats = stats;
    this.description = description;
    this.meta = meta;
  }
}

export class Weapon extends Item {
  constructor({
    slot = WeaponSlot.MAIN_HAND,
    baseDamage = 10,
    damageType,
    critBonus = 0,
    ...rest
  }) {
    super({ ...rest, type: ItemType.WEAPON });
    this.slot = slot;
    this.baseDamage = baseDamage;
    this.damageType = damageType;
    this.critBonus = critBonus;
  }
}

export class Armor extends Item {
  constructor({ slot = ArmorSlot.CORE, mitigation = 0, ...rest }) {
    super({ ...rest, type: ItemType.ARMOR });
    this.slot = slot;
    this.mitigation = mitigation;
  }
}

export class Implant extends Item {
  constructor(rest) {
    super({ ...rest, type: ItemType.IMPLANT });
  }
}

export class Relic extends Item {
  constructor(rest) {
    super({ ...rest, type: ItemType.RELIC });
  }
}

export class Vehicle extends Item {
  constructor({ speedBonus = 0, travelTech = [], ...rest }) {
    super({ ...rest, type: ItemType.VEHICLE });
    this.speedBonus = speedBonus;
    this.travelTech = travelTech;
  }
}

export class Consumable extends Item {
  constructor({ effect, charges = 1, ...rest }) {
    super({ ...rest, type: ItemType.CONSUMABLE });
    this.effect = effect;
    this.charges = charges;
  }
}