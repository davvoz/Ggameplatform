import GameObject from './GameObject.js';
import Vector2 from '../utils/Vector2.js';
/**
 * Enemy - Classe base per i nemici
 */
class Enemy extends GameObject {
    constructor(x, y, type = 'enemy1', scale = 1) {
        const sizes = {
            'enemy1': { w: 48, h: 48 },
            'enemy2': { w: 56, h: 56 },
            'enemy3': { w: 72, h: 72 },
            'enemy4': { w: 44, h: 44 },  // Phantom - smaller, elusive
            'enemy5': { w: 64, h: 64 },  // Sentinel - heavy armor
            'enemy6': { w: 28, h: 28 },  // Swarm - tiny, fast
            'boss': { w: 160, h: 120 },
            'boss_hydra': { w: 180, h: 140 },
            'boss_fortress': { w: 200, h: 160 },
            'boss_void': { w: 150, h: 150 }
        };
        
        const size = sizes[type] || sizes['enemy1'];
        super(x, y, Math.round(size.w * scale), Math.round(size.h * scale));
        
        this.tag = 'enemy';
        this.type = type;
        this._scale = scale;
        
        // Stats basati sul tipo
        this.initStats();
        
        // Movimento
        this.movementPattern = 'straight';
        this.movementTimer = 0;
        this.startX = x;
        this.amplitude = 100;
        this.frequency = 2;
        
        // Shooting
        this.canShoot = false; // Inizia disabilitato
        this.shootCooldown = 0;
        this.shootInterval = 2;
        this.initialShootDelay = 2.5; // 2.5 secondi prima di iniziare a sparare
        this.shootDelayTimer = this.initialShootDelay;
    }

    initStats() {
        const s = this._scale || 1;
        const stats = {
            'enemy1': { health: 1, speed: 75 * s, score: 100, shootInterval: 4.0 },
            'enemy2': { health: 2, speed: 70 * s, score: 200, shootInterval: 3.2 },
            'enemy3': { health: 4, speed: 65 * s, score: 400, shootInterval: 2.2 },
            'enemy4': { health: 2, speed: 95 * s, score: 300, shootInterval: 3.5 },  // Phantom: fast, elusive
            'enemy5': { health: 7, speed: 45 * s, score: 500, shootInterval: 1.8 },  // Sentinel: tanky, slow
            'enemy6': { health: 1, speed: 120 * s, score: 80, shootInterval: 5.0 },  // Swarm: fragile, fast
            'boss': { health: 70, speed: 50 * s, score: 5000, shootInterval: 0.5 },
            'boss_hydra': { health: 50, speed: 45 * s, score: 7000, shootInterval: 0.4 },
            'boss_fortress': { health: 70, speed: 35 * s, score: 9000, shootInterval: 0.3 },
            'boss_void': { health: 70, speed: 55 * s, score: 8000, shootInterval: 0.35 }
        };

        // Phantom-specific: cloaking
        if (this.type === 'enemy4') {
            this.cloakTimer = 0;
            this.cloakCycle = 3.0 + Math.random() * 2; // seconds per cloak cycle
            this.opacity = 1;
            this.phaseSpeed = 1.5 + Math.random() * 0.5;
        }

        // Sentinel-specific: shield ring
        if (this.type === 'enemy5') {
            this.shieldAngle = Math.random() * Math.PI * 2;
            this.shieldActive = true;
            this.shieldHits = 3; // Shield absorbs 3 hits before breaking
            this.pulseTime = 0;
        }

        // Swarm-specific: jitter movement
        if (this.type === 'enemy6') {
            this.jitterX = 0;
            this.jitterTimer = 0;
            this.jitterDir = Math.random() > 0.5 ? 1 : -1;
        }

        // Hydra Boss: regeneration + multi-head tracking
        if (this.type === 'boss_hydra') {
            this.regenTimer = 0;
            this.regenRate = 0.3; // HP per second
            this.headAngles = [0, 0, 0]; // 3 heads
            this.headFireTimers = [0, 0, 0];
            this.enragePhase = false;
        }

        // Fortress Boss: rotating turrets + shield phases
        if (this.type === 'boss_fortress') {
            this.turretAngle = 0;
            this.shieldPhaseTimer = 0;
            this.shieldPhaseActive = false;
            this.shieldPhaseDuration = 2;
            this.shieldPhaseCooldown = 8;
            this.turretFireTimers = [0, 0, 0, 0];
        }

        // Void Boss: teleportation + gravity wells
        if (this.type === 'boss_void') {
            this.teleportTimer = 0;
            this.teleportCooldown = 5 + Math.random() * 3;
            this.voidPulseTime = 0;
            this.teleporting = false;
            this.teleportFade = 1;
            this.gravityWells = []; // {x, y, life, strength}
        }
        
        const s1 = stats[this.type] || stats['enemy1'];
        this.maxHealth = s1.health;
        this.health = this.maxHealth;
        this.speed = s1.speed;
        this.scoreValue = s1.score;
        this.shootInterval = s1.shootInterval;
    }

