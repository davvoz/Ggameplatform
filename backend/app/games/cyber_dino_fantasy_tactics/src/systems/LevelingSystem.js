/**
 * LevelingSystem: Gestisce l'XP, il livellamento e la progressione del personaggio
 */

export class LevelingSystem {
  constructor() {
    // Formula: XP richiesto = 100 * livello^1.5
    this.xpCurve = (level) => Math.floor(100 * Math.pow(level, 1.5));
  }

  /**
   * Calcola l'XP richiesto per raggiungere il livello successivo
   */
  getXPForLevel(level) {
    return this.xpCurve(level);
  }

  /**
   * Calcola l'XP totale necessario per raggiungere un certo livello
   */
  getTotalXPForLevel(level) {
    let total = 0;
    for (let i = 1; i < level; i++) {
      total += this.getXPForLevel(i);
    }
    return total;
  }

  /**
   * Aggiunge XP al personaggio e gestisce il livellamento
   * Ritorna: { leveledUp: boolean, newLevel: number, statIncreases: object }
   */
  addXP(character, xpAmount) {
    if (!character.xp) character.xp = 0;
    if (!character.totalXP) character.totalXP = 0;

    character.xp += xpAmount;
    character.totalXP += xpAmount;

    const results = [];
    const xpForNext = this.getXPForLevel(character.level);

    // Gestisce livelli multipli se l'XP guadagnato è molto alto
    while (character.xp >= xpForNext) {
      character.xp -= xpForNext;
      const levelUpResult = this.levelUp(character);
      results.push(levelUpResult);
    }

    if (results.length > 0) {
      // Combina tutti i risultati dei level up
      const totalStatIncreases = {};
      for (const result of results) {
        for (const [stat, value] of Object.entries(result.statIncreases)) {
          totalStatIncreases[stat] = (totalStatIncreases[stat] || 0) + value;
        }
      }

      return {
        leveledUp: true,
        newLevel: character.level,
        statIncreases: totalStatIncreases,
        levelsGained: results.length,
      };
    }

    return {
      leveledUp: false,
      newLevel: character.level,
      statIncreases: {},
      levelsGained: 0,
    };
  }

  /**
   * Incrementa il livello del personaggio e aumenta le statistiche
   */
  levelUp(character) {
    const oldLevel = character.level;
    character.level++;

    // Calcola incrementi statistiche basati sul livello
    const statIncreases = this.calculateStatIncreases(character);

    // Applica incrementi alle statistiche base
    this.applyStatIncreases(character, statIncreases);

    // Ripristina risorse al massimo dopo il level up
    this.restoreResources(character);

    return {
      leveledUp: true,
      oldLevel,
      newLevel: character.level,
      statIncreases,
    };
  }

  /**
   * Calcola gli incrementi delle statistiche in base alle affinità del personaggio
   */
  calculateStatIncreases(character) {
    const affinities = character.affinities;
    const arcane = affinities.ARCANE || 0;
    const tech = affinities.TECH || 0;
    const primal = affinities.PRIMAL || 0;

    // Incrementi base per livello
    const baseIncrease = {
      maxHealth: 15 + Math.floor(10 * primal),
      maxMana: 8 + Math.floor(12 * arcane),
      maxEnergy: 8 + Math.floor(12 * primal),
      maxShield: 5 + Math.floor(15 * tech),
      attackPower: 2 + Math.floor(3 * primal),
      techPower: 2 + Math.floor(4 * tech),
      magicPower: 2 + Math.floor(4 * arcane),
      vitality: 2 + Math.floor(2 * primal),
      agility: 2 + Math.floor(2 * tech),
      armor: 1 + Math.floor(2 * primal),
      shieldArmor: Math.floor(2 * tech),
      critChance: 0.005 + 0.005 * tech,
      dodgeChance: 0.003 + 0.003 * primal,
      haste: 0.002 * tech,
    };

    // Ogni 5 livelli, bonus extra
    if (character.level % 5 === 0) {
      baseIncrease.maxHealth += 25;
      baseIncrease.critChance += 0.01;
      baseIncrease.critMultiplier = (baseIncrease.critMultiplier || 0) + 0.05;
    }

    // Ogni 10 livelli, bonus maggiore
    if (character.level % 10 === 0) {
      baseIncrease.maxHealth += 50;
      baseIncrease.attackPower += 5;
      baseIncrease.techPower += 5;
      baseIncrease.magicPower += 5;
    }

    return baseIncrease;
  }

  /**
   * Applica gli incrementi delle statistiche al personaggio
   */
  applyStatIncreases(character, statIncreases) {
    const stats = character.baseStats;
    
    for (const [stat, increase] of Object.entries(statIncreases)) {
      if (typeof stats[stat] === "number") {
        stats[stat] += increase;
      }
    }

    // Aggiorna i massimali tracciati per il refresh delle risorse
    character._lastMaxMana = stats.maxMana;
    character._lastMaxEnergy = stats.maxEnergy;
  }

  /**
   * Ripristina le risorse del personaggio dopo il level up
   */
  restoreResources(character) {
    const totalStats = character.getTotalStats();
    
    character.currentHealth = totalStats.maxHealth;
    character.currentMana = totalStats.maxMana;
    character.currentEnergy = totalStats.maxEnergy;
    character.currentShield = totalStats.maxShield;
  }

  /**
   * Calcola l'XP ricompensa in base al livello del nemico
   */
  calculateXPReward(enemyLevel, playerLevel) {
    const baseXP = 30 + enemyLevel * 10;
    
    // Bonus XP se il nemico è di livello superiore
    const levelDiff = enemyLevel - playerLevel;
    const diffMultiplier = levelDiff > 0 ? 1 + (levelDiff * 0.2) : 1;
    
    return Math.floor(baseXP * diffMultiplier);
  }

  /**
   * Verifica quali nuove abilità si sbloccano a questo livello
   */
  getUnlockedAbilities(character, newLevel) {
    const unlocks = [];

    // Sblocchi a livelli specifici
    if (newLevel === 3) {
      unlocks.push({ type: "ability_slot", description: "Slot abilità extra sbloccato" });
    }
    if (newLevel === 5) {
      unlocks.push({ type: "ultimate", description: "Abilità Ultimate disponibile" });
    }
    if (newLevel === 7) {
      unlocks.push({ type: "ability_slot", description: "Secondo slot abilità extra" });
    }
    if (newLevel === 10) {
      unlocks.push({ type: "passive", description: "Slot passiva sbloccato" });
    }
    if (newLevel % 5 === 0) {
      unlocks.push({ type: "ability_upgrade", description: "Potenziamento abilità disponibile" });
    }

    return unlocks;
  }

  /**
   * Calcola la percentuale di progresso verso il prossimo livello
   */
  getProgressPercent(character) {
    const xp = character.xp || 0;
    const xpForNext = this.getXPForLevel(character.level);
    return Math.min((xp / xpForNext) * 100, 100);
  }
}
