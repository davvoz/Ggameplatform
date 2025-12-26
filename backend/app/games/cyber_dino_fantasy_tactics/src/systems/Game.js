import { EventBus } from "../core/EventBus.js";
import { Stats } from "../core/Stats.js";
import { Character } from "../core/Character.js";
import { Affinity, AbilityCategory, TurnOwner } from "../core/Enums.js";
import { ProceduralGenerator } from "./ProceduralGenerator.js";
import { CombatSystem } from "./CombatSystem.js";

export class Game {
  constructor() {
    this.eventBus = new EventBus();
    this.generator = new ProceduralGenerator();
    this.combat = new CombatSystem({ eventBus: this.eventBus });

    this.player = null;
    this.enemy = null;
    this.turnOwner = TurnOwner.PLAYER;

    this.buildDefaultListeners();
  }

  buildDefaultListeners() {
    this.eventBus.on("character:dead", ({ character }) => {
      if (character === this.enemy) {
        // reward player with credits on enemy kill
        if (this.player) {
          const reward = 20 + this.enemy.level * 10;
          this.player.credits += reward;
          this.eventBus.emit("log", {
            type: "system",
            text: `Hai guadagnato ${reward} crediti.`,
          });
        }
        this.eventBus.emit("log", {
          type: "system",
          text: "Nemico sconfitto. Nuovo bersaglio in arrivo...",
        });
        setTimeout(() => this.spawnEnemy(), 500);
      } else if (character === this.player) {
        this.eventBus.emit("log", {
          type: "system",
          text: "Sei caduto. Run terminata.",
        });
      }
    });
  }

  startNewRun() {
    this.createPlayer({
      magic: 1,
      tech: 1,
      primal: 1,
    });
    this.spawnEnemy();
    this.turnOwner = TurnOwner.PLAYER;
    this.combat.startTurn({ turnOwner: TurnOwner.PLAYER });
  }

  createPlayer({ magic, tech, primal }) {
    const total = magic + tech + primal || 1;
    const m = magic / total;
    const t = tech / total;
    const p = primal / total;

    const baseStats = new Stats({
      maxHealth: 120 + 40 * p,
      maxMana: 60 + 60 * m,
      maxEnergy: 60 + 60 * p,
      maxShield: 20 + 60 * t,
      attackPower: 10 + 10 * p,
      techPower: 10 + 15 * t,
      magicPower: 10 + 15 * m,
      vitality: 10 + 10 * p,
      agility: 10 + 10 * t,
      armor: 5 + 5 * p,
      shieldArmor: 5 * t,
      critChance: 0.05 + 0.05 * t,
      critMultiplier: 1.5,
      dodgeChance: 0.05 + 0.05 * p,
      haste: 0.02 * t,
    });

    const player = new Character({
      name: "Operatore Nexus",
      level: 1,
      baseStats,
      affinities: {
        [Affinity.ARCANE]: m,
        [Affinity.TECH]: t,
        [Affinity.PRIMAL]: p,
      },
      isPlayer: true,
    });

    // starting currency for shop
    player.credits = 100;

    const focus =
      m >= t && m >= p
        ? Affinity.ARCANE
        : t >= m && t >= p
        ? Affinity.TECH
        : Affinity.PRIMAL;

    player.equipment.weaponMain = this.generator.generateWeapon({
      level: 1,
      focus,
    });
    player.equipment.armorChest = this.generator.generateArmor({
      level: 1,
      focus,
    });
    player.equipment.implants.push(this.generator.generateImplant({ level: 1 }));
    player.equipment.vehicle = this.generator.generateVehicle({ level: 1 });

    player.abilities.push(
      this.generator.generateAbility({
        level: 1,
        focus,
        category: AbilityCategory.ATTACK,
      })
    );
    player.abilities.push(
      this.generator.generateAbility({
        level: 1,
        focus,
        category: AbilityCategory.DEFENSE,
      })
    );
    player.abilities.push(
      this.generator.generateAbility({
        level: 1,
        focus,
        category: AbilityCategory.SUPPORT,
      })
    );

    this.player = player;
  }

  spawnEnemy() {
    const lvl = this.player?.level ?? 1;
    const baseStats = new Stats({
      maxHealth: 80 + lvl * 30,
      maxMana: 40 + lvl * 20,
      maxEnergy: 40 + lvl * 20,
      maxShield: 10 + lvl * 20,
      attackPower: 10 + lvl * 5,
      techPower: 10 + lvl * 5,
      magicPower: 10 + lvl * 5,
      vitality: 10 + lvl * 3,
      agility: 8 + lvl * 2,
      armor: 5 + lvl * 3,
      shieldArmor: 0,
      critChance: 0.04,
      critMultiplier: 1.4,
      dodgeChance: 0.03,
    });

    const focus = [Affinity.ARCANE, Affinity.TECH, Affinity.PRIMAL][
      Math.floor(Math.random() * 3)
    ];

    const enemy = new Character({
      name: "Nemico Ibrido",
      level: lvl,
      baseStats,
      affinities: {
        [Affinity.ARCANE]: focus === Affinity.ARCANE ? 1 : 0.6,
        [Affinity.TECH]: focus === Affinity.TECH ? 1 : 0.6,
        [Affinity.PRIMAL]: focus === Affinity.PRIMAL ? 1 : 0.6,
      },
      isPlayer: false,
    });

    enemy.equipment.weaponMain = this.generator.generateWeapon({
      level: lvl,
      focus,
    });
    enemy.equipment.armorChest = this.generator.generateArmor({
      level: lvl,
      focus,
    });

    enemy.abilities.push(
      this.generator.generateAbility({
        level: lvl,
        focus,
        category: AbilityCategory.ATTACK,
      })
    );

    this.enemy = enemy;
    this.eventBus.emit("enemy:spawned", { enemy });
  }

  playerBasicAttack() {
    if (!this.player.isAlive() || !this.enemy.isAlive()) return;
    if (this.turnOwner !== TurnOwner.PLAYER) return;
    this.combat.calculateBasicAttack({
      attacker: this.player,
      defender: this.enemy,
    });
    this.endPlayerTurn();
  }

  playerUseAbility(index) {
    if (!this.player.isAlive() || !this.enemy.isAlive()) return;
    if (this.turnOwner !== TurnOwner.PLAYER) return;
    const ability = this.player.abilities[index];
    if (!ability) return;
    this.combat.useAbility({
      ability,
      actor: this.player,
      target: this.enemy,
    });
    this.endPlayerTurn();
  }

  endPlayerTurn() {
    if (!this.enemy.isAlive() || !this.player.isAlive()) return;
    this.turnOwner = TurnOwner.ENEMY;
    this.combat.endTurn({
      currentOwner: TurnOwner.PLAYER,
      player: this.player,
      enemy: this.enemy,
    });
    if (this.player.isAlive() && this.enemy.isAlive()) {
      this.turnOwner = TurnOwner.PLAYER;
    }
  }
}