    /**
     * Imposta il pattern di movimento
     */
    setMovementPattern(pattern, params = {}) {
        this.movementPattern = pattern;
        const s = this._scale || 1;
        this.amplitude = params.amplitude || (100 * s);
        this.frequency = params.frequency || 2;
        this.targetX = params.targetX;
        this.targetY = params.targetY;
        return this;
    }

    /**
     * Check if this enemy is a boss type
     */
    isBoss() {
        return this.type === 'boss' || this.type === 'boss_hydra' || 
               this.type === 'boss_fortress' || this.type === 'boss_void';
    }

    /**
     * Apply level-based scaling to health and score
     * @param {number} level - Current game level
     */
    applyLevelScaling(level) {
        if (level <= 1) return;
        // Enemies get gentle scaling first 10 levels, then ramps up
        const healthMultiplier = level <= 10
            ? 1 + (level - 1) * 0.1   // +10% per level (levels 1-10)
            : 1.9 + (level - 10) * 0.2; // +20% per level after 10
        // Bosses get +15% health per level (first 10), then +25%
        const bossHealthMultiplier = level <= 10
            ? 1 + (level - 1) * 0.15
            : 2.35 + (level - 10) * 0.25;
        const mult = this.isBoss() ? bossHealthMultiplier : healthMultiplier;
        this.maxHealth = Math.ceil(this.maxHealth * mult);
        this.health = this.maxHealth;
        // Score also scales slightly
        this.scoreValue = Math.ceil(this.scoreValue * (1 + (level - 1) * 0.1));
        // Sentinel shield gets more hits at higher levels
        if (this.type === 'enemy5' && this.shieldActive) {
            this.shieldHits = 3 + Math.floor((level - 1) * 0.5);
        }
        // Hydra regen scales (gently)
        if (this.type === 'boss_hydra') {
            this.regenRate = 0.3 + (level - 1) * 0.15;
        }
        // Fortress shield duration scales
        if (this.type === 'boss_fortress') {
            this.shieldPhaseDuration = 3 + (level - 1) * 0.3;
        }
    }

