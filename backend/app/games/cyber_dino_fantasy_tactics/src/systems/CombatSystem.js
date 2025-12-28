import { TurnOwner, AbilityCategory } from "../core/Enums.js";

export class CombatSystem {
  constructor({ eventBus }) {
    this.eventBus = eventBus;
  }

  calculateBasicAttack({ attacker, defender }) {
    const stats = attacker.getTotalStats();
    
    // Basic attack costs energy
    const energyCost = Math.ceil(stats.maxEnergy * 0.15);
    if (attacker.currentEnergy < energyCost) {
      this.eventBus.emit("log", {
        type: "system",
        text: `${attacker.name} non ha abbastanza energia per attaccare.`,
      });
      return;
    }
    
    attacker.currentEnergy -= energyCost;
    
    const base = stats.attackPower + stats.vitality * 0.5;
    const variance = base * 0.2 * (Math.random() * 2 - 1);
    let dmg = base + variance;

    const critRoll = Math.random();
    const isCrit = critRoll < stats.critChance;
    if (isCrit) {
      dmg *= stats.critMultiplier;
    }

    const mitigated = Math.max(
      0,
      dmg - (defender.getTotalStats().armor || 0) * 0.4
    );
    const applied = defender.applyDamage(Math.round(mitigated));

    this.eventBus.emit("log", {
      type: "damage",
      text: `${attacker.name} colpisce ${defender.name} per ${Math.round(
        applied
      )} danni${isCrit ? " (CRITICO)" : ""}.`,
    });

    // trigger basic attack animation & floating text
    this.eventBus.emit("combat:basicHit", {
      attacker,
      defender,
      isCrit,
      amount: Math.round(applied),
    });

    if (!defender.isAlive()) {
      this.eventBus.emit("log", {
        type: "system",
        text: `${defender.name} è stato sconfitto.`,
      });
      this.eventBus.emit("character:dead", { character: defender });
    }
  }

  useAbility({ ability, actor, target }) {
    if (!actor.canPayCost(ability.cost)) {
      this.eventBus.emit("log", {
        type: "system",
        text: `${actor.name} non ha risorse sufficienti per ${ability.name}.`,
      });
      return;
    }
    if (actor.getCooldown(ability) > 0) {
      this.eventBus.emit("log", {
        type: "system",
        text: `${ability.name} è ancora in ricarica.`,
      });
      return;
    }

    // Pay cost BEFORE animation so UI updates immediately
    actor.payCost(ability.cost);
    
    // Log resource consumption
    const costParts = [];
    if (ability.cost.mana > 0) costParts.push(`${ability.cost.mana} mana`);
    if (ability.cost.energy > 0) costParts.push(`${ability.cost.energy} energia`);
    if (costParts.length > 0) {
      this.eventBus.emit("log", {
        type: "system",
        text: `${actor.name} consuma ${costParts.join(" e ")}.`,
      });
    }
    
    // Emit event to update UI immediately after resource consumption
    this.eventBus.emit("resources:changed", { character: actor });

    // trigger cast animation
    this.eventBus.emit("combat:abilityCast", {
      ability,
      actor,
      target,
    });

    const ctx = {
      actor,
      target,
      log: (text) => this.eventBus.emit("log", { type: "system", text }),
    };

    ability.execute(ctx);
    actor.setCooldown(ability, ability.cooldown);

    if (!target.isAlive()) {
      this.eventBus.emit("character:dead", { character: target });
    }
  }

  startTurn({ turnOwner }) {
    this.eventBus.emit("turn:start", { owner: turnOwner });
  }

  endTurn({ currentOwner, player, enemy }) {
    if (currentOwner === TurnOwner.PLAYER) {
      player.tickCooldowns();
      // Regenerate enemy resources at start of their turn
      this.regenerateResources(enemy);
      this.startTurn({ turnOwner: TurnOwner.ENEMY });
      // Delay enemy action so player can see it happening
      setTimeout(() => {
        this.performEnemyTurn({ enemy, player });
      }, 800);
    } else {
      enemy.tickCooldowns();
      // Regenerate player resources at start of their turn (after enemy ends)
      this.regenerateResources(player);
      this.eventBus.emit("resources:changed", { character: player });
      this.startTurn({ turnOwner: TurnOwner.PLAYER });
      
      // Check if player can do anything after regeneration
      this.eventBus.emit("turn:checkPlayerActions", { player, enemy });
    }
  }

  regenerateResources(character) {
    // Don't regenerate resources if character is dead
    if (!character.isAlive()) return;
    
    const stats = character.getTotalStats();
    
    // Regenerate 3% of max mana per turn (reduced from 6%)
    const manaRegen = stats.maxMana * 0.03;
    character.currentMana = Math.min(
      character.currentMana + manaRegen,
      stats.maxMana
    );

    // Regenerate 4% of max energy per turn (reduced from 8%)
    const energyRegen = stats.maxEnergy * 0.04;
    character.currentEnergy = Math.min(
      character.currentEnergy + energyRegen,
      stats.maxEnergy
    );
  }

  performEnemyTurn({ enemy, player }) {
    if (!enemy.isAlive() || !player.isAlive()) return;
    const ability =
      enemy.abilities.find((a) => enemy.getCooldown(a) === 0) ?? null;

    if (ability && enemy.canPayCost(ability.cost)) {
      this.useAbility({ ability, actor: enemy, target: player });
    } else {
      this.calculateBasicAttack({ attacker: enemy, defender: player });
    }

    if (!player.isAlive()) return;

    this.eventBus.emit("turn:end", { owner: TurnOwner.ENEMY });
  }
}