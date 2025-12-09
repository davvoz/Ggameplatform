/**
 * EnemySystem - Sistema per gestire nemici, AI, spawning e collisioni
 * Responsabile di update, rimozione, spawn dinamico
 */
import { Enemy } from '../entities/Enemy.js';
import { getEnemyConfig } from '../config/EnemyTypes.js';

export class EnemySystem {
    constructor(entityManager, canvasDimensions, audioManager = null) {
        this.entityManager = entityManager;
        this.dims = canvasDimensions;
        this.player = null; // Will be set from outside
        this.levelManager = null; // Will be set from outside
        this.audioManager = audioManager; // For sound effects
        
        // Enemy spawning (dynamic)
        this.spawnQueue = [];
        this.spawnTimer = 0;
        this.spawnInterval = 15; // Spawn enemy ogni 15 secondi (opzionale)
    }

    /**
     * Set player reference
     */
    setPlayer(player) {
        this.player = player;
    }

    /**
     * Set level manager reference
     */
    setLevelManager(levelManager) {
        this.levelManager = levelManager;
    }

    /**
     * Load enemies from level configuration
     */
    loadEnemiesFromLevel(levelData) {
        if (!levelData || !levelData.enemies) return;

        // Clear existing enemies
        this.entityManager.clearEntities('enemies');

        // Get base speed from level manager (same as platforms)
        const baseSpeed = this.levelManager?.baseSpeed || 180;

        // Spawn enemies from level config
        levelData.enemies.forEach(enemyData => {
            const enemy = new Enemy(
                enemyData.enemyId || enemyData.type, // Support both field names
                enemyData.x,
                enemyData.y,
                enemyData.platformIndex
            );
            
            // CRITICAL: Make enemies move with platforms like before!
            enemy.velocity = -baseSpeed; // Move left with the level scroll
            
            this.entityManager.addEntity('enemies', enemy);
        });

        console.log(`🎮 Loaded ${levelData.enemies.length} enemies from level`);
    }

    /**
     * Spawn a new enemy at position
     */
    spawnEnemy(enemyId, x, y, platformIndex = -1) {
        const enemy = new Enemy(enemyId, x, y, platformIndex);
        this.entityManager.addEntity('enemies', enemy);
        return enemy;
    }

    /**
     * Spawn enemy from type (used by spawner enemies)
     */
    spawnFromSpawner(spawnerEnemy) {
        const spawnX = spawnerEnemy.x + (Math.random() - 0.5) * 50;
        const spawnY = spawnerEnemy.y;
        
        const newEnemy = this.spawnEnemy(
            spawnerEnemy.spawnType,
            spawnX,
            spawnY,
            spawnerEnemy.platformIndex
        );

        // Create spawn particles
        this.createSpawnParticles(spawnX, spawnY);
    }

    /**
     * Create spawn particles effect
     */
    createSpawnParticles(x, y) {
        for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 * i) / 20;
            const speed = 80 + Math.random() * 60;
            