    update(deltaTime, game) {
        this.movementTimer += deltaTime;
        
        // Applica pattern di movimento
        switch (this.movementPattern) {
            case 'straight':
                this.velocity.y = this.speed;
                break;
                
            case 'sine':
                this.velocity.y = this.speed;
                this.position.x = this.startX + Math.sin(this.movementTimer * this.frequency) * this.amplitude;
                break;
                
            case 'zigzag':
                this.velocity.y = this.speed;
                const zigzagPhase = Math.floor(this.movementTimer * this.frequency) % 2;
                this.velocity.x = zigzagPhase === 0 ? this.speed * 0.5 : -this.speed * 0.5;
                break;
                
            case 'dive':
                // Si ferma, poi si tuffa verso il player
                if (this.movementTimer < 1) {
                    this.velocity.y = this.speed * 0.3;
                } else {
                    const player = game.player;
                    if (player && player.active) {
                        const dir = player.getCenter().subtract(this.getCenter()).normalize();
                        this.velocity = dir.multiply(this.speed * 2);
                    }
                }
                break;
                
            case 'phantom':
                // Erratic phasing movement
                this.velocity.y = this.speed * 0.7;
                this.position.x = this.startX + Math.sin(this.movementTimer * 3) * 60 * (this._scale || 1) + Math.cos(this.movementTimer * 5.7) * 30 * (this._scale || 1);
                break;

            case 'sentinel':
                // Slow, steady descent — slightly weaving
                this.velocity.y = this.speed;
                this.position.x = this.startX + Math.sin(this.movementTimer * 0.8) * 40 * (this._scale || 1);
                break;

            case 'swarm':
                // Fast zigzag with jitter
                this.velocity.y = this.speed;
                this.velocity.x = Math.sin(this.movementTimer * 6) * this.speed * 0.6;
                break;

            case 'boss':
                // Movimento orizzontale con oscillazione
                this.velocity.y = this.position.y < 80 ? this.speed : 0;
                this.position.x = game.canvas.width / 2 - this.width / 2 + 
                                  Math.sin(this.movementTimer * 0.5) * (game.canvas.width / 3);
                break;

            case 'boss_hydra':
                // Serpentine movement
                this.velocity.y = this.position.y < 90 ? this.speed : 0;
                this.position.x = game.canvas.width / 2 - this.width / 2 + 
                                  Math.sin(this.movementTimer * 0.7) * (game.canvas.width / 4) +
                                  Math.sin(this.movementTimer * 1.3) * 30;
                break;

            case 'boss_fortress':
                // Very slow, dominant descent then stays put
                this.velocity.y = this.position.y < 70 ? this.speed : 0;
                this.position.x = game.canvas.width / 2 - this.width / 2 + 
                                  Math.sin(this.movementTimer * 0.3) * (game.canvas.width / 5);
                break;

            case 'boss_void':
                // Drifts smoothly, then teleports
                if (!this.teleporting) {
                    this.velocity.y = this.position.y < 100 ? this.speed : 0;
                    this.position.x = game.canvas.width / 2 - this.width / 2 + 
                                      Math.sin(this.movementTimer * 0.6) * (game.canvas.width / 3.5);
                }
                break;
        }

        // Phantom cloaking update
        if (this.type === 'enemy4') {
            this.cloakTimer += deltaTime;
            const cloakPhase = (this.cloakTimer % this.cloakCycle) / this.cloakCycle;
            // Smooth cloak: visible -> fade out -> invisible -> fade in
            if (cloakPhase < 0.4) {
                this.opacity = 1;
            } else if (cloakPhase < 0.5) {
                this.opacity = 1 - (cloakPhase - 0.4) / 0.1;
            } else if (cloakPhase < 0.8) {
                this.opacity = 0.08; // Almost invisible
            } else {
                this.opacity = (cloakPhase - 0.8) / 0.2;
            }
        }

        // Sentinel shield rotation
        if (this.type === 'enemy5') {
            this.shieldAngle += deltaTime * 2;
            this.pulseTime += deltaTime;
        }

        // Swarm jitter
        if (this.type === 'enemy6') {
            this.jitterTimer += deltaTime;
            if (this.jitterTimer > 0.3) {
                this.jitterTimer = 0;
                this.jitterDir = -this.jitterDir;
            }
            this.jitterX = this.jitterDir * 15 * Math.sin(this.movementTimer * 12);
            this.position.x += this.jitterX * deltaTime;
        }

        // === BOSS SPECIAL MECHANICS ===

        // Hydra: regeneration (capped at 70% max HP)
        if (this.type === 'boss_hydra') {
            this.regenTimer += deltaTime;
            if (this.regenTimer >= 1.5) {
                this.regenTimer = 0;
                const regenCap = this.maxHealth * 0.7;
                if (this.health < regenCap) {
                    this.health = Math.min(regenCap, this.health + this.regenRate);
                }
            }
            // Enrage below 30% HP
            this.enragePhase = (this.health / this.maxHealth) < 0.3;
            // Track heads independently
            for (let i = 0; i < 3; i++) {
                this.headAngles[i] += deltaTime * (1.5 + i * 0.3);
            }
        }

        // Fortress: shield phases and turret rotation
        if (this.type === 'boss_fortress') {
            this.turretAngle += deltaTime * 1.5;
            this.shieldPhaseTimer += deltaTime;
            if (!this.shieldPhaseActive && this.shieldPhaseTimer >= this.shieldPhaseCooldown) {
                this.shieldPhaseActive = true;
                this.shieldPhaseTimer = 0;
            }
            if (this.shieldPhaseActive && this.shieldPhaseTimer >= this.shieldPhaseDuration) {
                this.shieldPhaseActive = false;
                this.shieldPhaseTimer = 0;
            }
        }

        // Void: teleportation + gravity wells
        if (this.type === 'boss_void') {
            this.voidPulseTime += deltaTime;
            this.teleportTimer += deltaTime;

            // Teleport logic
            if (!this.teleporting && this.teleportTimer >= this.teleportCooldown) {
                this.teleporting = true;
                this.teleportFade = 1;
                this.teleportTimer = 0;
            }
            if (this.teleporting) {
                this.teleportFade -= deltaTime * 3;
                if (this.teleportFade <= 0) {
                    // Teleport to new position
                    this.position.x = 50 + Math.random() * (game.canvas.width - 150 - 50);
                    this.position.y = 40 + Math.random() * 80;
                    this.startX = this.position.x;
                    this.teleporting = false;
                    this.teleportFade = 0;
                    this.teleportCooldown = 4 + Math.random() * 4;

                    // Spawn gravity well at old location
                    if (this.gravityWells.length < 3) {
                        this.gravityWells.push({
                            x: game.canvas.width / 2 + (Math.random() - 0.5) * game.canvas.width * 0.6,
                            y: game.canvas.height * 0.5 + Math.random() * game.canvas.height * 0.3,
                            life: 4,
                            strength: 80
                        });
                    }
                }
            } else if (this.teleportFade < 1) {
                this.teleportFade = Math.min(1, this.teleportFade + deltaTime * 3);
            }

            // Update gravity wells - pull player toward them
            for (let i = this.gravityWells.length - 1; i >= 0; i--) {
                const well = this.gravityWells[i];
                well.life -= deltaTime;
                if (well.life <= 0) {
                    this.gravityWells.splice(i, 1);
                    continue;
                }
                // Pull player
                if (game.player && game.player.active) {
                    const dx = well.x - game.player.position.x;
                    const dy = well.y - game.player.position.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 200 && dist > 10) {
                        const force = (well.strength / dist) * deltaTime;
                        game.player.position.x += (dx / dist) * force;
                        game.player.position.y += (dy / dist) * force;
                    }
                }
            }
        }
        
