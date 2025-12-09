/**
 * Enemy - Classe per gestire tutti i tipi di nemici
 * Supporta tutti i pattern definiti in EnemyTypes.js
 */
import { getEnemyConfig } from '../config/EnemyTypes.js';

export class Enemy {
    constructor(enemyId, x, y, platformIndex = -1) {
        const config = getEnemyConfig(enemyId);
        if (!config) {
            console.error(`Enemy config not found for: ${enemyId}`);
            // Set default values to prevent crashes
            this.type = 'enemy';
            this.id = enemyId;
            this.name = 'Unknown';
            this.category = 'ground';
            this.x = x;
            this.y = y;
            this.width = 40;
            this.height = 40;
            this.hp = 1;
            this.maxHp = 1;
            this.damage = 1;
            this.speed = 50;
            this.points = 10;
            this.alive = false; // Don't render broken enemies
            return;
        }

        // Identificatori
        this.type = 'enemy'; // CRITICAL: Required by RenderingSystem
        this.id = enemyId;
        this.name = config.name;
        this.category = config.category;
        this.platformIndex = platformIndex;

        // Posizione e dimensioni
        this.x = x;
        this.y = y;
        this.width = config.width;
        this.height = config.height;
        this.startX = x; // Posizione iniziale per patrol

        // Statistiche
        this.hp = config.hp;
        this.maxHp = config.hp;
        this.damage = config.damage;
        this.speed = config.speed;
        this.points = config.points;
        this.armor = config.armor || 0;

        // Rendering
        this.icon = config.icon;
        this.color = config.color;

        // Pattern di movimento
        this.pattern = config.pattern;
        this.velocity = 0;
        this.velocityX = 0;
        this.velocityY = 0;
        this.direction = 1; // 1 = destra, -1 = sinistra
        this.patrolDistance = config.patrolDistance || 100;

        // Pattern-specific properties
        this.initializePatternProperties(config);

        // Stati
        this.alive = true;
        this.hasHitPlayer = false; // Previene danno multiplo
        this.invulnerable = false; // Per boss phases
        this.hitFlashTimer = 0; // Visual feedback quando colpito

        // AI state
        this.aiTimer = 0;
        this.aiState = 'idle';
        this.targetX = 0;
        this.targetY = 0;

        // Projectiles (for shooting enemies)
        this.projectiles = [];
        this.lastShootTime = 0;

        // Animation
        this.animationTimer = 0;
        this.rotation = 0;

        // Death animation
        this.deathTimer = 0;
        this.deathDuration = 0.5;
    }

    /**
     * Inizializza proprietà specifiche per pattern
     */
    initializePatternProperties(config) {
        // Pattern di patrol
        if (this.pattern === 'patrol' || this.pattern === 'heavy_patrol') {
            this.patrolDistance = config.patrolDistance || 120;
            this.velocityX = this.speed * this.direction;
        }

        // Pattern di charge
        if (this.pattern === 'charge') {
            this.chargeSpeed = config.chargeSpeed || 300;
            this.chargeDetectRange = config.chargeDetectRange || 200;
            this.chargeCooldown = config.chargeCooldown || 2.0;
            this.chargeTimer = 0;
            this.isCharging = false;
        }

        // Pattern di chase
        if (this.pattern === 'chase' || this.pattern === 'smart_chase') {
            this.chaseRange = config.chaseRange || 250;
            this.predictionTime = config.predictionTime || 0;
        }

        // Pattern di jump
        if (this.pattern === 'jump' || this.pattern === 'bounce') {
            this.jumpForce = config.jumpForce || -400;
            this.jumpInterval = config.jumpInterval || 1.5;
            this.jumpTimer = 0;
            this.bounceForce = config.bounceForce || -500;
            this.bounceMultiplier = config.bounceMultiplier || 1.0;
        }

        // Pattern di shoot/turret
        if (this.pattern === 'shoot' || this.pattern === 'laser' || this.pattern === 'heavy_patrol') {
            this.shootInterval = config.shootInterval || 2.5;
            this.shootRange = config.shootRange || 300;
            this.projectileSpeed = config.projectileSpeed || 200;
            this.shootTimer = 0;
        }

        // Pattern volanti
        if (this.pattern === 'sine_wave') {
            this.amplitude = config.amplitude || 40;
            this.frequency = config.frequency || 2;
            this.wavePhase = 0;
        }

        if (this.pattern === 'dive_bomb') {
            this.diveSpeed = config.diveSpeed || 400;
            this.diveCooldown = config.diveCooldown || 4.0;
            this.diveTimer = 0;
            this.isDiving = false;
        }

        // Pattern speciali
        if (this.pattern === 'teleport') {
            this.teleportInterval = config.teleportInterval || 3.0;
            this.teleportRange = config.teleportRange || 150;
            this.teleportTimer = 0;
        }

        if (this.pattern === 'spawn') {
            this.spawnInterval = config.spawnInterval || 5.0;
            this.maxSpawns = config.maxSpawns || 3;
            this.spawnType = config.spawnType || 'slug';
            this.spawnTimer = 0;
            this.currentSpawns = 0;
        }

        // Boss multi-phase
        if (this.pattern === 'boss_multi') {
            this.phases = config.phases || [];
            this.currentPhase = 0;
            this.phaseTransitioning = false;
        }
    }