            this.entityManager.addEntity('powerupParticles', {
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.5,
                maxLife: 0.5,
                size: 3 + Math.random() * 2,
                color: [0.6, 0.4, 0.8, 1.0],
                gravity: 100,
                rotation: 0,
                rotationSpeed: (Math.random() - 0.5) * 8,
                type: 'spawn-particle'
            });
        }
    }

    /**
     * Main update - chiamato ogni frame
     */
    update(deltaTime, scrollSpeed = 0) {
        if (!this.player) return;

        const enemies = this.entityManager.getEntities('enemies');
        
        // Update each enemy
        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            
            // Check for teleport sound BEFORE update
            if (enemy.justTeleported && this.audioManager) {
                this.audioManager.playSound('teleport');
                enemy.justTeleported = false;
            }
            
            // Update enemy logic
            enemy.update(deltaTime, this.player, this.dims);
            
            // Apply scrolling (piattaforme che si muovono) - ma SOLO baseSpeed, non turbo
            const totalVelocity = enemy.velocity - scrollSpeed;
            enemy.x += totalVelocity * deltaTime;
            
            // Handle platform collisions for grounded enemies
            if (enemy.category === 'ground' || enemy.category === 'jumper') {
                this.checkEnemyPlatformCollisions(enemy);
            }

            // Handle spawner enemies
            if (enemy.pattern === 'spawn' && enemy.alive) {
                // Check if spawn timer triggered
                if (enemy.spawnTimer >= enemy.spawnInterval && enemy.currentSpawns < enemy.maxSpawns) {
                    this.spawnFromSpawner(enemy);
                }
            }

            // Remove if off-screen or dead
            if (enemy.shouldRemove(this.dims.width)) {
                enemies.splice(i, 1);
                
                // Track enemy defeated for level manager
                if (!enemy.alive && this.levelManager) {
                    this.levelManager.recordEnemyKilled();
                }
            }
        }

        // Optional: Dynamic spawning (can be disabled if only using predefined enemies)
        // this.updateDynamicSpawning(deltaTime);
    }

    /**
     * Check enemy collision with platforms (for grounded enemies)
     */
    checkEnemyPlatformCollisions(enemy) {
        const platforms = this.entityManager.getEntities('platforms');
        
        for (const platform of platforms) {
            if (enemy.checkPlatformCollision(platform)) {
                // Enemy landed on platform
                break;
            }
        }
    }

    /**
     * Optional: Dynamic enemy spawning (disabled by default)
     */
    updateDynamicSpawning(deltaTime) {
        this.spawnTimer += deltaTime;
        
        if (this.spawnTimer >= this.spawnInterval) {
            // Get current level
            const currentLevel = this.levelManager ? this.levelManager.currentLevel : 1;
            
            // Spawn random enemy appropriate for level
            // (This is optional - the game uses predefined enemies from level config)
            this.spawnRandomEnemy(currentLevel);
            
            this.spawnTimer = 0;
        }
    }

    /**
     * Spawn a random enemy for current level (optional feature)
     */
    spawnRandomEnemy(levelId) {
        // Get available enemies for this level
        const config = getEnemyConfig('slug'); // Default to simplest enemy
        if (!config) return;

        const spawnX = this.dims.width + 100;
        const spawnY = 200 + Math.random() * 300;

        this.spawnEnemy(config.id, spawnX, spawnY);
    }

    /**
     * Get enemy count
     */
    getEnemyCount() {
        return this.entityManager.getEntities('enemies').length;
    }

    /**
     * Get alive enemy count
     */
    getAliveEnemyCount() {
        return this.entityManager.getEntities('enemies').filter(e => e.alive).length;
    }

    /**
     * Clear all enemies
     */
    clearAllEnemies() {
        this.entityManager.clearEntities('enemies');
    }

    /**
     * Damage enemy by ID or reference
     */
    damageEnemy(enemy, damage) {
        const killed = enemy.takeDamage(damage);
        
        if (killed) {
            // Create death particles
            this.createDeathParticles(enemy);
        }
        
        return killed;
    }

    /**
     * Create death particles when enemy dies
     */
    createDeathParticles(enemy) {
        for (let i = 0; i < 30; i++) {
            const angle = (Math.PI * 2 * i) / 30;
            const speed = 100 + Math.random() * 80;
            
            this.entityManager.addEntity('powerupParticles', {
                x: enemy.x + enemy.width / 2,
                y: enemy.y + enemy.height / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 50,
                life: 0.8,
                maxLife: 0.8,
                size: 4 + Math.random() * 3,
                color: [...enemy.color],
                gravity: 200,
                rotation: 0,
                rotationSpeed: (Math.random() - 0.5) * 10,
                type: 'death-particle'
            });
        }
    }

    /**
     * Check if projectile hits player
     */
    checkProjectilePlayerCollision(projectile, player) {
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;
        
        const dx = projectile.x - playerCenterX;
        const dy = projectile.y - playerCenterY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        return dist < (projectile.radius + Math.max(player.width, player.height) / 2);
    }

    /**
     * Get all enemy projectiles for collision detection
     */
    getAllProjectiles() {
        const allProjectiles = [];
        const enemies = this.entityManager.getEntities('enemies');
        
        enemies.forEach(enemy => {
            if (enemy.projectiles && enemy.projectiles.length > 0) {
                enemy.projectiles.forEach(proj => {
                    allProjectiles.push({
                        ...proj,
                        enemyId: enemy.id,
                        enemy: enemy
                    });
                });
            }
        });
        
        return allProjectiles;
    }

    /**
     * Remove projectile from enemy
     */
    removeProjectile(enemy, projectile) {
        const index = enemy.projectiles.indexOf(projectile);
        if (index > -1) {
            enemy.projectiles.splice(index, 1);
        }
    }

    /**
     * Resize handler
     */
    resize(width, height) {
        this.dims.width = width;
        this.dims.height = height;
    }
}
