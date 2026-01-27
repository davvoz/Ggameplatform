import {
  DamageType,
  ItemType,
  WeaponSlot,
  ArmorSlot,
  Rarity,
  Affinity,
} from "../core/Enums.js";
import { Stats } from "../core/Stats.js";
import {
  Weapon,
  Armor,
  Implant,
  Relic,
  Vehicle,
  Consumable,
} from "../core/Item.js";
import { Ability } from "../core/Ability.js";

function randomOf(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

function randRange(min, max, rng) {
  return min + (max - min) * rng();
}

function rarityMultiplier(rarity) {
  switch (rarity) {
    case Rarity.RARE:
      return 1.4;
    case Rarity.EPIC:
      return 1.9;
    case Rarity.LEGENDARY:
      return 2.4;
    default:
      return 1.0;
  }
}

function makeRng(seed = Date.now()) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export class ProceduralGenerator {
  constructor(seed = Date.now()) {
    this.rng = makeRng(seed);
  }

  rollRarity() {
    const r = this.rng();
    if (r > 0.98) return Rarity.LEGENDARY;
    if (r > 0.9) return Rarity.EPIC;
    if (r > 0.7) return Rarity.RARE;
    return Rarity.COMMON;
  }

  generateWeapon({ level, focus }) {
    const rarity = this.rollRarity();
    const mult = rarityMultiplier(rarity);

    const themes = {
      [Affinity.ARCANE]: {
        names: ["Shardblade", "Runic Staff", "Soul Reaper", "Astral Coil"],
        types: [WeaponSlot.TWO_HAND, WeaponSlot.MAIN_HAND],
        damageTypes: [DamageType.FIRE, DamageType.VOID, DamageType.PSYCHIC],
      },
      [Affinity.TECH]: {
        names: ["Neon Carbine", "Rail Katana", "Mono Whip", "Gauss Cannon"],
        types: [WeaponSlot.MAIN_HAND, WeaponSlot.TWO_HAND],
        damageTypes: [DamageType.PHYSICAL, DamageType.ELECTRIC],
      },
      [Affinity.PRIMAL]: {
        names: ["Rex Claw", "Bone Crusher", "Saur Fang", "Primal Glaive"],
        types: [WeaponSlot.TWO_HAND, WeaponSlot.MAIN_HAND],
        damageTypes: [DamageType.PHYSICAL, DamageType.TOXIC],
      },
    };

    const theme = themes[focus] || randomOf(Object.values(themes), this.rng);
    const name = randomOf(theme.names, this.rng);
    const slot = randomOf(theme.types, this.rng);
    const damageType = randomOf(theme.damageTypes, this.rng);

    const base = 8 + level * 3;
    const baseDamage = Math.round(base * mult * randRange(0.9, 1.2, this.rng));
    const stats = new Stats({
      attackPower:
        focus === Affinity.PRIMAL
          ? level * 2 * mult
          : level * 1.2 * mult * randRange(0.8, 1.3, this.rng),
      magicPower:
        focus === Affinity.ARCANE
          ? level * 2.2 * mult
          : level * 0.6 * mult,
      techPower:
        focus === Affinity.TECH
          ? level * 2.2 * mult
          : level * 0.6 * mult,
      agility: level * 0.6 * mult,
      critChance: 0.05 + 0.01 * level * mult,
    });

    return new Weapon({
      name,
      level,
      rarity,
      slot,
      damageType,
      baseDamage,
      stats,
      critBonus: rarity === Rarity.LEGENDARY ? 0.15 : 0.05 * mult,
      tags: [focus, "PROCEDURAL"],
      description: `${rarity} ${focus.toLowerCase()} weapon`,
      meta: { focus },
    });
  }

  generateArmor({ level, focus }) {
    const rarity = this.rollRarity();
    const mult = rarityMultiplier(rarity);

    const parts = [
      { slot: ArmorSlot.HEAD, names: ["Visor", "Crown", "Helm"] },
      { slot: ArmorSlot.CHEST, names: ["Carapace", "Rig", "Aegis"] },
      { slot: ArmorSlot.LEGS, names: ["Greaves", "Striders", "Treads"] },
      { slot: ArmorSlot.ARMS, names: ["Gauntlets", "Bracers", "Claws"] },
      { slot: ArmorSlot.CORE, names: ["Core Mesh", "Overplate", "Exo Spine"] },
    ];

    const part = randomOf(parts, this.rng);
    const baseMitigation = 4 + level * 2;
    const mitigation = Math.round(
      baseMitigation * mult * randRange(0.9, 1.3, this.rng)
    );

    const stats = new Stats({
      armor: mitigation,
      vitality: level * mult,
      maxHealth: 10 * level * mult * randRange(0.9, 1.1, this.rng),
      maxShield: focus === Affinity.TECH ? level * 6 * mult : 0,
      maxMana: focus === Affinity.ARCANE ? level * 5 * mult : 0,
      maxEnergy: focus === Affinity.PRIMAL ? level * 5 * mult : 0,
    });

    const prefixByFocus = {
      [Affinity.ARCANE]: ["Runic", "Astral", "Voidborn"],
      [Affinity.TECH]: ["Neon", "Cyber", "Titanium"],
      [Affinity.PRIMAL]: ["Saurian", "Feral", "Primeval"],
    };
    const prefix = randomOf(prefixByFocus[focus] || ["Hybrid"], this.rng);
    const name = `${prefix} ${randomOf(part.names, this.rng)}`;

    return new Armor({
      name,
      level,
      rarity,
      slot: part.slot,
      mitigation,
      stats,
      tags: [focus, "ARMOR", "PROCEDURAL"],
      description: `${rarity} ${focus.toLowerCase()} armor piece`,
      meta: { focus },
    });
  }

  generateImplant({ level }) {
    const rarity = this.rollRarity();
    const mult = rarityMultiplier(rarity);
    const stats = new Stats({
      haste: 0.01 * level * mult,
      critChance: 0.02 * mult,
      maxShield: 8 * level * mult,
      techPower: 1.5 * level * mult,
    });
    return new Implant({
      name: "Neuro-Sync Node",
      level,
      rarity,
      stats,
      tags: [Affinity.TECH, "IMPLANT"],
      description: "Aumenta velocità neurale e scudi.",
    });
  }

  generateVehicle({ level }) {
    return new Vehicle({
      name: "Chrono-Raptor",
      level,
      rarity: Rarity.RARE,
      stats: new Stats(),
      speedBonus: 25 + level * 2,
      travelTech: ["land", "jungle"],
      tags: [Affinity.PRIMAL, "MOUNT"],
      description: "Dinosauro cibernetico come cavalcatura.",
    });
  }

  generateConsumable({ level }) {
    return new Consumable({
      name: "Nano-Serum",
      level,
      rarity: Rarity.RARE,
      stats: new Stats(),
      charges: 2,
      tags: ["HEALING"],
      description: "Regenerates HP and Shields.",
      effect: (ctx) => {
        const heal = 25 + level * 5;
        const restored = ctx.target.heal(heal);
        ctx.log(`+${Math.round(restored)} HP da Nano-Serum.`);
      },
    });
  }

  generateAbility({ level, focus, category }) {
    const rarity = this.rollRarity();
    const mult = rarityMultiplier(rarity);

    if (!category) {
      const cats = [
        category || null,
        "ATTACK",
        "CONTROL",
        "SUMMON",
        "DEFENSE",
        "SUPPORT",
      ];
      category = randomOf(cats.slice(1), this.rng);
    }

    const baseNameByCat = {
      ATTACK: {
        [Affinity.ARCANE]: "Frattura Astrale",
        [Affinity.TECH]: "Overload Neuronale",
        [Affinity.PRIMAL]: "Furia Sauriana",
      },
      CONTROL: {
        [Affinity.ARCANE]: "Prigione di Rune",
        [Affinity.TECH]: "Hack Sensoriale",
        [Affinity.PRIMAL]: "Ruggito Terrestre",
      },
      SUMMON: {
        [Affinity.ARCANE]: "Evoca Eidolon",
        [Affinity.TECH]: "Deploy Drone Rex",
        [Affinity.PRIMAL]: "Richiamo del Branco",
      },
      DEFENSE: {
        [Affinity.ARCANE]: "Scudo di Mana",
        [Affinity.TECH]: "Barriera Olografica",
        [Affinity.PRIMAL]: "Pelle Corazzata",
      },
      SUPPORT: {
        [Affinity.ARCANE]: "Canto del Nexus",
        [Affinity.TECH]: "Protocollo Overclock",
        [Affinity.PRIMAL]: "Impeto Vitale",
      },
    };

    const name =
      baseNameByCat[category]?.[focus] ??
      baseNameByCat[category]?.[Affinity.ARCANE];

    // Increased base cost and minimum resource consumption
    const baseCost = 10 + level * 3;
    const minCost = Math.ceil(baseCost * 0.4); // Minimum 40% of base cost
    const cost = {
      mana: Math.max(minCost, focus === Affinity.ARCANE ? baseCost : Math.round(baseCost * 0.6)),
      energy: Math.max(minCost, focus === Affinity.PRIMAL ? baseCost : Math.round(baseCost * 0.5)),
      health: 0,
    };

    const cooldown = 3 + Math.floor(this.rng() * 3);
    const range = category === "MOVEMENT" ? 3 : 1;

    const ability = new Ability({
      name,
      category,
      affinity: focus,
      cost,
      cooldown,
      range,
      tags: [focus, category, "PROCEDURAL"],
      description: `${rarity} ${category.toLowerCase()} ability. Costa ${cost.mana} mana e ${cost.energy} energia.`,
      execute: (ctx) => {
        this.executeAbilityEffect({ ability, category, focus, mult, ctx });
      },
    });

    return ability;
  }

  /**
   * Generate hybrid ability that scales with all player affinities
   */
  generateHybridAbility({ level, affinities, category, isUltimate = false }) {
    const rarity = isUltimate ? Rarity.LEGENDARY : this.rollRarity();
    const mult = rarityMultiplier(rarity) * (isUltimate ? 2.0 : 1.0);

    if (!category) {
      const cats = ["ATTACK", "CONTROL", "DEFENSE", "SUPPORT"];
      category = randomOf(cats, this.rng);
    }

    // Calculate dominant and secondary affinities
    const affinityArray = [
      { type: Affinity.ARCANE, value: affinities[Affinity.ARCANE] || 0 },
      { type: Affinity.TECH, value: affinities[Affinity.TECH] || 0 },
      { type: Affinity.PRIMAL, value: affinities[Affinity.PRIMAL] || 0 },
    ].sort((a, b) => b.value - a.value);

    const primary = affinityArray[0].type;
    const secondary = affinityArray[1].type;

    // Hybrid ability names combining affinities
    const hybridNames = {
      ATTACK: {
        [`${Affinity.ARCANE}_${Affinity.TECH}`]: "Fulmine Arcano",
        [`${Affinity.ARCANE}_${Affinity.PRIMAL}`]: "Zanne Mistiche",
        [`${Affinity.TECH}_${Affinity.ARCANE}`]: "Scarica Eterea",
        [`${Affinity.TECH}_${Affinity.PRIMAL}`]: "Morso Cibernetico",
        [`${Affinity.PRIMAL}_${Affinity.ARCANE}`]: "Artiglio Incantato",
        [`${Affinity.PRIMAL}_${Affinity.TECH}`]: "Assalto Potenziato",
      },
      DEFENSE: {
        [`${Affinity.ARCANE}_${Affinity.TECH}`]: "Campo Runico-Tech",
        [`${Affinity.ARCANE}_${Affinity.PRIMAL}`]: "Barriera Organica",
        [`${Affinity.TECH}_${Affinity.ARCANE}`]: "Scudo Quantico",
        [`${Affinity.TECH}_${Affinity.PRIMAL}`]: "Corazza Adattiva",
        [`${Affinity.PRIMAL}_${Affinity.ARCANE}`]: "Pelle di Mana",
        [`${Affinity.PRIMAL}_${Affinity.TECH}`]: "Esoscheletro Bio-Tech",
      },
      SUPPORT: {
        [`${Affinity.ARCANE}_${Affinity.TECH}`]: "Sincronizzazione Nexus",
        [`${Affinity.ARCANE}_${Affinity.PRIMAL}`]: "Risveglio Primordiale",
        [`${Affinity.TECH}_${Affinity.ARCANE}`]: "Boost Eterico",
        [`${Affinity.TECH}_${Affinity.PRIMAL}`]: "Stimolo Vitale",
        [`${Affinity.PRIMAL}_${Affinity.ARCANE}`]: "Rinascita Arcana",
        [`${Affinity.PRIMAL}_${Affinity.TECH}`]: "Regen Nano-Organico",
      },
      CONTROL: {
        [`${Affinity.ARCANE}_${Affinity.TECH}`]: "Stasi Olografica",
        [`${Affinity.ARCANE}_${Affinity.PRIMAL}`]: "Vincolo Primevo",
        [`${Affinity.TECH}_${Affinity.ARCANE}`]: "Glitch Dimensionale",
        [`${Affinity.TECH}_${Affinity.PRIMAL}`]: "Tramortimento Bio",
        [`${Affinity.PRIMAL}_${Affinity.ARCANE}`]: "Incantamento Ferino",
        [`${Affinity.PRIMAL}_${Affinity.TECH}`]: "Sovraccarico Sensoriale",
      },
    };

    const nameKey = `${primary}_${secondary}`;
    let name = hybridNames[category]?.[nameKey] || `Abilità Ibrida ${category}`;
    
    // Override name for ultimate abilities
    if (isUltimate) {
      const ultimateNames = {
        ATTACK: `ULTIMATE: ${name} Devastante`,
        DEFENSE: `ULTIMATE: Bastione ${name}`,
        SUPPORT: `ULTIMATE: ${name} Supremo`,
        CONTROL: `ULTIMATE: Dominio ${name}`,
      };
      name = ultimateNames[category] || `ULTIMATE: ${name}`;
    }

    // Hybrid cost: distributed across resources based on affinities
    // All abilities now cost BOTH mana AND energy to make resources meaningful
    const baseCost = (10 + level * 3) * (isUltimate ? 2.5 : 1);
    const m = affinities[Affinity.ARCANE] || 0;
    const t = affinities[Affinity.TECH] || 0;
    const p = affinities[Affinity.PRIMAL] || 0;
    const total = m + t + p || 1;

    // Minimum cost ensures abilities always consume resources
    // Primary resource based on dominant affinity, secondary resource always has base cost
    const manaCost = Math.round(baseCost * (m / total));
    const energyCost = Math.round(baseCost * (p / total));
    const minCost = Math.ceil(baseCost * 0.3); // Minimum 30% of base cost
    
    const cost = {
      mana: Math.max(minCost, manaCost),    // Always costs at least minCost mana
      energy: Math.max(minCost, energyCost), // Always costs at least minCost energy
      health: 0,
    };

    const cooldown = isUltimate ? 8 : (3 + Math.floor(this.rng() * 2));
    const range = category === "MOVEMENT" ? 3 : 1;

    // Description based on affinity mix
    const affinityDesc = [];
    if (m > 0.3) affinityDesc.push("arcano");
    if (t > 0.3) affinityDesc.push("tech");
    if (p > 0.3) affinityDesc.push("primale");
    const description = `Abilità ibrida ${affinityDesc.join("-")}. Costa ${cost.mana} mana e ${cost.energy} energia.`;

    // Map each unique ability name to its own animation
    const animationMap = {
      // ATTACK abilities - 6 unique animations
      "Fulmine Arcano": "animFulmineArcano",
      "Zanne Mistiche": "animZanneMistiche",
      "Scarica Eterea": "animScaricaEterea",
      "Morso Cibernetico": "animMorsoCibernetico",
      "Artiglio Incantato": "animArtiglioIncantato",
      "Assalto Potenziato": "animAssaltoPotenziato",
      
      // DEFENSE abilities - 6 unique animations
      "Campo Runico-Tech": "animCampoRunicoTech",
      "Barriera Organica": "animBarrieraOrganica",
      "Scudo Quantico": "animScudoQuantico",
      "Corazza Adattiva": "animCorazzaAdattiva",
      "Pelle di Mana": "animPelleDiMana",
      "Esoscheletro Bio-Tech": "animEsoscheletroBioTech",
      
      // SUPPORT abilities - 6 unique animations
      "Sincronizzazione Nexus": "animSincronizzazioneNexus",
      "Risveglio Primordiale": "animRisveglioprimordiale",
      "Boost Eterico": "animBoostEterico",
      "Stimolo Vitale": "animStimoloVitale",
      "Rinascita Arcana": "animRinascitaArcana",
      "Regen Nano-Organico": "animRegenNanoOrganico"
    };

    const animationType = animationMap[name] || "cast";

    const ability = new Ability({
      name,
      category,
      affinity: primary, // Store primary for UI purposes
      cost,
      cooldown,
      range,
      tags: isUltimate ? ["HYBRID", "ULTIMATE", primary, secondary, category, "PROCEDURAL"] : ["HYBRID", primary, secondary, category, "PROCEDURAL"],
      description,
      animationType,
      execute: (ctx) => {
        this.executeHybridAbilityEffect({ ability, category, affinities, mult, ctx });
      },
    });

    return ability;
  }

  executeAbilityEffect({ ability, category, focus, mult, ctx }) {
    const { actor, target, log } = ctx;
    const stats = actor.getTotalStats();

    if (category === "ATTACK") {
      const power =
        focus === Affinity.ARCANE
          ? stats.magicPower
          : focus === Affinity.TECH
          ? stats.techPower
          : stats.attackPower + stats.vitality;

      const dmg = (15 + power * 1.1) * mult;
      const applied = target.applyDamage(Math.round(dmg));
      log?.(
        `${actor.name} uses ${ability.name} on ${target.name} for ${Math.round(
          applied
        )} damage.`
      );
      return;
    }

    if (category === "DEFENSE") {
      const amount = (10 + stats.vitality * 1.5) * mult;
      actor.currentShield = Math.min(
        actor.currentShield + amount,
        stats.maxShield + amount
      );
      log?.(`${actor.name} generates ${Math.round(amount)} shield.`);
      return;
    }

    if (category === "SUPPORT") {
      const heal = (12 + stats.vitality * 1.2) * mult;
      const restored = target.heal(Math.round(heal));
      log?.(
        `${actor.name} empowers ${target.name}: +${Math.round(
          restored
        )} health.`
      );
      return;
    }

    if (category === "CONTROL") {
      log?.(
        `${actor.name} casts ${ability.name} on ${target.name}, weakening them.`
      );
      return;
    }

    if (category === "SUMMON") {
      log?.(
        `${actor.name} summons a temporary ally (${ability.name}).`
      );
      return;
    }
  }

  executeHybridAbilityEffect({ ability, category, affinities, mult, ctx }) {
    const { actor, target, log } = ctx;
    const stats = actor.getTotalStats();

    // Get affinity weights
    const m = affinities[Affinity.ARCANE] || 0;
    const t = affinities[Affinity.TECH] || 0;
    const p = affinities[Affinity.PRIMAL] || 0;
    const total = m + t + p || 1;

    if (category === "ATTACK") {
      // Hybrid damage: combines all power sources weighted by affinities
      const magicDmg = stats.magicPower * (m / total);
      const techDmg = stats.techPower * (t / total);
      const primalDmg = (stats.attackPower + stats.vitality * 0.5) * (p / total);
      
      const totalPower = magicDmg + techDmg + primalDmg;
      const dmg = (15 + totalPower * 1.2) * mult;
      const applied = target.applyDamage(Math.round(dmg));
      log?.(
        `${actor.name} uses ${ability.name} on ${target.name} for ${Math.round(
          applied
        )} hybrid damage.`
      );
      return;
    }

    if (category === "DEFENSE") {
      // Hybrid defense: combines shield and regeneration
      const shieldAmount = (10 + stats.vitality * 1.2 + stats.agility * 0.5) * mult * (t / total);
      const healAmount = (5 + stats.vitality * 0.8) * mult * (p / total);
      const manaShield = (8 + stats.magicPower * 0.5) * mult * (m / total);
      
      const totalShield = Math.round(shieldAmount + manaShield);
      const totalHeal = Math.round(healAmount);
      
      actor.currentShield = Math.min(
        actor.currentShield + totalShield,
        stats.maxShield + totalShield
      );
      
      if (totalHeal > 0) {
        actor.heal(totalHeal);
      }
      
      log?.(`${actor.name} generates ${totalShield} shield and regenerates ${totalHeal} HP.`);
      return;
    }

    if (category === "SUPPORT") {
      // Hybrid support: combines healing and buffs
      const heal = (12 + stats.vitality * 1.0 + stats.magicPower * 0.3) * mult;
      const energyBoost = Math.round((5 + stats.techPower * 0.2) * mult);
      
      const restored = target.heal(Math.round(heal));
      target.currentEnergy = Math.min(
        target.currentEnergy + energyBoost,
        stats.maxEnergy
      );
      
      log?.(
        `${actor.name} empowers ${target.name}: +${Math.round(restored)} HP and +${energyBoost} energy.`
      );
      return;
    }

    if (category === "CONTROL") {
      log?.(
        `${actor.name} casts ${ability.name} on ${target.name}, weakening them with hybrid power.`
      );
      return;
    }
  }
}