    /**
     * Update enemy behavior
     */
    update(deltaTime, player, canvasDimensions) {
        if (!this.alive) {
            this.deathTimer += deltaTime;
            return;
        }

        this.animationTimer += deltaTime;
        if (this.hitFlashTimer > 0) {
            this.hitFlashTimer -= deltaTime;
        }

        // Execute pattern-specific behavior
        switch (this.pattern) {
            case 'patrol':
            case 'roll':
                this.updatePatrol(deltaTime);
                break;
            case 'heavy_patrol':
                this.updateHeavyPatrol(deltaTime, player);
                break;
            case 'charge':
                this.updateCharge(deltaTime, player);
                break;
            case 'chase':
                this.updateChase(deltaTime, player);
                break;
            case 'smart_chase':
                this.updateSmartChase(deltaTime, player);
                break;
            case 'jump':
                this.updateJump(deltaTime);
                break;
            case 'bounce':
                this.updateBounce(deltaTime);
                break;
            case 'shoot':
                this.updateShoot(deltaTime, player);
                break;
            case 'sine_wave':
                this.updateSineWave(deltaTime);
                break;
            case 'dive_bomb':
                this.updateDiveBomb(deltaTime, player);
                break;
            case 'teleport':
                this.updateTeleport(deltaTime, player);
                break;
            case 'spawn':
                this.updateSpawn(deltaTime);
                break;
            case 'phase':
                this.updatePhase(deltaTime);
                break;
            case 'boss_multi':
                this.updateBossMulti(deltaTime, player);
                break;
        }

        // Update projectiles
        this.updateProjectiles(deltaTime, canvasDimensions);

        // Apply gravity for grounded enemies
        if (this.category === 'ground' || this.category === 'jumper') {
            this.velocityY += 600 * deltaTime; // Gravity
        }

        // Update position - SOLO velocityX/Y del nemico (movimento AI)
        // La velocità di scrolling (velocity) viene applicata dall'EntityManager
        this.x += this.velocityX * deltaTime;
        this.y += this.velocityY * deltaTime;
    }

    /**
     * Pattern: Patrol - cammina avanti/indietro
     */
    updatePatrol(deltaTime) {
        // Check if reached patrol limit
        const distanceFromStart = Math.abs(this.x - this.startX);
        if (distanceFromStart >= this.patrolDistance) {
            this.direction *= -1;
            this.velocityX = this.speed * this.direction;
        }
    }

    /**
     * Pattern: Heavy Patrol - lento ma spara periodicamente
     */
    updateHeavyPatrol(deltaTime, player) {
        this.updatePatrol(deltaTime);
        
        // Shoot periodically
        this.shootTimer += deltaTime;
        if (this.shootTimer >= this.shootInterval) {
            const dx = player.x - this.x;
            const dist = Math.abs(dx);
            
            if (dist <= this.shootRange) {
                this.shoot(player);
                this.shootTimer = 0;
            }
        }
    }

