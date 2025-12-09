/**
 * Collision System - Modular collision detection following SOLID principles
 * 
 * Architecture:
 * - CollisionHandler: Abstract base class for all collision handlers (SRP)
 * - CollisionContext: Dependency injection container (DIP)
 * - Specific Handlers: Each handles one type of collision (SRP, OCP)
 * - CollisionDetector: Orchestrator that delegates to handlers (OCP, LSP)
 * 
 * Benefits:
 * - Easy to add new collision types (just create a new handler)
 * - Each handler is testable in isolation
 * - Shared logic is extracted to base classes (DRY)
 * - No duplication of damage/protection/particle logic
 * - SonarQube compliant (low complexity, high cohesion)
 */

export { CollisionHandler } from './CollisionHandler.js';
export { CollisionContext } from './CollisionContext.js';
export { DamageCollisionHandler } from './DamageCollisionHandler.js';
export { PowerupCollisionHandler } from './PowerupCollisionHandler.js';

// Specific handlers
export { PlatformCollisionHandler } from './PlatformCollisionHandler.js';
export { ObstacleCollisionHandler } from './ObstacleCollisionHandler.js';
export { CollectibleCollisionHandler } from './CollectibleCollisionHandler.js';
export { EnemyCollisionHandler } from './EnemyCollisionHandler.js';
export { HeartCollisionHandler, ShieldCollisionHandler, MagnetCollisionHandler, BoostCollisionHandler } from './BasicPowerupHandlers.js';
export { AdvancedBonusHandler } from './AdvancedBonusHandler.js';
