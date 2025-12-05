import { Projectile } from "../entities/Projectile.js";
import { FloatingText } from "../entities/FloatingText.js";

export class CombatSystem {
  constructor(towers, enemies, projectiles, floatingTexts, levelManager) {
    this.towers = towers;
    this.enemies = enemies;
    this.projectiles = projectiles;
    this.floatingTexts = floatingTexts;
    this.levelManager = levelManager;
    this.soundLibrary = null;
  }

  /**
   * Set the sound library for audio playback
   */
  setSoundLibrary(soundLibrary) {
    this.soundLibrary = soundLibrary;
  }

  reset() {
    // No-op for now, reserved for future behaviour
  }

  update(deltaTime) {
    this.towers.forEach((tower) => {
      tower.update(deltaTime);
      
      // Trova target anche se non può ancora sparare (per tracking)
      const target = this._findTargetForTower(tower);
      tower.setTarget(target);
      
      if (!tower.canFire()) return;
      if (!target) return;

      tower.resetCooldown();

      // Skip projectile creation for towers that handle their own attacks (e.g., LaserTower)
      if (tower.usesProjectiles === false) return;

      const origin = tower.mesh.position.clone().add(
        tower.getMuzzleOffset()
      );
      const projectile = new Projectile(
        origin,
        target,
        tower.damage,
        tower.projectileColor,
        this.floatingTexts,
        tower.projectileType, // Pass projectile type
        tower, // Pass tower for skill effects
        this.soundLibrary, // Pass sound library
        this.enemies // Pass enemies array for AOE damage
      );
      projectile.addToScene(tower.mesh.parent);
      this.projectiles.push(projectile);
    });
  }

  _findTargetForTower(tower) {
    const origin = tower.mesh.position;
    let closestEnemy = null;
    let minDistance = Infinity;

    this.enemies.forEach((enemy) => {
      if (enemy.isDisposed) return;
      const dist = origin.distanceTo(enemy.mesh.position);
      if (dist <= tower.range && dist < minDistance) {
        closestEnemy = enemy;
        minDistance = dist;
      }
    });

    return closestEnemy;
  }
}

