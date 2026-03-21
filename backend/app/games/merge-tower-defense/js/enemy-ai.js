/**
 * Enemy AI System
 * OOP-based intelligent movement for enemies
 * Handles lane switching, obstacle avoidance, and tactical positioning
 */

import { CONFIG } from './config.js';
import { Utils } from './utils.js';

// ========== BASE MOVEMENT STRATEGY ==========

/**
 * Base class for movement strategies
 * Follows Strategy Pattern for clean AI behavior separation
 */
export class MovementStrategy {
    constructor(config = {}) {
        this.config = config;
    }

    /**
     * Calculate desired movement for an enemy
     * @param {Object} enemy - The enemy to move
     * @param {Object} context - Movement context (dt, allEnemies, obstacles, etc.)
     * @returns {Object} - { col, row } delta movement
     */
    calculateMovement(enemy, context) {
        throw new Error('calculateMovement() must be implemented by subclass');
    }
}

// ========== AVOIDANCE BEHAVIOR ==========

/**
 * Handles collision avoidance between enemies
 */
export class AvoidanceBehavior {
    constructor(config = {}) {
        this.detectionRadius = config.detectionRadius || 1.2;
        this.avoidanceStrength = config.avoidanceStrength || 0.8;
        this.personalSpace = config.personalSpace || 0.5;
    }

    /**
     * Calculate avoidance force from nearby enemies
     * @param {Object} enemy - The enemy
     * @param {Array} allEnemies - All enemies in the game
     * @returns {Object} - { x, y } avoidance force
     */
    calculateAvoidance(enemy, allEnemies) {
        let forceX = 0;
        let forceY = 0;
        let neighborCount = 0;

        for (const other of allEnemies) {
            if (other === enemy || other.isDead()) continue;

            const dx = enemy.col - other.col;
            const dy = enemy.row - other.row;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 0 && distance < this.detectionRadius) {
                // Stronger avoidance when very close
                const strength = (this.detectionRadius - distance) / this.detectionRadius;
                const normalizedDx = dx / distance;
                const normalizedDy = dy / distance;

                forceX += normalizedDx * strength * this.avoidanceStrength;
                forceY += normalizedDy * strength * this.avoidanceStrength;
                neighborCount++;
            }
        }

        // Normalize by neighbor count
        if (neighborCount > 0) {
            forceX /= neighborCount;
            forceY /= neighborCount;
        }

        return { x: forceX, y: forceY };
    }

    /**
     * Check if a position is too close to other enemies
     * @param {number} col - Target column
     * @param {number} row - Target row
     * @param {Object} enemy - The enemy checking
     * @param {Array} allEnemies - All enemies
     * @returns {boolean}
     */
    isPositionCrowded(col, row, enemy, allEnemies) {
        for (const other of allEnemies) {
            if (other === enemy || other.isDead()) continue;

            const dx = col - other.col;
            const dy = row - other.row;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.personalSpace) {
                return true;
            }
        }
        return false;
    }
}

// ========== LANE SYSTEM ==========

/**
 * Manages lane-based movement for grid
 */
export class LaneSystem {
    constructor(config = {}) {
        this.laneCount = config.laneCount || CONFIG.COLS;
        this.laneSwitchCooldown = config.laneSwitchCooldown || 1.0;
        this.laneSwitchSpeed = config.laneSwitchSpeed || 2.0;
        this.lookAheadRows = config.lookAheadRows || 3;
    }

    /**
     * Get the current lane for an enemy (based on column)
     * @param {Object} enemy - The enemy
     * @returns {number} - Lane index
     */
    getCurrentLane(enemy) {
        return Math.round(enemy.col);
    }

