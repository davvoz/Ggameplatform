export class Stats {
  constructor({
    maxHealth = 100,
    maxMana = 50,
    maxEnergy = 50,
    maxShield = 0,
    attackPower = 10,
    techPower = 10,
    magicPower = 10,
    vitality = 10,
    agility = 10,
    armor = 0,
    shieldArmor = 0,
    critChance = 0.05,
    critMultiplier = 1.5,
    dodgeChance = 0.05,
    haste = 0,
    resistances = {},
  } = {}) {
    this.maxHealth = maxHealth;
    this.maxMana = maxMana;
    this.maxEnergy = maxEnergy;
    this.maxShield = maxShield;

    this.attackPower = attackPower;
    this.techPower = techPower;
    this.magicPower = magicPower;
    this.vitality = vitality;
    this.agility = agility;

    this.armor = armor;
    this.shieldArmor = shieldArmor;

    this.critChance = critChance;
    this.critMultiplier = critMultiplier;
    this.dodgeChance = dodgeChance;
    this.haste = haste;

    this.resistances = { ...resistances }; // DamageType -> 0..1
  }

  clone() {
    return new Stats(JSON.parse(JSON.stringify(this)));
  }

  add(other) {
    const result = this.clone();
    for (const key of Object.keys(result)) {
      if (key === "resistances") continue;
      if (typeof result[key] === "number" && typeof other[key] === "number") {
        result[key] += other[key];
      }
    }
    const res = { ...this.resistances };
    for (const [k, v] of Object.entries(other.resistances || {})) {
      res[k] = (res[k] || 0) + v;
    }
    result.resistances = res;
    return result;
  }

  scale(factor) {
    const result = this.clone();
    for (const key of Object.keys(result)) {
      if (key === "resistances") continue;
      if (typeof result[key] === "number") {
        result[key] *= factor;
      }
    }
    return result;
  }
}