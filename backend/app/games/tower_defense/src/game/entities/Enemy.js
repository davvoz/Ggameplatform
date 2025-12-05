import { EnemyFactory } from "./enemies/EnemyFactory.js";

/**
 * Enemy - Backward compatibility wrapper
 * Delegates to EnemyFactory for creating appropriate enemy types
 * 
 * This class maintains backward compatibility with existing code
 * while delegating to the new OOP structure.
 * 
 * @deprecated For new code, use EnemyFactory.createEnemy() directly
 * 
 * Architecture:
 * - BaseEnemy: Abstract base class with common behavior
 * - GruntEnemy: Standard enemy type
 * - TankEnemy: Heavy, slow, high HP
 * - SwarmEnemy: Fast, fragile, low HP
 * - EnemyFactory: Creates appropriate enemy instances (Factory Pattern)
 * 
 * Follows SOLID principles:
 * - Single Responsibility: Each class has one reason to change
 * - Open/Closed: Easy to add new enemy types without modifying existing code
 * - Liskov Substitution: All enemies can be used interchangeably
 * - Interface Segregation: Clean, focused interfaces
 * - Dependency Inversion: Depends on abstractions (BaseEnemy)
 */
export class Enemy {
  constructor(pathPoints, waveConfig) {
    // Delegate to factory and return the created instance
    return EnemyFactory.createEnemy(pathPoints, waveConfig);
  }
}