    /**
     * Score a lane based on traffic and threats
     * @param {number} laneIndex - Lane to score
     * @param {Object} enemy - The enemy considering the lane
     * @param {Array} allEnemies - All enemies
     * @param {Array} cannons - All towers
     * @returns {number} - Score (lower is better)
     */
    scoreLane(laneIndex, enemy, allEnemies, cannons = []) {
        let score = 0;

        // Penalize lanes with enemies ahead
        for (const other of allEnemies) {
            if (other === enemy || other.isDead()) continue;

            const otherLane = this.getCurrentLane(other);
            if (otherLane !== laneIndex) continue;

            // Enemy in same lane and ahead
            if (other.row > enemy.row && other.row < enemy.row + this.lookAheadRows) {
                const rowDiff = other.row - enemy.row;
                score += (this.lookAheadRows - rowDiff) * 2; // Closer = worse
            }

            // Enemy very close in same lane
            if (Math.abs(other.row - enemy.row) < 1) {
                score += 5;
            }
        }

        // Slight penalty for tower coverage
        for (const cannon of cannons) {
            const dist = Math.abs(cannon.col - laneIndex);
            if (dist <= cannon.range) {
                score += 0.5; // Small penalty for being in range
            }
        }

        // Slight preference for center lanes (more maneuvering room)
        const distFromCenter = Math.abs(laneIndex - (this.laneCount - 1) / 2);
        score += distFromCenter * 0.1;

        return score;
    }

    /**
     * Find best available lane
     * @param {Object} enemy - The enemy
     * @param {Array} allEnemies - All enemies
     * @param {Array} cannons - All towers
     * @returns {number|null} - Best lane index or null if current is best
     */
    findBestLane(enemy, allEnemies, cannons = []) {
        const currentLane = this.getCurrentLane(enemy);
        const currentScore = this.scoreLane(currentLane, enemy, allEnemies, cannons);

        let bestLane = currentLane;
        let bestScore = currentScore;

        // Check adjacent lanes
        const lanesToCheck = [
            currentLane - 1,
            currentLane + 1
        ].filter(lane => lane >= 0 && lane < this.laneCount);

        for (const lane of lanesToCheck) {
            const score = this.scoreLane(lane, enemy, allEnemies, cannons);
            if (score < bestScore - 0.5) { // Threshold to avoid constant switching
                bestScore = score;
                bestLane = lane;
            }
        }

        return bestLane !== currentLane ? bestLane : null;
    }
}

// ========== OBSTACLE DETECTION ==========

/**
 * Handles obstacle detection and avoidance
 */
export class ObstacleDetector {
    constructor() {
        this.wallRow = this.calculateWallRow();
    }

    calculateWallRow() {
        const brickRows = 4;
        const brickHeightCells = brickRows * 0.22;
        return (CONFIG.ROWS - CONFIG.DEFENSE_ZONE_ROWS) - brickHeightCells - 0.85;
    }

    /**
     * Check if position is blocked by wall
     * @param {number} row - Row to check
     * @returns {boolean}
     */
    isBlockedByWall(row) {
        return row >= this.wallRow;
    }

    /**
     * Check if position is within grid bounds
     * @param {number} col - Column
     * @param {number} row - Row
     * @returns {boolean}
     */
    isInBounds(col, row) {
        return col >= 0 && col < CONFIG.COLS && row >= -1 && row < CONFIG.ROWS;
    }

    /**
     * Get wall row
     * @returns {number}
     */
    getWallRow() {
        return this.wallRow;
    }
}

// ========== RETREAT BEHAVIOR ==========

/**
 * Handles tactical retreat when blocked
 */
export class RetreatBehavior {
    constructor(config = {}) {
        this.retreatDistance = config.retreatDistance || 0.5;
        this.retreatDuration = config.retreatDuration || 0.5;
        this.retreatCooldown = config.retreatCooldown || 2.0;
    }

    /**
     * Check if enemy should retreat
     * @param {Object} enemy - The enemy
     * @param {Array} allEnemies - All enemies
     * @returns {boolean}
     */
    shouldRetreat(enemy, allEnemies) {
        // Don't retreat if already retreating
        if (enemy._isRetreating) return false;
        
        // Check retreat cooldown
        if (enemy._lastRetreatTime && 
            performance.now() - enemy._lastRetreatTime < this.retreatCooldown * 1000) {
            return false;
        }

        // Count enemies very close ahead
        let blockers = 0;
        for (const other of allEnemies) {
            if (other === enemy || other.isDead()) continue;

            const dx = Math.abs(enemy.col - other.col);
            const dy = other.row - enemy.row;

            // Enemy is directly ahead and very close
            if (dx < 0.5 && dy > 0 && dy < 0.8) {
                blockers++;
            }
        }

        return blockers >= 2; // Retreat if blocked by 2+ enemies
    }

