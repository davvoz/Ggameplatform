import { Stats } from "./Stats.js";
import { Affinity } from "./Enums.js";

let nextCharId = 1;

export class Character {
  constructor({
    id = `char_${nextCharId++}`,
    name,
    level = 1,
    baseStats = new Stats(),
    affinities = {
      [Affinity.ARCANE]: 1,
      [Affinity.TECH]: 1,
      [Affinity.PRIMAL]: 1,
    },
    isPlayer = false,
  }) {
    this.id = id;
    this.name = name;
    this.level = level;
    this.baseStats = baseStats;
    this.affinities = { ...affinities };
    this.isPlayer = isPlayer;

    // simple currency for shop
    this.credits = 0;

    this.currentHealth = baseStats.maxHealth;
    this.currentMana = baseStats.maxMana;
    this.currentEnergy = baseStats.maxEnergy;
    this.currentShield = baseStats.maxShield;

    this.equipment = {
      weaponMain: null,
      weaponOff: null,
      armorHead: null,
      armorChest: null,
      armorLegs: null,
      armorArms: null,
      armorCore: null,
      implants: [],
      relics: [],
    };

    // generic inventory for purchased/loot items
    this.inventory = [];

    this.abilities = [];
    this.abilityCooldowns = new Map();
  }

  getTotalStats() {
    let stats = this.baseStats.clone();
    for (const item of this.getAllEquipped()) {
      if (item?.stats) {
        stats = stats.add(item.stats);
      }
    }
    return stats;
  }

  getAllEquipped() {
    const list = [];
    for (const key of Object.keys(this.equipment)) {
      const v = this.equipment[key];
      if (Array.isArray(v)) list.push(...v);
      else if (v) list.push(v);
    }
    return list;
  }

  applyDamage(amount) {
    let remaining = amount;

    if (this.currentShield > 0) {
      const absorbed = Math.min(this.currentShield, remaining);
      this.currentShield -= absorbed;
      remaining -= absorbed;
    }
    if (remaining <= 0) return 0;

    const applied = Math.min(this.currentHealth, remaining);
    this.currentHealth -= applied;
    return applied;
  }

  heal(amount) {
    const before = this.currentHealth;
    this.currentHealth = Math.min(
      this.currentHealth + amount,
      this.baseStats.maxHealth
    );
    return this.currentHealth - before;
  }

  canPayCost(cost) {
    if (cost.mana && this.currentMana < cost.mana) return false;
    if (cost.energy && this.currentEnergy < cost.energy) return false;
    if (cost.health && this.currentHealth <= cost.health) return false;
    return true;
  }

  payCost(cost) {
    if (cost.mana) this.currentMana -= cost.mana;
    if (cost.energy) this.currentEnergy -= cost.energy;
    if (cost.health) this.currentHealth -= cost.health;
  }

  tickCooldowns() {
    for (const [id, cd] of this.abilityCooldowns.entries()) {
      if (cd <= 1) this.abilityCooldowns.delete(id);
      else this.abilityCooldowns.set(id, cd - 1);
    }
  }

  setCooldown(ability, turns) {
    this.abilityCooldowns.set(ability.id, turns);
  }

  getCooldown(ability) {
    return this.abilityCooldowns.get(ability.id) ?? 0;
  }

  isAlive() {
    return this.currentHealth > 0;
  }
}