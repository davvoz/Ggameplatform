import { AbilityCategory, TargetType, Affinity } from "./Enums.js";

let nextAbilityId = 1;

export class Ability {
  constructor({
    id = `ability_${nextAbilityId++}`,
    name,
    category = AbilityCategory.ATTACK,
    affinity = Affinity.ARCANE,
    cost = { mana: 0, energy: 0, health: 0 },
    cooldown = 0,
    range = 1,
    targetType = TargetType.ENEMY,
    tags = [],
    description = "",
    animationType = "cast", // Specific animation type for this ability
    execute, // (ctx) => { events }
  }) {
    this.id = id;
    this.name = name;
    this.category = category;
    this.affinity = affinity;
    this.cost = cost || { mana: 0, energy: 0, health: 0 };
    this.cooldown = cooldown;
    this.range = range;
    this.targetType = targetType;
    this.tags = tags;
    this.description = description;
    this.animationType = animationType;
    this.execute = execute;
  }

  /**
   * Generic resource check so existing code like ability.canPay(...) is safe.
   * Accepts either a Character instance (with canPayCost) or a plain resource object.
   */
  canPay(source) {
    const cost = this.cost || {};
    if (!source) return false;

    // If a Character-like object is passed, delegate to its canPayCost
    if (typeof source.canPayCost === "function") {
      return source.canPayCost(cost);
    }

    // Otherwise treat source as a raw resource pool
    const mana = source.mana ?? Infinity;
    const energy = source.energy ?? Infinity;
    const health = source.health ?? Infinity;

    if (cost.mana && mana < cost.mana) return false;
    if (cost.energy && energy < cost.energy) return false;
    if (cost.health && health <= cost.health) return false;
    return true;
  }
}