    /**
     * Execute retreat
     * @param {Object} enemy - The enemy
     * @param {number} dt - Delta time
     * @returns {Object} - Movement delta
     */
    executeRetreat(enemy, dt) {
        if (!enemy._isRetreating) {
            enemy._isRetreating = true;
            enemy._retreatTimer = this.retreatDuration;
            enemy._lastRetreatTime = performance.now();
        }

        enemy._retreatTimer -= dt;

        if (enemy._retreatTimer <= 0) {
            enemy._isRetreating = false;
            return { col: 0, row: 0 };
        }

        // Move backward slightly
        return {
            col: 0,
            row: -this.retreatDistance * dt * 2
        };
    }
}

// ========== MAIN MOVEMENT CONTROLLER ==========

/**
 * Main movement controller that orchestrates all behaviors
 */
export class EnemyMovementController {
    constructor(config = {}) {
        this.avoidance = new AvoidanceBehavior(config.avoidance || {});
        this.laneSystem = new LaneSystem(config.lanes || {});
        this.obstacles = new ObstacleDetector();
        this.retreat = new RetreatBehavior(config.retreat || {});

        // Movement parameters
        this.baseSpeed = config.baseSpeed || 1.0;
        this.lateralSpeedFactor = config.lateralSpeedFactor || 0.5;
        this.smoothingFactor = config.smoothingFactor || 0.15;
    }

