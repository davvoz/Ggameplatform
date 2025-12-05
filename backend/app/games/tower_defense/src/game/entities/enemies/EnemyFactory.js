import { GruntEnemy } from "./GruntEnemy.js";
import { TankEnemy } from "./TankEnemy.js";
import { SwarmEnemy } from "./SwarmEnemy.js";

/**
 * Enemy Factory - Factory Pattern
 * Creates the appropriate enemy type based on configuration
 * Follows Open/Closed Principle - easy to add new enemy types
 */
export class EnemyFactory {
  static createEnemy(pathPoints, waveConfig) {
    const type = waveConfig.type || "grunt";
    
    switch (type) {
      case "tank":
        return new TankEnemy(pathPoints, waveConfig);
      case "swarm":
        return new SwarmEnemy(pathPoints, waveConfig);
      case "grunt":
      default:
        return new GruntEnemy(pathPoints, waveConfig);
    }
  }
}