        // Applica velocità
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        
        // Delay iniziale prima di poter sparare
        if (!this.canShoot) {
            this.shootDelayTimer -= deltaTime;
            if (this.shootDelayTimer <= 0) {
                this.canShoot = true;
            }
        }
        
        // Shooting con probabilità basata sul livello
        if (this.canShoot && game.player && game.player.active) {
            this.shootCooldown -= deltaTime;
            if (this.shootCooldown <= 0) {
                // Probabilità di sparo: molto bassa nei primi livelli, cresce gradualmente
                // Livello 1: 10%, Livello 5: 30%, Livello 10: 55%, poi sale fino a 90%
                const shootChance = game.level <= 10
                    ? Math.min(0.55, 0.10 + (game.level - 1) * 0.05)
                    : Math.min(0.90, 0.55 + (game.level - 10) * 0.05);
                if (Math.random() < shootChance || this.isBoss()) {
                    this.shoot(game);
                }
                // Intervallo più lungo ai primi livelli (2.5x al liv 1, 1x dal liv 10+)
                const levelMultiplier = game.level <= 10
                    ? Math.max(1, 2.5 - (game.level - 1) * 0.17)
                    : 1.0;
                this.shootCooldown = this.shootInterval * levelMultiplier;
            }
        }
        
        // Rimuovi se fuori schermo (sotto)
        if (this.position.y > game.canvas.height + 50) {
            this.destroy();
        }
    }

    shoot(game) {
        const centerX = this.position.x + this.width / 2;
        const bottomY = this.position.y + this.height;
        const s = this._scale || 1;
        
        if (this.type === 'boss') {
            // Boss spara pattern multipli
            const patterns = ['spread', 'aimed', 'burst'];
            const pattern = patterns[Math.floor(Math.random() * patterns.length)];
            
            switch (pattern) {
                case 'spread':
                    for (let i = -2; i <= 2; i++) {
                        game.spawnBullet(centerX - 4 * s, bottomY, i * 60, 250, 'enemy');
                    }
                    break;
                case 'aimed':
                    if (game.player && game.player.active) {
                        const dir = game.player.getCenter().subtract(this.getCenter()).normalize();
                        game.spawnBullet(centerX - 4 * s, bottomY, dir.x * 300, dir.y * 300, 'enemy');
                    }
                    break;
                case 'burst':
                    for (let i = 0; i < 8; i++) {
                        const angle = (i / 8) * Math.PI * 2;
                        game.spawnBullet(
                            centerX - 4 * s, bottomY,
                            Math.cos(angle) * 200,
                            Math.sin(angle) * 200,
                            'enemy'
                        );
                    }
                    break;
            }
        } else if (this.type === 'boss_hydra') {
            // Hydra: each head fires independently
            const headOffsets = [-40 * s, 0, 40 * s];
            for (let i = 0; i < 3; i++) {
                const hx = centerX + headOffsets[i];
                if (this.enragePhase) {
                    // Enraged: rapid aimed shots from all heads
                    if (game.player && game.player.active) {
                        const dir = game.player.getCenter().subtract(new Vector2(hx, bottomY)).normalize();
                        game.spawnBullet(hx - 4 * s, bottomY, dir.x * 280, dir.y * 280, 'enemy');
                    }
                } else {
                    // Normal: alternating spread and straight
                    if (i === 1) {
                        // Center head: spread
                        for (let j = -1; j <= 1; j++) {
                            game.spawnBullet(hx - 4 * s, bottomY, j * 50, 220, 'enemy');
                        }
                    } else {
                        // Side heads: aimed
                        if (game.player && game.player.active) {
                            const dir = game.player.getCenter().subtract(new Vector2(hx, bottomY)).normalize();
                            game.spawnBullet(hx - 4 * s, bottomY, dir.x * 200, Math.abs(dir.y) * 200 + 80, 'enemy');
                        }
                    }
                }
            }
        } else if (this.type === 'boss_fortress') {
            // Fortress: 4 rotating turrets fire outward + aimed center cannon
            for (let i = 0; i < 4; i++) {
                const tAngle = this.turretAngle + (i * Math.PI / 2);
                const tx = centerX + Math.cos(tAngle) * 60 * s;
                const ty = this.position.y + this.height / 2 + Math.sin(tAngle) * 40 * s;
                game.spawnBullet(tx - 4 * s, ty, Math.cos(tAngle + Math.PI / 2) * 180, Math.sin(tAngle + Math.PI / 2) * 180 + 80, 'enemy');
            }
            // Center cannon aimed at player
            if (game.player && game.player.active) {
                const dir = game.player.getCenter().subtract(this.getCenter()).normalize();
                game.spawnBullet(centerX - 4 * s, bottomY, dir.x * 250, dir.y * 250, 'enemy');
                // Double shot
                game.spawnBullet(centerX - 20 * s, bottomY, dir.x * 230, dir.y * 230, 'enemy');
                game.spawnBullet(centerX + 16 * s, bottomY, dir.x * 230, dir.y * 230, 'enemy');
            }
        } else if (this.type === 'boss_void') {
            // Void: spiral pattern + homing-like shots
            const numBullets = 6;
            const spiralOffset = this.voidPulseTime * 2;
            for (let i = 0; i < numBullets; i++) {
                const angle = spiralOffset + (i / numBullets) * Math.PI * 2;
                game.spawnBullet(
                    centerX - 4 * s, this.position.y + this.height / 2,
                    Math.cos(angle) * 170,
                    Math.sin(angle) * 170 + 50,
                    'enemy'
                );
            }
        } else {
            // Nemici normali - solo 30% mira al player, 70% dritto
            if (Math.random() > 0.7 && game.player && game.player.active) {
                const dir = game.player.getCenter().subtract(this.getCenter()).normalize();
                game.spawnBullet(centerX - 4 * s, bottomY, dir.x * 200, Math.abs(dir.y) * 200 + 100, 'enemy');
            } else {
                game.spawnBullet(centerX - 4 * s, bottomY, 0, 200, 'enemy');
            }
        }
    }

    takeDamage(amount, game) {
        // Phantom: can't be damaged while cloaked
        if (this.type === 'enemy4' && this.opacity < 0.3) {
            return false;
        }

        // Sentinel: shield absorbs hits
        if (this.type === 'enemy5' && this.shieldActive) {
            this.shieldHits--;
            this.flashTime = 0.1;
            if (this.shieldHits <= 0) {
                this.shieldActive = false;
            }
            return false;
        }

        // Fortress Boss: shield phase blocks all damage
        if (this.type === 'boss_fortress' && this.shieldPhaseActive) {
            this.flashTime = 0.05;
            return false;
        }

        // Void Boss: reduced damage while teleporting
        if (this.type === 'boss_void' && this.teleporting) {
            amount *= 0.2;
        }

        this.health -= amount;
        
        // Flash bianco
        this.flashTime = 0.1;
        
        if (this.health <= 0) {
            this.destroy();
            game.addScore(this.scoreValue);
            
            // Esplosione
            const explosionSize = this.isBoss() ? 'large' : 'medium';
            game.spawnExplosion(this.getCenter().x, this.getCenter().y, explosionSize);

            // Boss death: dramatic staggered explosions
            if (this.isBoss()) {
                const cx = this.getCenter().x;
                const cy = this.getCenter().y;
                const hw = this.width * 0.4;
                const hh = this.height * 0.4;
                // Secondary medium explosions at offset positions
                const offsets = [
                    { dx: -hw, dy: -hh, delay: 100 },
                    { dx:  hw, dy:  0,  delay: 220 },
                    { dx: -hw * 0.5, dy: hh, delay: 350 },
                    { dx:  hw * 0.7, dy: -hh * 0.8, delay: 480 },
                ];
                offsets.forEach(o => {
                    setTimeout(() => {
                        game.spawnExplosion(cx + o.dx, cy + o.dy, 'medium');
                    }, o.delay);
                });
            }
            
            // Chance di drop power-up
            if (Math.random() < this.getDropChance()) {
                const powerUpType = this.getRandomPowerUpType(game.level);
                game.spawnPowerUp(this.getCenter().x, this.getCenter().y, powerUpType);
            }
            
            return true;
        }
        return false;
    }
    
    getRandomPowerUpType(level) {
        // Probabilità pesate per tipo di power-up
        const types = [
            { type: 'weapon', weight: 30 },
            { type: 'health', weight: 25 },
            { type: 'shield', weight: 10 },
            { type: 'speed', weight: 10 },
            { type: 'rapid', weight: 10 },
            { type: 'magnet', weight: 5 },
            { type: 'bomb', weight: level >= 2 ? 5 : 0 },
            { type: 'life', weight: level >= 3 ? 3 : 0 }
        ];
        
        const totalWeight = types.reduce((sum, t) => sum + t.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const t of types) {
            random -= t.weight;
            if (random <= 0) return t.type;
        }
        return 'weapon';
    }

    getDropChance() {
        switch (this.type) {
            case 'enemy1': return 0.15;
            case 'enemy2': return 0.25;
            case 'enemy3': return 0.4;
            case 'enemy4': return 0.30;
            case 'enemy5': return 0.45;
            case 'enemy6': return 0.10;
            case 'boss': return 1.0;
            case 'boss_hydra': return 1.0;
            case 'boss_fortress': return 1.0;
            case 'boss_void': return 1.0;
            default: return 0.15;
        }
    }

    render(ctx, assets) {
        const centerX = this.position.x + this.width / 2;
        const centerY = this.position.y + this.height / 2;
        const s = this._scale || 1;
        
        ctx.save();
        
        // Engine glow for all enemies
        const engineGlow = ctx.createRadialGradient(
            centerX, this.position.y - 5 * s, 0,
            centerX, this.position.y - 5 * s, 15 * s
        );
        const glowColors = {
            'enemy1': { r: 255, g: 100, b: 100 },
            'enemy2': { r: 255, g: 150, b: 50 },
            'enemy3': { r: 200, g: 50, b: 255 },
            'enemy4': { r: 100, g: 200, b: 255 },
            'enemy5': { r: 255, g: 180, b: 50 },
            'enemy6': { r: 150, g: 255, b: 100 },
            'boss': { r: 255, g: 50, b: 100 },
            'boss_hydra': { r: 150, g: 255, b: 100 },
            'boss_fortress': { r: 255, g: 200, b: 50 },
            'boss_void': { r: 130, g: 50, b: 255 }
        };
        const glow = glowColors[this.type] || glowColors['enemy1'];
        const enginePulse = 0.5 + Math.sin(this.movementTimer * 10) * 0.3;
        
        engineGlow.addColorStop(0, `rgba(${glow.r}, ${glow.g}, ${glow.b}, ${enginePulse * 0.6})`);
        engineGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = engineGlow;
        ctx.beginPath();
        ctx.ellipse(centerX, this.position.y - 5, 12, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Flash effect when hit
        if (this.flashTime > 0) {
            ctx.globalCompositeOperation = 'lighter';
            
            // Additional hit flash glow
            const hitGlow = ctx.createRadialGradient(
                centerX, centerY, 0,
                centerX, centerY, this.width * 0.7
            );
            hitGlow.addColorStop(0, `rgba(255, 255, 255, ${this.flashTime * 5})`);
            hitGlow.addColorStop(0.5, `rgba(255, 200, 150, ${this.flashTime * 2})`);
            hitGlow.addColorStop(1, 'rgba(255, 100, 50, 0)');
            
            ctx.fillStyle = hitGlow;
            ctx.beginPath();
            ctx.arc(centerX, centerY, this.width * 0.7, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.globalCompositeOperation = 'source-over';
        }
        
        // Phantom opacity
        if (this.type === 'enemy4') {
            ctx.globalAlpha = this.opacity;
        }

        // Void Boss: apply teleport fade before drawing sprite
        if (this.type === 'boss_void' && this.teleportFade < 1) {
            ctx.globalAlpha = this.teleportFade;
        }

        // Draw sprite
        assets.drawSprite(
            ctx, this.type,
            this.position.x, this.position.y,
            this.width, this.height,
            this.rotation
        );

        // Restore alpha
        if (this.type === 'enemy4' || this.type === 'boss_void') {
            ctx.globalAlpha = 1;
        }

        // Sentinel shield ring
        if (this.type === 'enemy5' && this.shieldActive) {
            ctx.strokeStyle = `rgba(255, 200, 50, ${0.6 + Math.sin(this.pulseTime * 4) * 0.3})`;
            ctx.lineWidth = 2.5;
            ctx.setLineDash([8, 4]);
            ctx.lineDashOffset = -this.shieldAngle * 10;
            ctx.beginPath();
            ctx.arc(centerX, centerY, this.width * 0.6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // Shield orbs
            for (let i = 0; i < 3; i++) {
                const orbAngle = this.shieldAngle + (i * Math.PI * 2 / 3);
                const orbX = centerX + Math.cos(orbAngle) * this.width * 0.55;
                const orbY = centerY + Math.sin(orbAngle) * this.width * 0.55;
                ctx.fillStyle = `rgba(255, 220, 80, ${0.7 + Math.sin(this.pulseTime * 6 + i) * 0.3})`;
                ctx.beginPath();
                ctx.arc(orbX, orbY, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Fortress Boss: shield phase glow
        if (this.type === 'boss_fortress' && this.shieldPhaseActive) {
            const shieldGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, this.width * 0.7);
            shieldGlow.addColorStop(0, 'rgba(255, 220, 80, 0)');
            shieldGlow.addColorStop(0.7, 'rgba(255, 200, 50, 0.15)');
            shieldGlow.addColorStop(1, 'rgba(255, 180, 30, 0.35)');
            ctx.fillStyle = shieldGlow;
            ctx.beginPath();
            ctx.arc(centerX, centerY, this.width * 0.65, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = `rgba(255, 220, 100, ${0.5 + Math.sin(this.turretAngle * 3) * 0.3})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 5]);
            ctx.lineDashOffset = -this.turretAngle * 20;
            ctx.beginPath();
            ctx.arc(centerX, centerY, this.width * 0.6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Hydra Boss: head glow indicators
        if (this.type === 'boss_hydra') {
            const s2 = this._scale || 1;
            const headOffsets = [-40 * s2, 0, 40 * s2];
            for (let i = 0; i < 3; i++) {
                const hx = centerX + headOffsets[i];
                const hy = this.position.y + this.height - 10 * s2;
                const headGlow = ctx.createRadialGradient(hx, hy, 0, hx, hy, 12 * s2);
                const intensity = this.enragePhase ? 0.8 : 0.4;
                headGlow.addColorStop(0, `rgba(100, 255, 80, ${intensity})`);
                headGlow.addColorStop(1, 'rgba(100, 255, 80, 0)');
                ctx.fillStyle = headGlow;
                ctx.beginPath();
                ctx.arc(hx, hy, 10, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        if (this.flashTime > 0) {
            this.flashTime -= 0.016;
        }
        
        // Restore alpha for Void
        if (this.type === 'boss_void') {
            ctx.globalAlpha = 1;
        }

        ctx.restore();

        // Void Boss: render gravity wells (outside save/restore)
        if (this.type === 'boss_void' && this.gravityWells) {
            this.gravityWells.forEach(well => {
                const wellAlpha = Math.min(1, well.life / 1.5);
                // Swirling dark vortex
                for (let ring = 3; ring >= 0; ring--) {
                    const radius = 15 + ring * 12;
                    const wellGrad = ctx.createRadialGradient(well.x, well.y, 0, well.x, well.y, radius);
                    wellGrad.addColorStop(0, `rgba(80, 0, 160, ${wellAlpha * 0.5})`);
                    wellGrad.addColorStop(0.5, `rgba(40, 0, 100, ${wellAlpha * 0.3})`);
                    wellGrad.addColorStop(1, 'rgba(20, 0, 60, 0)');
                    ctx.fillStyle = wellGrad;
                    ctx.beginPath();
                    ctx.arc(well.x, well.y, radius, 0, Math.PI * 2);
                    ctx.fill();
                }
                // Spinning ring
                ctx.strokeStyle = `rgba(180, 80, 255, ${wellAlpha * 0.6})`;
                ctx.lineWidth = 1.5;
                ctx.setLineDash([4, 6]);
                ctx.lineDashOffset = -(this.voidPulseTime || 0) * 30;
                ctx.beginPath();
                ctx.arc(well.x, well.y, 20, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            });
        }
        
        // Health bar for enemies with more health
        if (this.maxHealth > 1 && !this.isBoss()) {
            this.renderHealthBar(ctx);
        }
        
        // Boss health bar
        if (this.isBoss()) {
            this.renderBossHealthBar(ctx);
        }
    }

    renderHealthBar(ctx) {
        const barWidth = this.width * 0.8;
        const barHeight = 5;
        const x = this.position.x + (this.width - barWidth) / 2;
        const y = this.position.y - 10;
        
        ctx.save();
        
        // Background with border
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(x - 1, y - 1, barWidth + 2, barHeight + 2);
        
        // Health gradient
        const healthPercent = this.health / this.maxHealth;
        const healthGrad = ctx.createLinearGradient(x, y, x + barWidth, y);
        
        if (healthPercent > 0.5) {
            healthGrad.addColorStop(0, '#00ff66');
            healthGrad.addColorStop(1, '#00cc44');
        } else if (healthPercent > 0.25) {
            healthGrad.addColorStop(0, '#ffcc00');
            healthGrad.addColorStop(1, '#ff9900');
        } else {
            healthGrad.addColorStop(0, '#ff4444');
            healthGrad.addColorStop(1, '#cc0000');
        }
        
        ctx.fillStyle = healthGrad;
        ctx.fillRect(x, y, barWidth * healthPercent, barHeight);
        
        // Shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(x, y, barWidth * healthPercent, barHeight / 2);
        
        ctx.restore();
    }

    renderBossHealthBar(ctx) {
        const barWidth = 220;
        const barHeight = 14;
        const x = (ctx.canvas.width - barWidth) / 2;
        const y = 70;
        
        ctx.save();
        
        // Outer glow
        ctx.shadowColor = '#ff4444';
        ctx.shadowBlur = 15;
        
        // Background with gradient
        const bgGrad = ctx.createLinearGradient(x, y, x, y + barHeight);
        bgGrad.addColorStop(0, '#1a0a0a');
        bgGrad.addColorStop(1, '#2a1010');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(x - 3, y - 3, barWidth + 6, barHeight + 6);
        
        // Border - color depends on boss type
        const bossColors = {
            'boss': { border: '#ff6644', glow: '#ff4444', label: '⚠ BOSS ⚠', barStart: '#ff2222', barMid: '#ff6600', barEnd: '#ffaa00' },
            'boss_hydra': { border: '#44ff66', glow: '#22ff44', label: '🐉 HYDRA', barStart: '#22ff44', barMid: '#66ff22', barEnd: '#aaff00' },
            'boss_fortress': { border: '#ffcc44', glow: '#ffaa22', label: '🛡️ FORTRESS', barStart: '#ffaa00', barMid: '#ffcc33', barEnd: '#ffee66' },
            'boss_void': { border: '#aa66ff', glow: '#8833ff', label: '🌀 VOID', barStart: '#8833ff', barMid: '#aa55ff', barEnd: '#cc88ff' }
        };
        const bc = bossColors[this.type] || bossColors['boss'];

        ctx.strokeStyle = bc.border;
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 3, y - 3, barWidth + 6, barHeight + 6);
        
        ctx.shadowBlur = 0;
        
        // Health gradient
        const healthPercent = this.health / this.maxHealth;
        const healthGrad = ctx.createLinearGradient(x, y, x + barWidth, y);
        healthGrad.addColorStop(0, bc.barStart);
        healthGrad.addColorStop(0.5, bc.barMid);
        healthGrad.addColorStop(1, bc.barEnd);
        ctx.fillStyle = healthGrad;
        ctx.fillRect(x, y, barWidth * healthPercent, barHeight);
        
        // Shine effect
        const shineGrad = ctx.createLinearGradient(x, y, x, y + barHeight);
        shineGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        shineGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
        shineGrad.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
        ctx.fillStyle = shineGrad;
        ctx.fillRect(x, y, barWidth * healthPercent, barHeight);
        
        // Damage segments
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        for (let i = 1; i < 10; i++) {
            const segX = x + (barWidth / 10) * i;
            ctx.beginPath();
            ctx.moveTo(segX, y);
            ctx.lineTo(segX, y + barHeight);
            ctx.stroke();
        }
        
        // Boss label with glow
        ctx.font = 'bold 14px Orbitron, Arial';
        ctx.textAlign = 'center';
        ctx.shadowColor = bc.glow;
        ctx.shadowBlur = 10;
        ctx.fillStyle = bc.border;
        ctx.fillText(bc.label, ctx.canvas.width / 2, y - 8);
        
        // Health percentage
        ctx.font = '10px Rajdhani, Arial';
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 0;
        ctx.fillText(`${Math.ceil(healthPercent * 100)}%`, ctx.canvas.width / 2, y + barHeight + 12);
        
        ctx.restore();
    }
}

/**
 * Factory per creare nemici con pattern predefiniti
 */
class EnemyFactory {
    static createWave(type, count, game, pattern = 'straight') {
        const enemies = [];
        const s = game.gameScale || 1;
        const spacing = game.canvas.width / (count + 1);
        
        for (let i = 0; i < count; i++) {
            const x = spacing * (i + 1) - 24 * s;
            const enemy = new Enemy(x, -60 * s, type, s);
            enemy.setMovementPattern(pattern, { 
                amplitude: 80 * s,
                frequency: 2 + Math.random()
            });
            enemies.push(enemy);
        }
        
        return enemies;
    }

    static createFormation(type, formation, game) {
        const enemies = [];
        const s = game.gameScale || 1;
        const startX = game.canvas.width / 2;
        const startY = -60 * s;
        
        // Formazioni predefinite
        const formations = {
            'v': [
                [0, 0], [-1, 1], [1, 1], [-2, 2], [2, 2]
            ],
            'line': [
                [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0]
            ],
            'diamond': [
                [0, 0], [-1, 1], [1, 1], [0, 2], [-1, 3], [1, 3], [0, 4]
            ],
            'spiral': [
                [0, 0], [1, 0.5], [1.2, 1.5], [0.5, 2.2], [-0.5, 2.2], [-1.2, 1.5], [-1, 0.5]
            ],
            'pincer': [
                [-2.5, 0], [-1.5, 0.5], [-0.5, 1], [0.5, 1], [1.5, 0.5], [2.5, 0]
            ],
            'cross': [
                [0, 0], [0, 1], [0, 2], [-1, 1], [1, 1], [-2, 1], [2, 1]
            ],
            'wall': [
                [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0],
                [-1.5, 1], [-0.5, 1], [0.5, 1], [1.5, 1]
            ],
            'arrow': [
                [0, 0], [-1, 1], [1, 1], [-0.5, 2], [0.5, 2], [0, 3]
            ]
        };
        
        const points = formations[formation] || formations['line'];
        const spacing = 60 * s;
        
        points.forEach(([dx, dy], i) => {
            const enemy = new Enemy(
                startX + dx * spacing - 24 * s,
                startY - dy * spacing,
                type,
                s
            );
            enemy.setMovementPattern('sine', {
                amplitude: 60 * s,
                frequency: 1.5
            });
            enemies.push(enemy);
        });
        
        return enemies;
    }

    static createBoss(game, bossType = null) {
        // Choose boss type based on level if not specified
        if (!bossType) {
            const level = game.level || 1;
            const bossTypes = ['boss'];
            if (level >= 2) bossTypes.push('boss_hydra');
            if (level >= 3) bossTypes.push('boss_fortress');
            if (level >= 4) bossTypes.push('boss_void');
            bossType = bossTypes[Math.floor(Math.random() * bossTypes.length)];
        }

        const s = game.gameScale || 1;
        const bossWidths = {
            'boss': 80, 'boss_hydra': 90,
            'boss_fortress': 100, 'boss_void': 75
        };
        const halfW = (bossWidths[bossType] || 80) * s;

        const boss = new Enemy(
            game.canvas.width / 2 - halfW,
            -150 * s,
            bossType,
            s
        );
        boss.setMovementPattern(bossType);
        boss.applyLevelScaling(game.level || 1);
        return boss;
    }
}

export { Enemy, EnemyFactory };