    /**
     * Pattern: Charge - si ferma, poi carica verso il player
     */
    updateCharge(deltaTime, player) {
        this.chargeTimer += deltaTime;

        if (this.isCharging) {
            // Continue charging until timer expires
            if (this.chargeTimer >= 1.0) {
                this.isCharging = false;
                this.chargeTimer = 0;
                this.velocityX = 0;
            }
        } else {
            // Check if player in range
            const dx = player.x - this.x;
            const dist = Math.abs(dx);

            if (dist <= this.chargeDetectRange && this.chargeTimer >= this.chargeCooldown) {
                // Start charge
                this.isCharging = true;
                this.chargeTimer = 0;
                const chargeDir = dx > 0 ? 1 : -1;
                this.velocityX = this.chargeSpeed * chargeDir;
            } else {
                // Idle patrol
                this.velocityX = this.speed * 0.3 * this.direction;
            }
        }
    }

    /**
     * Pattern: Chase - insegue il player
     */
    updateChase(deltaTime, player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= this.chaseRange && dist > 10) {
            this.velocityX = (dx / dist) * this.speed;
            this.velocityY = (dy / dist) * this.speed;
        } else {
            this.velocityX = 0;
            this.velocityY = 0;
        }
    }

    /**
     * Pattern: Smart Chase - inseguimento con predizione
     */
    updateSmartChase(deltaTime, player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= this.chaseRange && dist > 10) {
            // Predict player position
            const predictX = player.x + player.velocityX * this.predictionTime;
            const predictY = player.y + player.velocityY * this.predictionTime;
            
            const pdx = predictX - this.x;
            const pdy = predictY - this.y;
            const pdist = Math.sqrt(pdx * pdx + pdy * pdy);

            if (pdist > 10) {
                this.velocityX = (pdx / pdist) * this.speed;
                this.velocityY = (pdy / pdist) * this.speed;
            }
        } else {
            this.velocityX = 0;
            this.velocityY = 0;
        }
    }

    /**
     * Pattern: Jump - salta periodicamente
     */
    updateJump(deltaTime) {
        this.jumpTimer += deltaTime;

        if (this.jumpTimer >= this.jumpInterval && this.velocityY === 0) {
            this.velocityY = this.jumpForce;
            this.jumpTimer = 0;
        }

        // Horizontal patrol
        this.velocityX = this.speed * this.direction;
        const distanceFromStart = Math.abs(this.x - this.startX);
        if (distanceFromStart >= this.patrolDistance) {
            this.direction *= -1;
        }
    }

    /**
     * Pattern: Bounce - rimbalza continuamente
     */
    updateBounce(deltaTime) {
        this.velocityX = this.speed * this.direction;
        
        // When hits ground, bounce
        // (Ground collision will be handled by EnemySystem)
    }

    /**
     * Pattern: Shoot - spara verso il player
     */
    updateShoot(deltaTime, player) {
        this.shootTimer += deltaTime;

        if (this.shootTimer >= this.shootInterval) {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= this.shootRange) {
                this.shoot(player);
                this.shootTimer = 0;
            }
        }
    }

    /**
     * Pattern: Sine Wave - vola con movimento ondulato
     */
    updateSineWave(deltaTime) {
        this.wavePhase += deltaTime * this.frequency;
        this.velocityX = -this.speed; // Muove da destra a sinistra
        this.velocityY = Math.cos(this.wavePhase) * this.amplitude;
    }

    /**
     * Pattern: Dive Bomb - vola, poi si tuffa
     */
    updateDiveBomb(deltaTime, player) {
        this.diveTimer += deltaTime;

        if (this.isDiving) {
            // Dive down
            this.velocityY = this.diveSpeed;
            
            // Stop diving after 1 second
            if (this.diveTimer >= 1.0) {
                this.isDiving = false;
                this.diveTimer = 0;
                this.velocityY = 0;
            }
        } else {
            // Fly horizontally
            this.velocityX = -this.speed;
            this.velocityY = 0;

            // Check if ready to dive
            if (this.diveTimer >= this.diveCooldown) {
                const dx = Math.abs(player.x - this.x);
                if (dx <= 100) {
                    this.isDiving = true;
                    this.diveTimer = 0;
                }
            }
        }
    }

    /**
     * Pattern: Teleport - si teletrasporta vicino al player
     */
    updateTeleport(deltaTime, player) {
        this.teleportTimer += deltaTime;

        if (this.teleportTimer >= this.teleportInterval) {
            // Teleport near player
            const angle = Math.random() * Math.PI * 2;
            const dist = 50 + Math.random() * this.teleportRange;
            this.x = player.x + Math.cos(angle) * dist;
            this.y = player.y + Math.sin(angle) * dist;
            
            this.teleportTimer = 0;
            
            // Signal that we teleported (for sound/effects)
            this.justTeleported = true;
        }
    }

    /**
     * Pattern: Spawn - genera nemici minori
     */
    updateSpawn(deltaTime) {
        if (this.currentSpawns >= this.maxSpawns) return;

        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= this.spawnInterval) {
            // Signal to spawn a new enemy (handled by EnemySystem)
            this.spawnTimer = 0;
            this.currentSpawns++;
        }
    }

    /**
     * Pattern: Phase - attraversa piattaforme
     */
    updatePhase(deltaTime) {
        this.velocityX = -this.speed;
        // Phasing through platforms is handled in collision detection
    }

    /**
     * Pattern: Boss Multi - combina più pattern con fasi HP
     */
    updateBossMulti(deltaTime, player) {
        if (!this.phases || this.phases.length === 0) return;

        // Check phase transition
        const currentPhaseData = this.phases[this.currentPhase];
        if (this.hp <= currentPhaseData.hp && this.currentPhase < this.phases.length - 1) {
            this.currentPhase++;
            this.phaseTransitioning = true;
            // Apply new phase pattern
            const newPhase = this.phases[this.currentPhase];
            this.pattern = newPhase.pattern;
        }

        // Execute current phase pattern
        // (Simplified - would need full pattern switching logic)
        this.updateChase(deltaTime, player);
    }

    /**
     * Shoot a projectile toward player
     */
    shoot(player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
            this.projectiles.push({
                x: this.x + this.width / 2,
                y: this.y + this.height / 2,
                vx: (dx / dist) * this.projectileSpeed,
                vy: (dy / dist) * this.projectileSpeed,
                radius: 8,
                damage: this.damage,
                color: this.color,
                lifetime: 3.0,
                age: 0
            });
        }
    }

    /**
     * Update all projectiles
     */
    updateProjectiles(deltaTime, canvasDimensions) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            proj.x += proj.vx * deltaTime;
            proj.y += proj.vy * deltaTime;
            proj.age += deltaTime;

            // Remove if out of bounds or too old
            if (proj.x < -50 || proj.x > canvasDimensions.width + 50 ||
                proj.y < -50 || proj.y > canvasDimensions.height + 50 ||
                proj.age >= proj.lifetime) {
                this.projectiles.splice(i, 1);
            }
        }
    }

    /**
     * Take damage
     */
    takeDamage(amount) {
        if (this.invulnerable || !this.alive) return false;

        const actualDamage = Math.max(1, amount - this.armor);
        this.hp -= actualDamage;
        this.hitFlashTimer = 0.2; // Flash for 200ms

        if (this.hp <= 0) {
            this.alive = false;
            return true; // Enemy killed
        }

        return false; // Enemy damaged but alive
    }

    /**
     * Check collision with rectangle (player, platforms, etc.)
     */
    checkCollision(rect) {
        return this.x < rect.x + rect.width &&
               this.x + this.width > rect.x &&
               this.y < rect.y + rect.height &&
               this.y + this.height > rect.y;
    }

    /**
     * Check collision with circle (projectiles)
     */
    checkCircleCollision(circle) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const dx = centerX - circle.x;
        const dy = centerY - circle.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < (Math.max(this.width, this.height) / 2 + circle.radius);
    }

    /**
     * Platform collision (for grounded enemies)
     */
    checkPlatformCollision(platform) {
        const tolerance = 15;
        const bottomY = this.y + this.height;
        
        if (this.velocityY >= 0 &&
            bottomY >= platform.y - tolerance &&
            bottomY <= platform.y + tolerance &&
            this.x + this.width > platform.x &&
            this.x < platform.x + platform.width) {
            
            this.y = platform.y - this.height;
            this.velocityY = 0;
            
            // Apply bounce if bouncing enemy
            if (this.pattern === 'bounce') {
                this.velocityY = this.bounceForce * this.bounceMultiplier;
            }
            
            return true;
        }
        return false;
    }

    /**
     * Get bounds for collision
     */
    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }

    /**
     * Check if enemy should be removed (off-screen or dead)
     */
    shouldRemove(canvasWidth) {
        // Remove if off screen left
        if (this.x + this.width < -100) return true;
        
        // Remove if dead and death animation finished
        if (!this.alive && this.deathTimer >= this.deathDuration) return true;
        
        return false;
    }
}
