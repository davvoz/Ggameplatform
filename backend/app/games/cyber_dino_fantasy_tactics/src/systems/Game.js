import { EventBus } from "../core/EventBus.js";
import { Stats } from "../core/Stats.js";
import { Character } from "../core/Character.js";
import { Affinity, AbilityCategory, TurnOwner } from "../core/Enums.js";
import { ProceduralGenerator } from "./ProceduralGenerator.js";
import { CombatSystem } from "./CombatSystem.js";
import { LevelingSystem } from "./LevelingSystem.js";

export class Game {
  constructor() {
    this.eventBus = new EventBus();
    this.generator = new ProceduralGenerator();
    this.combat = new CombatSystem({ eventBus: this.eventBus });
    this.levelingSystem = new LevelingSystem();

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
          const creditReward = 20 + this.enemy.level * 10;
          this.player.credits += creditReward;
          this.eventBus.emit("log", {
            type: "system",
            text: `Hai guadagnato ${creditReward} crediti.`,
          });

          // Award XP
          const xpReward = this.levelingSystem.calculateXPReward(
            this.enemy.level,
            this.player.level
          );
          const levelResult = this.levelingSystem.addXP(this.player, xpReward);
          
          this.eventBus.emit("log", {
            type: "xp",
            text: `+${xpReward} XP`,
          });

          // Handle level up
          if (levelResult.leveledUp) {
            this.handleLevelUp(levelResult);
          }
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

    // Reset turn to player after enemy acts
    this.eventBus.on("turn:end", ({ owner }) => {
      if (owner === TurnOwner.ENEMY) {
        this.turnOwner = TurnOwner.PLAYER;
      }
    });
    
    // Check if player can do anything, auto-pass if not
    this.eventBus.on("turn:checkPlayerActions", ({ player, enemy }) => {
      if (!player.isAlive() || !enemy.isAlive()) return;
      
      const stats = player.getTotalStats();
      const energyCost = Math.ceil(stats.maxEnergy * 0.15);
      const canAttack = player.currentEnergy >= energyCost;
      const canUseAbility = this.canPlayerUseAnyAbility();
      
      if (!canAttack && !canUseAbility) {
        this.eventBus.emit("log", {
          type: "system",
          text: `${player.name} non ha risorse sufficienti per agire. Turno passato automaticamente.`,
        });
        // Delay auto-pass so player can read the message
        setTimeout(() => {
          this.endPlayerTurn();
        }, 1200);
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

    // Refresh resources after equipping items
    player.refreshResourceMaximums();

    // Generate hybrid abilities based on player's affinity mix
    player.abilities.push(
      this.generator.generateHybridAbility({
        level: 1,
        affinities: player.affinities,
        category: AbilityCategory.ATTACK,
      })
    );
    player.abilities.push(
      this.generator.generateHybridAbility({
        level: 1,
        affinities: player.affinities,
        category: AbilityCategory.DEFENSE,
      })
    );
    player.abilities.push(
      this.generator.generateHybridAbility({
        level: 1,
        affinities: player.affinities,
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

  /**
   * Pass turn without taking any action (skip turn)
   */
  playerPassTurn() {
    if (!this.player.isAlive() || !this.enemy.isAlive()) return;
    if (this.turnOwner !== TurnOwner.PLAYER) return;
    this.eventBus.emit("log", {
      type: "system",
      text: `${this.player.name} passa il turno.`,
    });
    this.endPlayerTurn();
  }

  /**
   * Check if player can use any ability
   * @returns {boolean} true if at least one ability is usable
   */
  canPlayerUseAnyAbility() {
    if (!this.player) return false;
    return this.player.abilities.some(ability => 
      this.player.canPayCost(ability.cost) && this.player.getCooldown(ability) === 0
    );
  }

  /**
   * Check if player has any available actions
   * @returns {object} { canAttack: boolean, canUseAbility: boolean, usableAbilities: number[] }
   */
  getPlayerAvailableActions() {
    if (!this.player) return { canAttack: false, canUseAbility: false, usableAbilities: [] };
    
    // Check if player can afford basic attack (costs 15% of max energy)
    const stats = this.player.getTotalStats();
    const energyCost = Math.ceil(stats.maxEnergy * 0.15);
    const canAttack = this.player.currentEnergy >= energyCost;
    
    const usableAbilities = [];
    this.player.abilities.forEach((ability, index) => {
      if (this.player.canPayCost(ability.cost) && this.player.getCooldown(ability) === 0) {
        usableAbilities.push(index);
      }
    });
    
    return {
      canAttack,
      canUseAbility: usableAbilities.length > 0,
      usableAbilities
    };
  }

  endPlayerTurn() {
    if (!this.enemy.isAlive() || !this.player.isAlive()) return;
    this.turnOwner = TurnOwner.ENEMY;
    this.combat.endTurn({
      currentOwner: TurnOwner.PLAYER,
      player: this.player,
      enemy: this.enemy,
    });
    // Don't reset turnOwner here - it will be set back after enemy acts
  }

  handleLevelUp(levelResult) {
    const { newLevel, statIncreases, levelsGained } = levelResult;
    
    this.eventBus.emit("log", {
      type: "levelup",
      text: `🎉 LEVEL UP! Livello ${newLevel} raggiunto!`,
    });

    // Log stat increases
    const statTexts = [];
    if (statIncreases.maxHealth) statTexts.push(`Salute +${Math.floor(statIncreases.maxHealth)}`);
    if (statIncreases.maxMana) statTexts.push(`Mana +${Math.floor(statIncreases.maxMana)}`);
    if (statIncreases.attackPower) statTexts.push(`Attacco +${Math.floor(statIncreases.attackPower)}`);
    if (statIncreases.magicPower) statTexts.push(`Magia +${Math.floor(statIncreases.magicPower)}`);
    if (statIncreases.techPower) statTexts.push(`Tech +${Math.floor(statIncreases.techPower)}`);
    
    if (statTexts.length > 0) {
      this.eventBus.emit("log", {
        type: "levelup",
        text: `📊 ${statTexts.join(", ")}`,
      });
    }

    // Check for unlocks
    const unlocks = this.levelingSystem.getUnlockedAbilities(this.player, newLevel);
    for (const unlock of unlocks) {
      this.eventBus.emit("log", {
        type: "unlock",
        text: `🔓 ${unlock.description}`,
      });
      
      // Handle specific unlock types
      if (unlock.type === "ability_slot") {
        this.addRandomAbilityToPlayer();
      } else if (unlock.type === "ultimate") {
        this.addUltimateAbilityToPlayer();
      }
    }

    // Emit event for UI
    this.eventBus.emit("player:levelup", { 
      player: this.player,
      levelResult 
    });
  }

  addRandomAbilityToPlayer() {
    if (!this.player) return;
    const category = [AbilityCategory.ATTACK, AbilityCategory.DEFENSE, AbilityCategory.SUPPORT][
      Math.floor(Math.random() * 3)
    ];
    const newAbility = this.generator.generateHybridAbility({
      level: this.player.level,
      affinities: this.player.affinities,
      category,
    });
    this.player.abilities.push(newAbility);
    this.eventBus.emit("log", {
      type: "unlock",
      text: `✨ Nuova abilità sbloccata: ${newAbility.name}`,
    });
  }

  addUltimateAbilityToPlayer() {
    if (!this.player) return;
    // Create a powerful ultimate ability
    const ultimate = this.generator.generateHybridAbility({
      level: this.player.level,
      affinities: this.player.affinities,
      category: AbilityCategory.ATTACK,
      isUltimate: true,
    });
    this.player.abilities.push(ultimate);
    this.eventBus.emit("log", {
      type: "unlock",
      text: `⚡ ULTIMATE sbloccata: ${ultimate.name}`,
    });
  }
}