/**
 * Targeting Policies - Strategy Pattern for tower targeting
 * Follows Strategy Pattern and Open/Closed Principle
 */

/**
 * Base interface for all targeting policies
 */
export class TargetingPolicy {
  constructor(name, description) {
    this.name = name;
    this.description = description;
  }

  /**
   * Select the best target from available enemies
   * @param {Array} enemies - Array of enemy objects in range
   * @param {Object} tower - Tower instance doing the targeting
   * @param {Object} gameWorld - Reference to game world for path/base info
   * @returns {Object|null} Selected enemy or null
   */
  selectTarget(enemies, tower, gameWorld) {
    throw new Error('selectTarget must be implemented by subclass');
  }
}

/**
 * Target the weakest enemy (lowest HP)
 */
export class WeakestTargetPolicy extends TargetingPolicy {
  constructor() {
    super('Weakest', 'Attacca il nemico più debole (HP minore)');
  }

  selectTarget(enemies, tower, gameWorld) {
    if (!enemies || enemies.length === 0) return null;

    let weakest = enemies[0];
    let minHp = weakest.hp;

    for (let i = 1; i < enemies.length; i++) {
      if (enemies[i].hp < minHp) {
        minHp = enemies[i].hp;
        weakest = enemies[i];
      }
    }

    return weakest;
  }
}

/**
 * Target the strongest enemy (highest HP)
 */
export class StrongestTargetPolicy extends TargetingPolicy {
  constructor() {
    super('Strongest', 'Attacca il nemico più forte (HP maggiore)');
  }

  selectTarget(enemies, tower, gameWorld) {
    if (!enemies || enemies.length === 0) return null;

    let strongest = enemies[0];
    let maxHp = strongest.hp;

    for (let i = 1; i < enemies.length; i++) {
      if (enemies[i].hp > maxHp) {
        maxHp = enemies[i].hp;
        strongest = enemies[i];
      }
    }

    return strongest;
  }
}

/**
 * Target the closest enemy to the tower
 */
export class ClosestTargetPolicy extends TargetingPolicy {
  constructor() {
    super('Closest', 'Attacca il nemico più vicino alla torre');
  }

  selectTarget(enemies, tower, gameWorld) {
    if (!enemies || enemies.length === 0) return null;

    const towerPos = tower.position;
    let closest = enemies[0];
    let minDistance = this._getDistance(towerPos, closest.mesh.position);

    for (let i = 1; i < enemies.length; i++) {
      const distance = this._getDistance(towerPos, enemies[i].mesh.position);
      if (distance < minDistance) {
        minDistance = distance;
        closest = enemies[i];
      }
    }

    return closest;
  }

  _getDistance(pos1, pos2) {
    const dx = pos1.x - pos2.x;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dz * dz);
  }
}

/**
 * Target the enemy closest to the base (most advanced on path)
 */
export class NearestToBasePolicy extends TargetingPolicy {
  constructor() {
    super('Nearest to Base', 'Attacca il nemico più vicino alla base');
  }

  selectTarget(enemies, tower, gameWorld) {
    if (!enemies || enemies.length === 0) return null;

    // Gli enemy più avanti nel path hanno pathIndex più alto
    let nearest = enemies[0];
    let maxProgress = this._getPathProgress(nearest);

    for (let i = 1; i < enemies.length; i++) {
      const progress = this._getPathProgress(enemies[i]);
      if (progress > maxProgress) {
        maxProgress = progress;
        nearest = enemies[i];
      }
    }

    return nearest;
  }

  _getPathProgress(enemy) {
    // Combina pathIndex con la distanza percorsa nel segmento corrente
    // per avere una misura precisa di quanto è avanti
    const baseProgress = enemy.pathIndex || 0;
    const segmentProgress = enemy.pathProgress || 0;
    return baseProgress + segmentProgress;
  }
}

/**
 * Target the first enemy (FIFO - First In First Out)
 */
export class FirstTargetPolicy extends TargetingPolicy {
  constructor() {
    super('First', 'Attacca il primo nemico entrato (FIFO)');
  }

  selectTarget(enemies, tower, gameWorld) {
    if (!enemies || enemies.length === 0) return null;

    // Gli enemy hanno un timestamp di spawn
    let first = enemies[0];
    let minSpawnTime = first.spawnTime || 0;

    for (let i = 1; i < enemies.length; i++) {
      const spawnTime = enemies[i].spawnTime || 0;
      if (spawnTime < minSpawnTime) {
        minSpawnTime = spawnTime;
        first = enemies[i];
      }
    }

    return first;
  }
}

/**
 * Target the last enemy (LIFO - Last In First Out)
 */
export class LastTargetPolicy extends TargetingPolicy {
  constructor() {
    super('Last', 'Attacca l\'ultimo nemico entrato (LIFO)');
  }

  selectTarget(enemies, tower, gameWorld) {
    if (!enemies || enemies.length === 0) return null;

    let last = enemies[0];
    let maxSpawnTime = last.spawnTime || 0;

    for (let i = 1; i < enemies.length; i++) {
      const spawnTime = enemies[i].spawnTime || 0;
      if (spawnTime > maxSpawnTime) {
        maxSpawnTime = spawnTime;
        last = enemies[i];
      }
    }

    return last;
  }
}

/**
 * Factory for creating targeting policies
 */
export class TargetingPolicyFactory {
  constructor() {
    this.policies = new Map();
    this._registerDefaultPolicies();
  }

  _registerDefaultPolicies() {
    this.register(new WeakestTargetPolicy());
    this.register(new StrongestTargetPolicy());
    this.register(new ClosestTargetPolicy());
    this.register(new NearestToBasePolicy());
    this.register(new FirstTargetPolicy());
    this.register(new LastTargetPolicy());
  }

  register(policy) {
    this.policies.set(policy.name, policy);
  }

  getPolicy(name) {
    return this.policies.get(name);
  }

  getAllPolicies() {
    return Array.from(this.policies.values());
  }

  getPolicyNames() {
    return Array.from(this.policies.keys());
  }
}

// Export singleton factory
export const targetingPolicyFactory = new TargetingPolicyFactory();
