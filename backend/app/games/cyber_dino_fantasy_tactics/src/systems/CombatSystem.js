import { TurnOwner, AbilityCategory } from "../core/Enums.js";

export class CombatSystem {
  constructor({ eventBus }) {
    this.eventBus = eventBus;
  }

  calculateBasicAttack({ attacker, defender }) {
    const stats = attacker.getTotalStats();
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

    // trigger cast animation
    this.eventBus.emit("combat:abilityCast", {
      ability,
      actor,
      target,
    });

    actor.payCost(ability.cost);
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
      this.startTurn({ turnOwner: TurnOwner.ENEMY });
      // Delay enemy action so player can see it happening
      setTimeout(() => {
        this.performEnemyTurn({ enemy, player });
      }, 800);
    } else {
      enemy.tickCooldowns();
      this.startTurn({ turnOwner: TurnOwner.PLAYER });
    }
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