    /**
     * Update enemy movement
     * @param {Object} enemy - The enemy to update
     * @param {number} dt - Delta time
     * @param {number} currentTime - Current timestamp
     * @param {Array} allEnemies - All enemies
     * @param {Array} cannons - All towers (optional)
     */
    updateMovement(enemy, dt, currentTime, allEnemies, cannons = []) {
        // Skip if dead
        if (enemy.isDead()) return;

        // Skip if stunned
        if (enemy.stunnedUntil && currentTime < enemy.stunnedUntil) {
            return; // Cannot move while stunned
        }

        // Calculate effective speed (with slow effects)
        const effectiveSpeed = currentTime < enemy.slowUntil 
            ? enemy.speed * enemy.slowFactor 
            : enemy.speed;

        // Initialize target column if not set
        if (enemy._targetCol === undefined) {
            enemy._targetCol = enemy.col;
        }

        // Store reference to all enemies for helper methods
        enemy._allEnemies = allEnemies;

        // Get wall position
        const wallRow = this.obstacles.getWallRow();

        // === PHASE 1: Determine primary movement ===
        let deltaCol = 0;
        let deltaRow = 0;

        // Check for retreat first
        if (this.retreat.shouldRetreat(enemy, allEnemies)) {
            const retreatDelta = this.retreat.executeRetreat(enemy, dt);
            deltaCol = retreatDelta.col;
            deltaRow = retreatDelta.row;
        } else if (enemy._isRetreating) {
            // Continue retreat
            const retreatDelta = this.retreat.executeRetreat(enemy, dt);
            deltaCol = retreatDelta.col;
            deltaRow = retreatDelta.row;
        } else {
            // Normal forward movement
            deltaRow = effectiveSpeed * dt;
        }

        // === PHASE 2: Lane switching decision ===
        if (!enemy._isRetreating && enemy._laneSwitchCooldown <= 0) {
            const bestLane = this.laneSystem.findBestLane(enemy, allEnemies, cannons);
            
            if (bestLane !== null) {
                enemy._targetCol = bestLane;
                enemy._laneSwitchCooldown = this.laneSystem.laneSwitchCooldown;
            }
        }

        // Update cooldown
        if (enemy._laneSwitchCooldown > 0) {
            enemy._laneSwitchCooldown -= dt;
        }

        // === PHASE 3: Avoidance forces ===
        const avoidanceForce = this.avoidance.calculateAvoidance(enemy, allEnemies);
        
        // Apply avoidance to target column
        if (Math.abs(avoidanceForce.x) > 0.1) {
            enemy._targetCol = Math.max(0, Math.min(CONFIG.COLS - 1, 
                enemy._targetCol + avoidanceForce.x * dt * 2));
        }

        // Slow down if blocked ahead
        if (avoidanceForce.y < -0.2) {
            deltaRow *= Math.max(0.3, 1 + avoidanceForce.y * 0.5);
        }

        // === PHASE 4: Lateral movement towards target column ===
        const colDiff = enemy._targetCol - enemy.col;
        if (Math.abs(colDiff) > 0.05) {
            const lateralSpeed = effectiveSpeed * this.lateralSpeedFactor * this.laneSystem.laneSwitchSpeed;
            deltaCol += Math.sign(colDiff) * Math.min(Math.abs(colDiff), lateralSpeed * dt);
        }

        // === PHASE 5: Apply movement with bounds checking ===
        let newCol = enemy.col + deltaCol;
        let newRow = enemy.row + deltaRow;

        // Clamp to grid bounds
        newCol = Math.max(0.2, Math.min(CONFIG.COLS - 1.2, newCol));
        
        // Stop at wall
        if (newRow > wallRow) {
            newRow = wallRow;
        }

        // Don't move backward past spawn (except for retreat)
        if (newRow < -1 && !enemy._isRetreating) {
            newRow = -1;
        }

        // === PHASE 6: Final collision check ===
        // Check if new position is crowded
        if (!enemy._isRetreating && this.avoidance.isPositionCrowded(newCol, newRow, enemy, allEnemies)) {
            // Try to adjust position slightly
            const adjustments = [
                { col: newCol - 0.3, row: newRow },
                { col: newCol + 0.3, row: newRow },
                { col: enemy.col, row: enemy.row + deltaRow * 0.5 }
            ];

            for (const adj of adjustments) {
                if (!this.avoidance.isPositionCrowded(adj.col, adj.row, enemy, allEnemies) &&
                    adj.col >= 0.2 && adj.col <= CONFIG.COLS - 1.2) {
                    newCol = adj.col;
                    newRow = adj.row;
                    break;
                }
            }
        }

        // === PHASE 7: Apply final position ===
        enemy.col = newCol;
        enemy.row = newRow;

        // Update target column to match if very close
        if (Math.abs(enemy.col - enemy._targetCol) < 0.1) {
            enemy._targetCol = enemy.col;
        }

        // Set atWall flag
        enemy.atWall = newRow >= wallRow - 0.1;
    }

    /**
     * Initialize enemy AI state
     * @param {Object} enemy - The enemy
     */
    initializeEnemy(enemy) {
        enemy._targetCol = enemy.col;
        enemy._laneSwitchCooldown = Math.random() * 0.5; // Stagger initial switches
        enemy._isRetreating = false;
        enemy._retreatTimer = 0;
        enemy._lastRetreatTime = 0;
    }
}

// ========== SPECIALIZED MOVEMENT STRATEGIES ==========

/**
 * Fast enemy movement - more aggressive lane switching
 */
export class RusherMovementStrategy extends MovementStrategy {
    constructor(controller) {
        super();
        this.controller = controller;
        // Rushers switch lanes more aggressively
        this.controller.laneSystem.laneSwitchCooldown = 0.5;
        this.controller.laneSystem.laneSwitchSpeed = 3.0;
    }

    calculateMovement(enemy, context) {
        this.controller.updateMovement(
            enemy, 
            context.dt, 
            context.currentTime, 
            context.allEnemies,
            context.cannons
        );
    }
}

/**
 * Tank enemy movement - slower, less evasive
 */
export class TankMovementStrategy extends MovementStrategy {
    constructor(controller) {
        super();
        this.controller = controller;
        // Tanks don't switch lanes much
        this.controller.laneSystem.laneSwitchCooldown = 3.0;
        this.controller.laneSystem.laneSwitchSpeed = 0.5;
        this.controller.avoidance.avoidanceStrength = 0.3;
    }

    calculateMovement(enemy, context) {
        this.controller.updateMovement(
            enemy, 
            context.dt, 
            context.currentTime, 
            context.allEnemies,
            context.cannons
        );
    }
}

/**
 * Flyer enemy movement - can bypass ground obstacles
 */
export class FlyerMovementStrategy extends MovementStrategy {
    constructor(controller) {
        super();
        this.controller = controller;
        // Flyers have reduced avoidance (they fly over)
        this.controller.avoidance.detectionRadius = 0.6;
        this.controller.avoidance.personalSpace = 0.3;
    }

    calculateMovement(enemy, context) {
        this.controller.updateMovement(
            enemy, 
            context.dt, 
            context.currentTime, 
            context.allEnemies,
            context.cannons
        );
    }
}

/**
 * Boss enemy movement - slow, methodical, less reactive
 */
export class BossMovementStrategy extends MovementStrategy {
    constructor(controller) {
        super();
        this.controller = controller;
        // Bosses don't change lanes, they push through
        this.controller.laneSystem.laneSwitchCooldown = 10.0;
        this.controller.avoidance.avoidanceStrength = 0.1;
        this.controller.retreat.retreatCooldown = 999; // Never retreat
    }

    calculateMovement(enemy, context) {
        this.controller.updateMovement(
            enemy, 
            context.dt, 
            context.currentTime, 
            context.allEnemies,
            context.cannons
        );
    }
}

// ========== AI SYSTEM MANAGER ==========

/**
 * Manages AI for all enemies - singleton-ish pattern
 */
export class EnemyAISystem {
    constructor() {
        // Create specialized controllers for each type
        this.controllers = {
            default: new EnemyMovementController(),
            rusher: new EnemyMovementController({
                lanes: { laneSwitchCooldown: 0.5, laneSwitchSpeed: 3.0 },
                avoidance: { detectionRadius: 1.0, avoidanceStrength: 1.0 }
            }),
            tank: new EnemyMovementController({
                lanes: { laneSwitchCooldown: 3.0, laneSwitchSpeed: 0.5 },
                avoidance: { avoidanceStrength: 0.3 }
            }),
            flyer: new EnemyMovementController({
                avoidance: { detectionRadius: 0.6, personalSpace: 0.3 }
            }),
            boss: new EnemyMovementController({
                lanes: { laneSwitchCooldown: 10.0 },
                avoidance: { avoidanceStrength: 0.1 },
                retreat: { retreatCooldown: 999 }
            }),
            healer: new EnemyMovementController({
                lanes: { laneSwitchCooldown: 2.0 },
                // Healers try to stay behind
            }),
            shadow: new EnemyMovementController({
                lanes: { laneSwitchCooldown: 0.3, laneSwitchSpeed: 4.0 },
                avoidance: { detectionRadius: 0.5 }
            })
        };
    }

    /**
     * Get controller for enemy type
     * @param {string} type - Enemy type
     * @returns {EnemyMovementController}
     */
    getController(type) {
        const typeMap = {
            'RUSHER': 'rusher',
            'TANK': 'tank',
            'ARMORED': 'tank',
            'GOLEM': 'boss',
            'FLYER': 'flyer',
            'BOSS': 'boss',
            'HEALER': 'healer',
            'SHADOW': 'shadow',
            'PHASER': 'rusher'
        };

        const controllerKey = typeMap[type] || 'default';
        return this.controllers[controllerKey];
    }

    /**
     * Initialize AI for a new enemy
     * @param {Object} enemy - The enemy
     */
    initializeEnemy(enemy) {
        const controller = this.getController(enemy.type);
        controller.initializeEnemy(enemy);
    }

    /**
     * Update all enemies
     * @param {Array} enemies - All enemies
     * @param {number} dt - Delta time
     * @param {number} currentTime - Current timestamp
     * @param {Array} cannons - All towers
     */
    updateAll(enemies, dt, currentTime, cannons = []) {
        for (const enemy of enemies) {
            if (enemy.isDead()) continue;

            const controller = this.getController(enemy.type);
            controller.updateMovement(enemy, dt, currentTime, enemies, cannons);
        }
    }
}

// Export singleton instance
export const enemyAI = new EnemyAISystem();
