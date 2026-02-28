import GameObject from './GameObject.js';
import { mono } from '../FontConfig.js';

// Shared performance mode (set once via Enemy.setPerformanceMode)
let _enemyPerfMode = 'high';

/**
 * Enemy types configuration
 */
const ENEMY_TYPES = {
    scout: {
        width: 48, height: 48, health: 1, speed: 100, score: 50,
        color: '#ee3333', shootRate: 0, dropChance: 0.08
    },
    fighter: {
        width: 56, height: 56, health: 2, speed: 80, score: 100,
        color: '#ee7700', shootRate: 2.5, dropChance: 0.12
    },
    heavy: {
        width: 72, height: 72, health: 5, speed: 50, score: 200,
        color: '#ddaa00', shootRate: 3, dropChance: 0.18
    },
    phantom: {
        width: 52, height: 52, health: 3, speed: 120, score: 150,
        color: '#9933ee', shootRate: 1.8, dropChance: 0.15
    },
    sentinel: {
        width: 64, height: 64, health: 6, speed: 40, score: 250,
        color: '#2288ee', shootRate: 2, dropChance: 0.2
    },
    swarm: {
        width: 36, height: 36, health: 1, speed: 130, score: 30,
        color: '#33cc44', shootRate: 0, dropChance: 0.05
    },

    // ═══════ WORLD 2 ENEMIES ═══════

    // Common W2 — stealth predator, phases in/out near player
    stalker: {
        width: 50, height: 50, health: 2, speed: 90, score: 180,
        color: '#44cc88', shootRate: 2, dropChance: 0.15,
        stealth: true
    },
    // Common W2 — spawns swarm enemies periodically
    nest: {
        width: 60, height: 60, health: 4, speed: 20, score: 300,
        color: '#996633', shootRate: 0, dropChance: 0.25,
        spawner: true
    },
    // Alien Jungle exclusive — quick vine whip attacker
    jungle_vine: {
        width: 44, height: 58, health: 2, speed: 70, score: 160,
        color: '#22aa44', shootRate: 2.2, dropChance: 0.12
    },
    // Volcanic exclusive — tanky fire creature
    lava_golem: {
        width: 62, height: 62, health: 3, speed: 55, score: 220,
        color: '#ff4400', shootRate: 2.5, dropChance: 0.18
    },
    // Frozen exclusive — fast ice shards
    frost_elemental: {
        width: 48, height: 48, health: 2, speed: 85, score: 190,
        color: '#66ddff', shootRate: 1.8, dropChance: 0.15
    },
    // Desert exclusive — bursts from ground
    sand_wurm: {
        width: 56, height: 70, health: 3, speed: 60, score: 210,
        color: '#ccaa55', shootRate: 3, dropChance: 0.17
    },
    // Mechanical exclusive — armored, slow, precision fire
    mech_drone: {
        width: 58, height: 58, health: 4, speed: 45, score: 260,
        color: '#8899aa', shootRate: 1.5, dropChance: 0.2
    },
    // Toxic exclusive — splits into 2 mini blobs on death
    toxic_blob: {
        width: 46, height: 46, health: 2, speed: 75, score: 170,
        color: '#88dd00', shootRate: 2, dropChance: 0.14,
        splits: true
    }
};

/**
 * Movement patterns
 */
const MOVEMENT = {
    straight: (enemy, dt) => {
        enemy.position.y += enemy.speed * dt;
    },
    sine: (enemy, dt) => {
        enemy.position.y += enemy.speed * dt;
        enemy.position.x += Math.sin(enemy.moveTimer * 2) * 80 * dt;
    },
    zigzag: (enemy, dt) => {
        enemy.position.y += enemy.speed * dt;
        enemy.movePhase = enemy.movePhase || 1;
        enemy.position.x += enemy.movePhase * enemy.speed * 0.6 * dt;
        if (enemy.position.x < 20 || enemy.position.x > enemy.canvasWidth - 20) {
            enemy.movePhase *= -1;
        }
    },
    dive: (enemy, dt) => {
        enemy.position.y += enemy.speed * 1.5 * dt;
        if (enemy.targetX !== undefined) {
            const dx = enemy.targetX - enemy.position.x;
            enemy.position.x += Math.sign(dx) * Math.min(Math.abs(dx), enemy.speed * 0.5 * dt);
        }
    },
    circle: (enemy, dt) => {
        enemy.moveTimer += dt;
        const radius = 60;
        enemy.position.x = enemy.startX + Math.cos(enemy.moveTimer * 1.5) * radius;
        enemy.position.y = enemy.startY + Math.sin(enemy.moveTimer * 1.5) * radius + enemy.speed * 0.3 * dt;
        enemy.startY += enemy.speed * 0.3 * dt;
    },
    // New patterns for level variety
    spiral: (enemy, dt) => {
        enemy.moveTimer += dt;
        const radius = 40 + enemy.moveTimer * 8;
        enemy.position.x = enemy.startX + Math.cos(enemy.moveTimer * 2) * radius;
        enemy.position.y += enemy.speed * 0.5 * dt;
    },
    strafe: (enemy, dt) => {
        // Move down then strafe horizontally
        if (enemy.position.y < enemy.strafeY) {
            enemy.position.y += enemy.speed * dt;
        } else {
            enemy.movePhase = enemy.movePhase || 1;
            enemy.position.x += enemy.movePhase * enemy.speed * 0.8 * dt;
            if (enemy.position.x < 30 || enemy.position.x > enemy.canvasWidth - 30) {
                enemy.movePhase *= -1;
            }
        }
    },
    swoop: (enemy, dt) => {
        enemy.moveTimer += dt;
        // Swooping U-shaped dive
        const phase = enemy.moveTimer * 1.5;
        enemy.position.y = enemy.startY + Math.sin(phase) * 120 + enemy.speed * 0.3 * dt;
        enemy.position.x += Math.cos(phase) * 100 * dt;
        enemy.startY += enemy.speed * 0.3 * dt;
    },
    pendulum: (enemy, dt) => {
        enemy.moveTimer += dt;
        enemy.position.y += enemy.speed * 0.7 * dt;
        const swing = Math.sin(enemy.moveTimer * 1.8) * 120;
        enemy.position.x = enemy.startX + swing;
    }
};

/**
 * Formation system — arranges enemies in geometric patterns
 */
const FORMATIONS = {
    /** Default: spawn at specified x positions */
    none: (enemies, canvasWidth) => enemies,

    /** V formation */
    vee: (enemies, canvasWidth) => {
        const cx = canvasWidth / 2;
        const count = enemies.length;
        return enemies.map((e, i) => {
            const offset = i - (count - 1) / 2;
            e.x = (cx + offset * 55) / canvasWidth;
            return e;
        });
    },

    /** Horizontal line */
    line: (enemies, canvasWidth) => {
        const count = enemies.length;
        const spacing = 0.8 / Math.max(count - 1, 1);
        return enemies.map((e, i) => {
            e.x = 0.1 + i * spacing;
            return e;
        });
    },

    /** Diamond shape */
    diamond: (enemies, canvasWidth) => {
        const positions = [
            [0.5], [0.35, 0.65], [0.2, 0.5, 0.8], [0.35, 0.65], [0.5]
        ].flat();
        return enemies.map((e, i) => {
            if (i < positions.length) e.x = positions[i];
            return e;
        });
    },

    /** Pincer — two groups at edges */
    pincer: (enemies, canvasWidth) => {
        const half = Math.ceil(enemies.length / 2);
        return enemies.map((e, i) => {
            if (i < half) {
                e.x = 0.1 + (i / half) * 0.2;
            } else {
                e.x = 0.7 + ((i - half) / (enemies.length - half)) * 0.2;
            }
            return e;
        });
    },

    /** Circle formation */
    ring: (enemies, canvasWidth) => {
        const count = enemies.length;
        const cx = 0.5;
        const radius = 0.2;
        return enemies.map((e, i) => {
            const angle = (Math.PI * 2 / count) * i - Math.PI / 2;
            e.x = cx + Math.cos(angle) * radius;
            return e;
        });
    },

    /** Staggered rows */
    stagger: (enemies, canvasWidth) => {
        return enemies.map((e, i) => {
            const row = Math.floor(i / 3);
            const col = i % 3;
            const offset = (row % 2) * 0.08;
            e.x = 0.25 + col * 0.25 + offset;
            return e;
        });
    },

    /** Cross/X pattern */
    cross: (enemies, canvasWidth) => {
        const positions = [0.5, 0.3, 0.7, 0.15, 0.85, 0.4, 0.6, 0.25, 0.75];
        return enemies.map((e, i) => {
            if (i < positions.length) e.x = positions[i];
            return e;
        });
    },

    /** Arrow pointing down */
    arrow: (enemies, canvasWidth) => {
        const count = enemies.length;
        return enemies.map((e, i) => {
            if (i === 0) { e.x = 0.5; }
            else {
                const side = (i % 2 === 1) ? -1 : 1;
                const row = Math.ceil(i / 2);
                e.x = 0.5 + side * row * 0.12;
            }
            return e;
        });
    }
};

/**
 * Enemy - All enemy entities
 */
class Enemy extends GameObject {
    static setPerformanceMode(mode) { _enemyPerfMode = mode; }

    constructor(x, y, type, pattern, canvasWidth, difficultyConfig, level = 1) {
        const config = ENEMY_TYPES[type] || ENEMY_TYPES.scout;
        super(x, y, config.width, config.height);
        this.tag = 'enemy';
        this.type = type;
        this.config = { ...config }; // clone so we can modify
        
        // Apply difficulty multipliers
        const diff = difficultyConfig || {};
        const hpMult = diff.enemyHpMult || 1;
        const spdMult = diff.enemySpeedMult || 1;
        const frMult = diff.enemyFireRateMult || 1;

        // Level-based scaling: enemies get tougher each level within a world
        // Use world-relative level so W2L1 (level 31) scales like L1, not L31
        // HP: +6% per level (1.0x at L1, ~2.74x at L30)
        // Speed: +2% per level (1.0x at L1, ~1.58x at L30) 
        const worldRelLevel = ((level - 1) % 30) + 1; // 1-30 per world
        const levelHpMult = 1 + (worldRelLevel - 1) * 0.06;
        const levelSpdMult = 1 + (worldRelLevel - 1) * (level > 30 ? 0.012 : 0.02);
        
        this.health = Math.ceil(config.health * hpMult * levelHpMult);
        this.maxHealth = this.health;
        this.speed = config.speed * spdMult * levelSpdMult;
        this.score = config.score;
        this.canvasWidth = canvasWidth;
        this.pattern = pattern || 'straight';
        this.moveTimer = 0;
        this.movePhase = Math.random() > 0.5 ? 1 : -1;
        this.startX = x;
        this.startY = y;
        this.strafeY = 100 + Math.random() * 100; // for strafe pattern
        this.shootTimer = config.shootRate > 0 ? Math.random() * (config.shootRate * frMult) : 999;
        this.config.shootRate = config.shootRate * frMult; // adjusted fire rate
        this.dropChance = config.dropChance;
        this.targetX = 0;
        this.hitFlash = 0;

        // Stealth enemy — starts nearly invisible
        if (config.stealth) {
            this.alpha = 0.08;
        }
        // Spawner nest — limited spawn count
        if (config.spawner) {
            this.spawnTimer = 3 + Math.random() * 2;
            this.spawnsLeft = 2;
        }
        // Toxic blob — flag for split-on-death
        this._splits = !!config.splits;
    }

    update(deltaTime, game) {
        // Allies are fully managed by AllyController — skip normal AI
        if (this._isAlly) return false;

        const dt = deltaTime * (game.timeScale || 1);
        this.moveTimer += dt;

        if (game.player && game.player.active) {
            this.targetX = game.player.position.x + game.player.width / 2;
        }

        const moveFn = MOVEMENT[this.pattern];
        if (moveFn) moveFn(this, dt);

        // ── Clamp visual position to screen bounds (don't move startX anchor) ──
        const margin = 10;
        this.position.x = Math.max(-margin, Math.min(this.canvasWidth - this.width + margin, this.position.x));

        if (this.config.shootRate > 0) {
            this.shootTimer -= dt;
            if (this.shootTimer <= 0) {
                this.shoot(game);
                this.shootTimer = this.config.shootRate + (Math.random() - 0.5) * 0.5;
            }
        }

        if (this.hitFlash > 0) this.hitFlash -= deltaTime * 5;

        // ── Stealth behaviour ──
        if (this.config.stealth && game.player && game.player.active) {
            const dx = (this.position.x + this.width / 2) - (game.player.position.x + game.player.width / 2);
            const dy = (this.position.y + this.height / 2) - (game.player.position.y + game.player.height / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);
            const targetAlpha = dist < 180 ? 1 : 0.08;
            this.alpha += (targetAlpha - this.alpha) * 3 * dt;
        }

        // ── Spawner nest behaviour ──
        if (this.config.spawner && this.spawnsLeft > 0) {
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) {
                this.spawnTimer = 3.5 + Math.random();
                this.spawnsLeft--;
                const level = game.levelManager ? game.levelManager.currentLevel : 1;
                for (let i = 0; i < 2; i++) {
                    const sx = this.position.x + this.width / 2 + (Math.random() - 0.5) * 40;
                    const sy = this.position.y + this.height;
                    const spawn = new Enemy(sx, sy, 'swarm', 'straight', this.canvasWidth, game.difficulty, level);
                    game.entityManager.enemies.push(spawn);
                }
                game.particles.emit(this.position.x + this.width / 2, this.position.y + this.height / 2, 'hit', 6);
            }
        }

        if (this.position.y > game.logicalHeight + 50) {
            this.destroy();
        }
    }

    shoot(game) {
        const cx = this.position.x + this.width / 2;
        const by = this.position.y + this.height;
        const bsMult = (game.difficulty && game.difficulty.enemyBulletSpeedMult) || 1;
        game.spawnBullet(cx, by, 0, 200 * bsMult, 'enemy');
        game.sound.playEnemyShoot();
    }

    takeDamage(amount, game) {
        this.health -= amount;
        this.hitFlash = 1;

        game.particles.emit(
            this.position.x + this.width / 2,
            this.position.y + this.height / 2,
            'hit', 4
        );

        if (this.health <= 0) {
            this.health = 0;
            // Toxic blob splits into 2 mini swarm enemies on death
            if (this._splits && game.entityManager) {
                const level = game.levelManager ? game.levelManager.currentLevel : 1;
                for (let i = 0; i < 2; i++) {
                    const ox = (i === 0 ? -20 : 20);
                    const spawn = new Enemy(
                        this.position.x + ox, this.position.y,
                        'swarm', 'sine', this.canvasWidth, game.difficulty, level
                    );
                    spawn._splits = false; // prevent infinite recursion
                    game.entityManager.enemies.push(spawn);
                }
            }
            this.destroy();
            return true;
        }
        return false;
    }

    render(ctx, assets) {
        if (!this.active) return;

        ctx.save();
        ctx.globalAlpha = this.alpha;

        const cx = this.position.x + this.width / 2;
        const cy = this.position.y + this.height / 2;

        // Glow aura — always rendered, shadowBlur only on high
        if (_enemyPerfMode === 'high') {
            ctx.save();
            ctx.globalAlpha = 0.15;
            ctx.shadowColor = this.config.color;
            ctx.shadowBlur = 12;
            ctx.fillStyle = this.config.color;
            ctx.beginPath();
            ctx.arc(cx, cy, this.width * 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else {
            // Cheap glow: semi-transparent circle, no shadowBlur (visually close)
            ctx.globalAlpha = 0.1;
            ctx.fillStyle = this.config.color;
            ctx.beginPath();
            ctx.arc(cx, cy, this.width * 0.45, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = this.alpha;
        }

        const sprite = assets.getSprite(`enemy_${this.type}`);
        const pad = 8;
        if (sprite) {
            ctx.drawImage(sprite, this.position.x - pad, this.position.y - pad, this.width + pad * 2, this.height + pad * 2);
        } else {
            ctx.fillStyle = this.config.color;
            ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
        }

        if (this.hitFlash > 0) {
            ctx.save();
            ctx.globalAlpha = this.hitFlash * 0.6;
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(cx, cy, this.width * 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        if (this.maxHealth > 1 && this.health < this.maxHealth) {
            const barW = this.width + 4;
            const barH = 4;
            const barX = this.position.x - 2;
            const barY = this.position.y - 8;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.beginPath();
            ctx.roundRect(barX, barY, barW, barH, 2);
            ctx.fill();
            const hpRatio = this.health / this.maxHealth;
            const hpColor = hpRatio > 0.5 ? '#44ff44' : hpRatio > 0.25 ? '#ffaa00' : '#ff4444';
            ctx.fillStyle = hpColor;
            ctx.beginPath();
            ctx.roundRect(barX, barY, barW * hpRatio, barH, 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.roundRect(barX, barY, barW, barH, 2);
            ctx.stroke();
        }

        ctx.restore();
    }
}

// ============================================================
//  MULTI-PART BOSS SYSTEM
// ============================================================

/**
 * BossPart — An independently-moving, damageable, shooting component of a boss.
 * Each part has its own: position (relative offset from boss center), health,
 * collision box, rotation, shooting behavior, and sprite key.
 */
class BossPart {
    constructor(config) {
        this.offsetX = config.offsetX || 0;       // offset from boss center
        this.offsetY = config.offsetY || 0;
        this.width = config.width || 30;
        this.height = config.height || 30;
        this.health = config.health || 10;
        this.maxHealth = this.health;
        this.spriteKey = config.spriteKey || null;
        this.role = config.role || 'armor';         // core, turret, arm, shield, weakpoint
        this.isCore = config.role === 'core';
        this.destroyable = config.destroyable !== false;
        this.active = true;
        this.hitFlash = 0;

        // Position in world (computed each frame)
        this.worldX = 0;
        this.worldY = 0;

        // Rotation (for arms/turrets that rotate)
        this.rotation = config.rotation || 0;
        this.rotationSpeed = config.rotationSpeed || 0;
        this.orbitAngle = config.orbitAngle || 0;
        this.orbitRadius = config.orbitRadius || 0;
        this.orbitSpeed = config.orbitSpeed || 0;

        // Shooting
        this.canShoot = config.canShoot || false;
        this.shootRate = config.shootRate || 2;
        this.shootTimer = this.shootRate * Math.random();
        this.shootPattern = config.shootPattern || 'aimed'; // aimed, spread, radial, rapid
        this.bulletSpeed = config.bulletSpeed || 150;
        this.bulletCount = config.bulletCount || 1;

        // Visual oscillation
        this.bobAmplitude = config.bobAmplitude || 0;
        this.bobSpeed = config.bobSpeed || 0;
        this.bobPhase = Math.random() * Math.PI * 2;

        // Score bonus when this part is destroyed
        this.score = config.score || 50;
    }

    /** Update world position from boss center + own offsets + oscillation */
    updatePosition(bossCX, bossCY, bossTime) {
        let ox = this.offsetX;
        let oy = this.offsetY;

        // Orbit around boss center
        if (this.orbitRadius > 0) {
            this.orbitAngle += this.orbitSpeed * 0.016; // approximate dt
            ox = Math.cos(this.orbitAngle) * this.orbitRadius;
            oy = Math.sin(this.orbitAngle) * this.orbitRadius;
        }

        // Bob
        if (this.bobAmplitude > 0) {
            this.bobPhase += this.bobSpeed * 0.016;
            oy += Math.sin(this.bobPhase) * this.bobAmplitude;
        }

        // Rotation
        this.rotation += this.rotationSpeed * 0.016;

        this.worldX = bossCX + ox - this.width / 2;
        this.worldY = bossCY + oy - this.height / 2;
    }

    /** Shoot based on this part's pattern */
    shoot(game, bossTime) {
        if (!this.canShoot || !this.active) return;
        const cx = this.worldX + this.width / 2;
        const cy = this.worldY + this.height / 2;

        switch (this.shootPattern) {
            case 'aimed': {
                if (!game.player || !game.player.active) return;
                const px = game.player.position.x + game.player.width / 2;
                const py = game.player.position.y + game.player.height / 2;
                const angle = Math.atan2(py - cy, px - cx);
                game.spawnBullet(cx, cy, Math.cos(angle) * this.bulletSpeed, Math.sin(angle) * this.bulletSpeed, 'enemy');
                break;
            }
            case 'spread': {
                const count = this.bulletCount || 3;
                for (let i = 0; i < count; i++) {
                    const angle = Math.PI / 2 + (i - (count - 1) / 2) * 0.3;
                    game.spawnBullet(cx, cy, Math.cos(angle) * this.bulletSpeed, Math.sin(angle) * this.bulletSpeed, 'enemy');
                }
                break;
            }
            case 'radial': {
                const count = this.bulletCount || 8;
                for (let i = 0; i < count; i++) {
                    const angle = (Math.PI * 2 / count) * i + bossTime;
                    game.spawnBullet(cx, cy, Math.cos(angle) * this.bulletSpeed, Math.sin(angle) * this.bulletSpeed, 'enemy');
                }
                break;
            }
            case 'rapid': {
                if (!game.player || !game.player.active) return;
                const px = game.player.position.x + game.player.width / 2;
                const py = game.player.position.y + game.player.height / 2;
                const angle = Math.atan2(py - cy, px - cx);
                for (let i = 0; i < 3; i++) {
                    const spread = (Math.random() - 0.5) * 0.2;
                    game.spawnBullet(cx, cy,
                        Math.cos(angle + spread) * (this.bulletSpeed + i * 20),
                        Math.sin(angle + spread) * (this.bulletSpeed + i * 20), 'enemy');
                }
                break;
            }
            case 'spiral': {
                const count = this.bulletCount || 4;
                for (let i = 0; i < count; i++) {
                    const angle = (Math.PI * 2 / count) * i + bossTime * 2;
                    game.spawnBullet(cx, cy, Math.cos(angle) * this.bulletSpeed, Math.sin(angle) * this.bulletSpeed, 'enemy');
                }
                break;
            }
        }
        game.sound.playEnemyShoot();
    }

    takeDamage(amount) {
        if (!this.active || !this.destroyable) return false;
        this.health -= amount;
        this.hitFlash = 1;
        if (this.health <= 0) {
            this.health = 0;
            this.active = false;
            return true; // part destroyed
        }
        return false;
    }

    /** Check if point (bullet center) hits this part */
    containsPoint(px, py) {
        return px >= this.worldX && px <= this.worldX + this.width &&
               py >= this.worldY && py <= this.worldY + this.height;
    }

    /** Circle collision */
    collidesCircle(otherCX, otherCY, otherR) {
        const cx = this.worldX + this.width / 2;
        const cy = this.worldY + this.height / 2;
        const r = Math.min(this.width, this.height) / 2;
        const dx = cx - otherCX;
        const dy = cy - otherCY;
        return Math.sqrt(dx * dx + dy * dy) < r + otherR;
    }

    render(ctx, assets) {
        if (!this.active) return;

        ctx.save();
        const cx = this.worldX + this.width / 2;
        const cy = this.worldY + this.height / 2;

        // Draw sprite or fallback
        if (this.rotation !== 0) {
            ctx.translate(cx, cy);
            ctx.rotate(this.rotation);
            ctx.translate(-cx, -cy);
        }

        const sprite = this.spriteKey && assets ? assets.getSprite(this.spriteKey) : null;
        if (sprite) {
            ctx.drawImage(sprite, this.worldX - 4, this.worldY - 4, this.width + 8, this.height + 8);
        } else {
            // Fallback colored shape
            ctx.fillStyle = this.isCore ? '#ff2244' : this.role === 'turret' ? '#ffaa33' :
                this.role === 'shield' ? '#4488ff' : '#cc6633';
            ctx.beginPath();
            ctx.arc(cx, cy, this.width / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#111';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Hit flash
        if (this.hitFlash > 0) {
            ctx.globalAlpha = this.hitFlash * 0.5;
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(cx, cy, this.width / 2, 0, Math.PI * 2);
            ctx.fill();
            this.hitFlash -= 0.05;
        }

        ctx.restore();
    }
}

// ============================================================
//  BOSS DEFINITIONS — 6 unique boss configurations
// ============================================================

const BOSS_DEFS = {
    // Boss 1 (Level 5): Crimson Vanguard — classic, simple
    1: {
        name: 'Crimson Vanguard',
        totalWidth: 160, totalHeight: 150,
        baseHP: 40,
        score: 800,
        speed: 35,
        movePattern: 'sweep',
        color: '#dd2222',
        parts: [
            { role: 'core', offsetX: 0, offsetY: 0, width: 70, height: 70, health: 40,
              spriteKey: 'boss1_core', canShoot: true, shootRate: 2.5, shootPattern: 'spread', bulletCount: 3, bulletSpeed: 120 },
            { role: 'turret', offsetX: -55, offsetY: -10, width: 30, height: 30, health: 12,
              spriteKey: 'boss1_turret', canShoot: true, shootRate: 2, shootPattern: 'aimed', bulletSpeed: 160 },
            { role: 'turret', offsetX: 55, offsetY: -10, width: 30, height: 30, health: 12,
              spriteKey: 'boss1_turret', canShoot: true, shootRate: 2, shootPattern: 'aimed', bulletSpeed: 160 },
            { role: 'arm', offsetX: -40, offsetY: 20, width: 35, height: 45, health: 15,
              spriteKey: 'boss1_arm', bobAmplitude: 5, bobSpeed: 2 },
            { role: 'arm', offsetX: 40, offsetY: 20, width: 35, height: 45, health: 15,
              spriteKey: 'boss1_arm', bobAmplitude: 5, bobSpeed: 2 },
        ]
    },
    // Boss 2 (Level 10): Iron Monolith — heavy tank, shielded
    2: {
        name: 'Iron Monolith',
        totalWidth: 190, totalHeight: 170,
        baseHP: 60,
        score: 1200,
        speed: 25,
        movePattern: 'slowSweep',
        color: '#ee7700',
        parts: [
            { role: 'core', offsetX: 0, offsetY: 0, width: 80, height: 80, health: 60,
              spriteKey: 'boss2_core', canShoot: true, shootRate: 3, shootPattern: 'radial', bulletCount: 10, bulletSpeed: 100 },
            { role: 'shield', offsetX: 0, offsetY: -50, width: 100, height: 25, health: 25,
              spriteKey: 'boss2_shield', bobAmplitude: 3, bobSpeed: 1.5 },
            { role: 'turret', offsetX: -65, offsetY: -25, width: 35, height: 35, health: 18,
              spriteKey: 'boss2_turret', canShoot: true, shootRate: 1.8, shootPattern: 'rapid', bulletSpeed: 170, bulletCount: 3 },
            { role: 'turret', offsetX: 65, offsetY: -25, width: 35, height: 35, health: 18,
              spriteKey: 'boss2_turret', canShoot: true, shootRate: 1.8, shootPattern: 'rapid', bulletSpeed: 170, bulletCount: 3 },
            { role: 'arm', offsetX: -50, offsetY: 30, width: 40, height: 55, health: 20,
              spriteKey: 'boss2_arm', bobAmplitude: 4, bobSpeed: 1.8 },
            { role: 'arm', offsetX: 50, offsetY: 30, width: 40, height: 55, health: 20,
              spriteKey: 'boss2_arm', bobAmplitude: 4, bobSpeed: 1.8 },
        ]
    },
    // Boss 3 (Level 15): Void Leviathan — phasing, orbiting parts
    3: {
        name: 'Void Leviathan',
        totalWidth: 200, totalHeight: 190,
        baseHP: 75,
        score: 1800,
        speed: 40,
        movePattern: 'weave',
        color: '#7722dd',
        parts: [
            { role: 'core', offsetX: 0, offsetY: 0, width: 75, height: 75, health: 75,
              spriteKey: 'boss3_core', canShoot: true, shootRate: 2, shootPattern: 'spiral', bulletCount: 5, bulletSpeed: 110 },
            { role: 'turret', offsetX: 0, offsetY: 0, width: 28, height: 28, health: 15,
              spriteKey: 'boss3_orb', orbitRadius: 70, orbitAngle: 0, orbitSpeed: 1.5,
              canShoot: true, shootRate: 2.5, shootPattern: 'aimed', bulletSpeed: 150 },
            { role: 'turret', offsetX: 0, offsetY: 0, width: 28, height: 28, health: 15,
              spriteKey: 'boss3_orb', orbitRadius: 70, orbitAngle: Math.PI, orbitSpeed: 1.5,
              canShoot: true, shootRate: 2.5, shootPattern: 'aimed', bulletSpeed: 150 },
            { role: 'turret', offsetX: 0, offsetY: 0, width: 28, height: 28, health: 15,
              spriteKey: 'boss3_orb', orbitRadius: 70, orbitAngle: Math.PI / 2, orbitSpeed: 1.5,
              canShoot: true, shootRate: 2.5, shootPattern: 'aimed', bulletSpeed: 150 },
            { role: 'arm', offsetX: -55, offsetY: 25, width: 35, height: 50, health: 20,
              spriteKey: 'boss3_arm', rotationSpeed: 0.5 },
            { role: 'arm', offsetX: 55, offsetY: 25, width: 35, height: 50, health: 20,
              spriteKey: 'boss3_arm', rotationSpeed: -0.5 },
        ]
    },
    // Boss 4 (Level 20): Omega Prime — double core, massive
    4: {
        name: 'Omega Prime',
        totalWidth: 220, totalHeight: 200,
        baseHP: 95,
        score: 2500,
        speed: 30,
        movePattern: 'figure8',
        color: '#dd1177',
        parts: [
            { role: 'core', offsetX: 0, offsetY: -15, width: 85, height: 85, health: 95,
              spriteKey: 'boss4_core', canShoot: true, shootRate: 1.5, shootPattern: 'radial', bulletCount: 12, bulletSpeed: 120 },
            { role: 'weakpoint', offsetX: 0, offsetY: 45, width: 25, height: 25, health: 20,
              spriteKey: 'boss4_weak', score: 200 },
            { role: 'turret', offsetX: -75, offsetY: -30, width: 35, height: 35, health: 20,
              spriteKey: 'boss4_turret', canShoot: true, shootRate: 1.2, shootPattern: 'spread', bulletCount: 5, bulletSpeed: 140 },
            { role: 'turret', offsetX: 75, offsetY: -30, width: 35, height: 35, health: 20,
              spriteKey: 'boss4_turret', canShoot: true, shootRate: 1.2, shootPattern: 'spread', bulletCount: 5, bulletSpeed: 140 },
            { role: 'shield', offsetX: -45, offsetY: -55, width: 40, height: 20, health: 18,
              spriteKey: 'boss4_shield', bobAmplitude: 4, bobSpeed: 2 },
            { role: 'shield', offsetX: 45, offsetY: -55, width: 40, height: 20, health: 18,
              spriteKey: 'boss4_shield', bobAmplitude: 4, bobSpeed: 2 },
            { role: 'arm', offsetX: -60, offsetY: 35, width: 40, height: 60, health: 22,
              spriteKey: 'boss4_arm', bobAmplitude: 6, bobSpeed: 1.5 },
            { role: 'arm', offsetX: 60, offsetY: 35, width: 40, height: 60, health: 22,
              spriteKey: 'boss4_arm', bobAmplitude: 6, bobSpeed: 1.5 },
        ]
    },
    // Boss 5 (Level 25): Nemesis — fast, many orbiting weapons
    5: {
        name: 'Nemesis',
        totalWidth: 200, totalHeight: 200,
        baseHP: 110,
        score: 3200,
        speed: 50,
        movePattern: 'chase',
        color: '#dd3355',
        parts: [
            { role: 'core', offsetX: 0, offsetY: 0, width: 70, height: 70, health: 110,
              spriteKey: 'boss5_core', canShoot: true, shootRate: 1.5, shootPattern: 'spiral', bulletCount: 6, bulletSpeed: 130 },
            { role: 'turret', offsetX: 0, offsetY: 0, width: 25, height: 25, health: 12,
              spriteKey: 'boss5_orb', orbitRadius: 55, orbitAngle: 0, orbitSpeed: 2.5,
              canShoot: true, shootRate: 1.5, shootPattern: 'aimed', bulletSpeed: 180 },
            { role: 'turret', offsetX: 0, offsetY: 0, width: 25, height: 25, health: 12,
              spriteKey: 'boss5_orb', orbitRadius: 55, orbitAngle: Math.PI * 2 / 3, orbitSpeed: 2.5,
              canShoot: true, shootRate: 1.5, shootPattern: 'aimed', bulletSpeed: 180 },
            { role: 'turret', offsetX: 0, offsetY: 0, width: 25, height: 25, health: 12,
              spriteKey: 'boss5_orb', orbitRadius: 55, orbitAngle: Math.PI * 4 / 3, orbitSpeed: 2.5,
              canShoot: true, shootRate: 1.5, shootPattern: 'aimed', bulletSpeed: 180 },
            { role: 'turret', offsetX: 0, offsetY: 0, width: 30, height: 30, health: 14,
              spriteKey: 'boss5_orb', orbitRadius: 85, orbitAngle: Math.PI / 3, orbitSpeed: -1.8,
              canShoot: true, shootRate: 2, shootPattern: 'spread', bulletCount: 3, bulletSpeed: 140 },
            { role: 'turret', offsetX: 0, offsetY: 0, width: 30, height: 30, health: 14,
              spriteKey: 'boss5_orb', orbitRadius: 85, orbitAngle: Math.PI, orbitSpeed: -1.8,
              canShoot: true, shootRate: 2, shootPattern: 'spread', bulletCount: 3, bulletSpeed: 140 },
            { role: 'arm', offsetX: -45, offsetY: 40, width: 30, height: 40, health: 15,
              spriteKey: 'boss5_arm' },
            { role: 'arm', offsetX: 45, offsetY: 40, width: 30, height: 40, health: 15,
              spriteKey: 'boss5_arm' },
        ]
    },
    // Boss 6 (Level 30): Apocalypse — final boss, multi-phase, devastating
    6: {
        name: 'Apocalypse',
        totalWidth: 240, totalHeight: 220,
        baseHP: 150,
        score: 5000,
        speed: 35,
        movePattern: 'erratic',
        color: '#ff2200',
        parts: [
            { role: 'core', offsetX: 0, offsetY: 0, width: 90, height: 90, health: 150,
              spriteKey: 'boss6_core', canShoot: true, shootRate: 1.2, shootPattern: 'radial', bulletCount: 16, bulletSpeed: 110 },
            { role: 'turret', offsetX: -80, offsetY: -35, width: 35, height: 35, health: 22,
              spriteKey: 'boss6_turret', canShoot: true, shootRate: 1, shootPattern: 'rapid', bulletSpeed: 190, bulletCount: 4 },
            { role: 'turret', offsetX: 80, offsetY: -35, width: 35, height: 35, health: 22,
              spriteKey: 'boss6_turret', canShoot: true, shootRate: 1, shootPattern: 'rapid', bulletSpeed: 190, bulletCount: 4 },
            { role: 'turret', offsetX: 0, offsetY: 0, width: 28, height: 28, health: 16,
              spriteKey: 'boss6_orb', orbitRadius: 90, orbitAngle: 0, orbitSpeed: 2,
              canShoot: true, shootRate: 1.5, shootPattern: 'aimed', bulletSpeed: 170 },
            { role: 'turret', offsetX: 0, offsetY: 0, width: 28, height: 28, health: 16,
              spriteKey: 'boss6_orb', orbitRadius: 90, orbitAngle: Math.PI / 2, orbitSpeed: 2,
              canShoot: true, shootRate: 1.5, shootPattern: 'aimed', bulletSpeed: 170 },
            { role: 'turret', offsetX: 0, offsetY: 0, width: 28, height: 28, health: 16,
              spriteKey: 'boss6_orb', orbitRadius: 90, orbitAngle: Math.PI, orbitSpeed: 2,
              canShoot: true, shootRate: 1.5, shootPattern: 'aimed', bulletSpeed: 170 },
            { role: 'turret', offsetX: 0, offsetY: 0, width: 28, height: 28, health: 16,
              spriteKey: 'boss6_orb', orbitRadius: 90, orbitAngle: Math.PI * 3 / 2, orbitSpeed: 2,
              canShoot: true, shootRate: 1.5, shootPattern: 'aimed', bulletSpeed: 170 },
            { role: 'shield', offsetX: 0, offsetY: -65, width: 120, height: 25, health: 30,
              spriteKey: 'boss6_shield', bobAmplitude: 3, bobSpeed: 1.5 },
            { role: 'weakpoint', offsetX: -35, offsetY: 50, width: 22, height: 22, health: 15,
              spriteKey: 'boss6_weak', score: 300 },
            { role: 'weakpoint', offsetX: 35, offsetY: 50, width: 22, height: 22, health: 15,
              spriteKey: 'boss6_weak', score: 300 },
            { role: 'arm', offsetX: -70, offsetY: 40, width: 45, height: 65, health: 28,
              spriteKey: 'boss6_arm', bobAmplitude: 5, bobSpeed: 1.2 },
            { role: 'arm', offsetX: 70, offsetY: 40, width: 45, height: 65, health: 28,
              spriteKey: 'boss6_arm', bobAmplitude: 5, bobSpeed: 1.2 },
        ]
    },

    // ═══════════════════════════════════════════
    //  WORLD 2 BOSSES — 6 planetary guardians
    // ═══════════════════════════════════════════

    // Boss 7 (Level 35): Titanus Rex — Alien Jungle guardian
    7: {
        name: 'Titanus Rex',
        totalWidth: 200, totalHeight: 190,
        baseHP: 110,
        score: 5500,
        speed: 38,
        movePattern: 'chase',
        color: '#22cc44',
        parts: [
            { role: 'core', offsetX: 0, offsetY: 0, width: 85, height: 85, health: 110,
              spriteKey: 'boss7_core', canShoot: true, shootRate: 2, shootPattern: 'spread', bulletCount: 5, bulletSpeed: 130 },
            { role: 'turret', offsetX: -65, offsetY: -30, width: 32, height: 32, health: 16,
              spriteKey: 'boss7_turret', canShoot: true, shootRate: 1.8, shootPattern: 'aimed', bulletSpeed: 160 },
            { role: 'turret', offsetX: 65, offsetY: -30, width: 32, height: 32, health: 16,
              spriteKey: 'boss7_turret', canShoot: true, shootRate: 1.8, shootPattern: 'aimed', bulletSpeed: 160 },
            { role: 'arm', offsetX: -50, offsetY: 35, width: 40, height: 55, health: 18,
              spriteKey: 'boss7_arm', bobAmplitude: 6, bobSpeed: 1.8 },
            { role: 'arm', offsetX: 50, offsetY: 35, width: 40, height: 55, health: 18,
              spriteKey: 'boss7_arm', bobAmplitude: 6, bobSpeed: 1.8 },
            { role: 'shield', offsetX: 0, offsetY: -55, width: 90, height: 22, health: 14,
              spriteKey: 'boss7_shield', bobAmplitude: 3, bobSpeed: 1.5 },
        ]
    },
    // Boss 8 (Level 40): Magma Colossus — Volcanic guardian
    8: {
        name: 'Magma Colossus',
        totalWidth: 220, totalHeight: 200,
        baseHP: 160,
        score: 6000,
        speed: 28,
        movePattern: 'figure8',
        color: '#ff5500',
        parts: [
            { role: 'core', offsetX: 0, offsetY: 0, width: 90, height: 90, health: 160,
              spriteKey: 'boss8_core', canShoot: true, shootRate: 1.5, shootPattern: 'radial', bulletCount: 12, bulletSpeed: 120 },
            { role: 'turret', offsetX: -75, offsetY: -30, width: 35, height: 35, health: 25,
              spriteKey: 'boss8_turret', canShoot: true, shootRate: 1.3, shootPattern: 'spread', bulletCount: 4, bulletSpeed: 150 },
            { role: 'turret', offsetX: 75, offsetY: -30, width: 35, height: 35, health: 25,
              spriteKey: 'boss8_turret', canShoot: true, shootRate: 1.3, shootPattern: 'spread', bulletCount: 4, bulletSpeed: 150 },
            { role: 'turret', offsetX: 0, offsetY: 0, width: 28, height: 28, health: 18,
              spriteKey: 'boss8_orb', orbitRadius: 80, orbitAngle: 0, orbitSpeed: 1.8,
              canShoot: true, shootRate: 2, shootPattern: 'aimed', bulletSpeed: 170 },
            { role: 'turret', offsetX: 0, offsetY: 0, width: 28, height: 28, health: 18,
              spriteKey: 'boss8_orb', orbitRadius: 80, orbitAngle: Math.PI, orbitSpeed: 1.8,
              canShoot: true, shootRate: 2, shootPattern: 'aimed', bulletSpeed: 170 },
            { role: 'arm', offsetX: -60, offsetY: 40, width: 45, height: 60, health: 28,
              spriteKey: 'boss8_arm', bobAmplitude: 5, bobSpeed: 1.3 },
            { role: 'arm', offsetX: 60, offsetY: 40, width: 45, height: 60, health: 28,
              spriteKey: 'boss8_arm', bobAmplitude: 5, bobSpeed: 1.3 },
            { role: 'shield', offsetX: 0, offsetY: -65, width: 110, height: 25, health: 28,
              spriteKey: 'boss8_shield', bobAmplitude: 3, bobSpeed: 1.5 },
        ]
    },
    // Boss 9 (Level 45): Frost Sovereign — Frozen guardian
    9: {
        name: 'Frost Sovereign',
        totalWidth: 210, totalHeight: 200,
        baseHP: 210,
        score: 7500,
        speed: 42,
        movePattern: 'weave',
        color: '#44bbff',
        parts: [
            { role: 'core', offsetX: 0, offsetY: 0, width: 80, height: 80, health: 210,
              spriteKey: 'boss9_core', canShoot: true, shootRate: 1.8, shootPattern: 'spiral', bulletCount: 6, bulletSpeed: 125 },
            { role: 'turret', offsetX: 0, offsetY: 0, width: 26, height: 26, health: 16,
              spriteKey: 'boss9_orb', orbitRadius: 65, orbitAngle: 0, orbitSpeed: 2,
              canShoot: true, shootRate: 2, shootPattern: 'aimed', bulletSpeed: 165 },
            { role: 'turret', offsetX: 0, offsetY: 0, width: 26, height: 26, health: 16,
              spriteKey: 'boss9_orb', orbitRadius: 65, orbitAngle: Math.PI * 2 / 3, orbitSpeed: 2,
              canShoot: true, shootRate: 2, shootPattern: 'aimed', bulletSpeed: 165 },
            { role: 'turret', offsetX: 0, offsetY: 0, width: 26, height: 26, health: 16,
              spriteKey: 'boss9_orb', orbitRadius: 65, orbitAngle: Math.PI * 4 / 3, orbitSpeed: 2,
              canShoot: true, shootRate: 2, shootPattern: 'aimed', bulletSpeed: 165 },
            { role: 'shield', offsetX: -40, offsetY: -50, width: 35, height: 18, health: 20,
              spriteKey: 'boss9_shield', bobAmplitude: 3, bobSpeed: 2 },
            { role: 'shield', offsetX: 40, offsetY: -50, width: 35, height: 18, health: 20,
              spriteKey: 'boss9_shield', bobAmplitude: 3, bobSpeed: 2 },
            { role: 'arm', offsetX: -55, offsetY: 30, width: 38, height: 50, health: 24,
              spriteKey: 'boss9_arm', rotationSpeed: 0.4 },
            { role: 'arm', offsetX: 55, offsetY: 30, width: 38, height: 50, health: 24,
              spriteKey: 'boss9_arm', rotationSpeed: -0.4 },
        ]
    },
    // Boss 10 (Level 50): Sandstorm Leviathan — Desert guardian
    10: {
        name: 'Sandstorm Leviathan',
        totalWidth: 230, totalHeight: 210,
        baseHP: 250,
        score: 8500,
        speed: 48,
        movePattern: 'erratic',
        color: '#ddaa33',
        parts: [
            { role: 'core', offsetX: 0, offsetY: 0, width: 85, height: 85, health: 250,
              spriteKey: 'boss10_core', canShoot: true, shootRate: 1.3, shootPattern: 'radial', bulletCount: 14, bulletSpeed: 125 },
            { role: 'turret', offsetX: -80, offsetY: -35, width: 35, height: 35, health: 24,
              spriteKey: 'boss10_turret', canShoot: true, shootRate: 1.2, shootPattern: 'rapid', bulletSpeed: 185, bulletCount: 3 },
            { role: 'turret', offsetX: 80, offsetY: -35, width: 35, height: 35, health: 24,
              spriteKey: 'boss10_turret', canShoot: true, shootRate: 1.2, shootPattern: 'rapid', bulletSpeed: 185, bulletCount: 3 },
            { role: 'turret', offsetX: 0, offsetY: 0, width: 30, height: 30, health: 18,
              spriteKey: 'boss10_orb', orbitRadius: 85, orbitAngle: 0, orbitSpeed: -2,
              canShoot: true, shootRate: 1.8, shootPattern: 'spread', bulletCount: 3, bulletSpeed: 155 },
            { role: 'turret', offsetX: 0, offsetY: 0, width: 30, height: 30, health: 18,
              spriteKey: 'boss10_orb', orbitRadius: 85, orbitAngle: Math.PI, orbitSpeed: -2,
              canShoot: true, shootRate: 1.8, shootPattern: 'spread', bulletCount: 3, bulletSpeed: 155 },
            { role: 'weakpoint', offsetX: 0, offsetY: 50, width: 24, height: 24, health: 18,
              spriteKey: 'boss10_weak', score: 350 },
            { role: 'arm', offsetX: -65, offsetY: 40, width: 42, height: 60, health: 26,
              spriteKey: 'boss10_arm', bobAmplitude: 6, bobSpeed: 1.5 },
            { role: 'arm', offsetX: 65, offsetY: 40, width: 42, height: 60, health: 26,
              spriteKey: 'boss10_arm', bobAmplitude: 6, bobSpeed: 1.5 },
        ]
    },
    // Boss 11 (Level 55): Omega Construct — Mechanical guardian
    11: {
        name: 'Omega Construct',
        totalWidth: 240, totalHeight: 220,
        baseHP: 280,
        score: 9500,
        speed: 30,
        movePattern: 'slowSweep',
        color: '#7799bb',
        parts: [
            { role: 'core', offsetX: 0, offsetY: 0, width: 90, height: 90, health: 280,
              spriteKey: 'boss11_core', canShoot: true, shootRate: 1.2, shootPattern: 'spiral', bulletCount: 8, bulletSpeed: 130 },
            { role: 'turret', offsetX: -85, offsetY: -30, width: 35, height: 35, health: 25,
              spriteKey: 'boss11_turret', canShoot: true, shootRate: 1, shootPattern: 'rapid', bulletSpeed: 195, bulletCount: 4 },
            { role: 'turret', offsetX: 85, offsetY: -30, width: 35, height: 35, health: 25,
              spriteKey: 'boss11_turret', canShoot: true, shootRate: 1, shootPattern: 'rapid', bulletSpeed: 195, bulletCount: 4 },
            { role: 'turret', offsetX: -45, offsetY: -50, width: 28, height: 28, health: 18,
              spriteKey: 'boss11_turret2', canShoot: true, shootRate: 1.5, shootPattern: 'aimed', bulletSpeed: 175 },
            { role: 'turret', offsetX: 45, offsetY: -50, width: 28, height: 28, health: 18,
              spriteKey: 'boss11_turret2', canShoot: true, shootRate: 1.5, shootPattern: 'aimed', bulletSpeed: 175 },
            { role: 'shield', offsetX: 0, offsetY: -70, width: 130, height: 25, health: 35,
              spriteKey: 'boss11_shield', bobAmplitude: 3, bobSpeed: 1.5 },
            { role: 'shield', offsetX: -50, offsetY: -50, width: 30, height: 18, health: 18,
              spriteKey: 'boss11_shield2' },
            { role: 'shield', offsetX: 50, offsetY: -50, width: 30, height: 18, health: 18,
              spriteKey: 'boss11_shield2' },
            { role: 'arm', offsetX: -75, offsetY: 40, width: 45, height: 65, health: 30,
              spriteKey: 'boss11_arm', bobAmplitude: 5, bobSpeed: 1.2 },
            { role: 'arm', offsetX: 75, offsetY: 40, width: 45, height: 65, health: 30,
              spriteKey: 'boss11_arm', bobAmplitude: 5, bobSpeed: 1.2 },
        ]
    },
    // Boss 12 (Level 60): Toxin Emperor — Toxic final guardian
    12: {
        name: 'Toxin Emperor',
        totalWidth: 250, totalHeight: 230,
        baseHP: 320,
        score: 12000,
        speed: 38,
        movePattern: 'erratic',
        color: '#88ee00',
        parts: [
            { role: 'core', offsetX: 0, offsetY: 0, width: 95, height: 95, health: 320,
              spriteKey: 'boss12_core', canShoot: true, shootRate: 1, shootPattern: 'radial', bulletCount: 18, bulletSpeed: 115 },
            { role: 'turret', offsetX: -90, offsetY: -35, width: 38, height: 38, health: 28,
              spriteKey: 'boss12_turret', canShoot: true, shootRate: 0.9, shootPattern: 'rapid', bulletSpeed: 200, bulletCount: 4 },
            { role: 'turret', offsetX: 90, offsetY: -35, width: 38, height: 38, health: 28,
              spriteKey: 'boss12_turret', canShoot: true, shootRate: 0.9, shootPattern: 'rapid', bulletSpeed: 200, bulletCount: 4 },
            { role: 'turret', offsetX: 0, offsetY: 0, width: 30, height: 30, health: 20,
              spriteKey: 'boss12_orb', orbitRadius: 95, orbitAngle: 0, orbitSpeed: 2.2,
              canShoot: true, shootRate: 1.3, shootPattern: 'aimed', bulletSpeed: 180 },
            { role: 'turret', offsetX: 0, offsetY: 0, width: 30, height: 30, health: 20,
              spriteKey: 'boss12_orb', orbitRadius: 95, orbitAngle: Math.PI / 2, orbitSpeed: 2.2,
              canShoot: true, shootRate: 1.3, shootPattern: 'aimed', bulletSpeed: 180 },
            { role: 'turret', offsetX: 0, offsetY: 0, width: 30, height: 30, health: 20,
              spriteKey: 'boss12_orb', orbitRadius: 95, orbitAngle: Math.PI, orbitSpeed: 2.2,
              canShoot: true, shootRate: 1.3, shootPattern: 'aimed', bulletSpeed: 180 },
            { role: 'turret', offsetX: 0, offsetY: 0, width: 30, height: 30, health: 20,
              spriteKey: 'boss12_orb', orbitRadius: 95, orbitAngle: Math.PI * 3 / 2, orbitSpeed: 2.2,
              canShoot: true, shootRate: 1.3, shootPattern: 'aimed', bulletSpeed: 180 },
            { role: 'shield', offsetX: 0, offsetY: -70, width: 130, height: 28, health: 35,
              spriteKey: 'boss12_shield', bobAmplitude: 3, bobSpeed: 1.5 },
            { role: 'weakpoint', offsetX: -40, offsetY: 55, width: 24, height: 24, health: 18,
              spriteKey: 'boss12_weak', score: 400 },
            { role: 'weakpoint', offsetX: 40, offsetY: 55, width: 24, height: 24, health: 18,
              spriteKey: 'boss12_weak', score: 400 },
            { role: 'arm', offsetX: -80, offsetY: 40, width: 48, height: 68, health: 32,
              spriteKey: 'boss12_arm', bobAmplitude: 6, bobSpeed: 1.2 },
            { role: 'arm', offsetX: 80, offsetY: 40, width: 48, height: 68, health: 32,
              spriteKey: 'boss12_arm', bobAmplitude: 6, bobSpeed: 1.2 },
        ]
    }
};

// ============================================================
//  MINI-BOSS DEFINITIONS — 4 unique mini-boss types
//  Smaller, fewer parts, no epic entrance. Cycle through levels.
// ============================================================

const MINIBOSS_DEFS = {
    // Mini-Boss 1: Scarab Drone — fast insectoid, rotating blades
    1: {
        name: 'Scarab Drone',
        totalWidth: 100, totalHeight: 90,
        baseHP: 18,
        score: 250,
        speed: 55,
        movePattern: 'zigzag',
        color: '#22bbaa',
        parts: [
            { role: 'core', offsetX: 0, offsetY: 0, width: 50, height: 50, health: 18,
              spriteKey: 'mboss1_core', canShoot: true, shootRate: 3, shootPattern: 'spread', bulletCount: 3, bulletSpeed: 120 },
            { role: 'arm', offsetX: -30, offsetY: 5, width: 20, height: 40, health: 8,
              spriteKey: 'mboss1_blade', rotationSpeed: 1.5 },
            { role: 'arm', offsetX: 30, offsetY: 5, width: 20, height: 40, health: 8,
              spriteKey: 'mboss1_blade', rotationSpeed: -1.5 },
        ]
    },
    // Mini-Boss 2: Garrison Turret — heavy, shielded bunker
    2: {
        name: 'Garrison Turret',
        totalWidth: 120, totalHeight: 100,
        baseHP: 25,
        score: 300,
        speed: 20,
        movePattern: 'slowSweep',
        color: '#cc8833',
        parts: [
            { role: 'core', offsetX: 0, offsetY: 0, width: 55, height: 55, health: 25,
              spriteKey: 'mboss2_core', canShoot: true, shootRate: 2.5, shootPattern: 'radial', bulletCount: 6, bulletSpeed: 100 },
            { role: 'shield', offsetX: 0, offsetY: -35, width: 60, height: 16, health: 12,
              spriteKey: 'mboss2_shield', bobAmplitude: 2, bobSpeed: 1.5 },
            { role: 'turret', offsetX: -38, offsetY: -10, width: 22, height: 22, health: 8,
              spriteKey: 'mboss2_turret', canShoot: true, shootRate: 2, shootPattern: 'aimed', bulletSpeed: 150 },
            { role: 'turret', offsetX: 38, offsetY: -10, width: 22, height: 22, health: 8,
              spriteKey: 'mboss2_turret', canShoot: true, shootRate: 2, shootPattern: 'aimed', bulletSpeed: 150 },
        ]
    },
    // Mini-Boss 3: Phantom Wraith — orbiting will-o-wisps, weaving
    3: {
        name: 'Phantom Wraith',
        totalWidth: 110, totalHeight: 100,
        baseHP: 20,
        score: 280,
        speed: 40,
        movePattern: 'weave',
        color: '#8833cc',
        parts: [
            { role: 'core', offsetX: 0, offsetY: 0, width: 50, height: 50, health: 20,
              spriteKey: 'mboss3_core', canShoot: true, shootRate: 2.8, shootPattern: 'spiral', bulletCount: 3, bulletSpeed: 110 },
            { role: 'turret', offsetX: 0, offsetY: 0, width: 18, height: 18, health: 7,
              spriteKey: 'mboss3_orb', orbitRadius: 42, orbitAngle: 0, orbitSpeed: 2,
              canShoot: true, shootRate: 3, shootPattern: 'aimed', bulletSpeed: 140 },
            { role: 'turret', offsetX: 0, offsetY: 0, width: 18, height: 18, health: 7,
              spriteKey: 'mboss3_orb', orbitRadius: 42, orbitAngle: Math.PI, orbitSpeed: 2,
              canShoot: true, shootRate: 3, shootPattern: 'aimed', bulletSpeed: 140 },
            { role: 'arm', offsetX: 0, offsetY: 30, width: 25, height: 35, health: 6,
              spriteKey: 'mboss3_tail', bobAmplitude: 4, bobSpeed: 2 },
        ]
    },
    // Mini-Boss 4: Inferno Striker — aggressive chaser, fast fire
    4: {
        name: 'Inferno Striker',
        totalWidth: 110, totalHeight: 90,
        baseHP: 22,
        score: 320,
        speed: 45,
        movePattern: 'chase',
        color: '#cc2233',
        parts: [
            { role: 'core', offsetX: 0, offsetY: 0, width: 50, height: 50, health: 22,
              spriteKey: 'mboss4_core', canShoot: true, shootRate: 2, shootPattern: 'rapid', bulletSpeed: 160, bulletCount: 2 },
            { role: 'arm', offsetX: -32, offsetY: 10, width: 22, height: 30, health: 8,
              spriteKey: 'mboss4_pod', canShoot: true, shootRate: 3.5, shootPattern: 'aimed', bulletSpeed: 130 },
            { role: 'arm', offsetX: 32, offsetY: 10, width: 22, height: 30, health: 8,
              spriteKey: 'mboss4_pod', canShoot: true, shootRate: 3.5, shootPattern: 'aimed', bulletSpeed: 130 },
        ]
    },

    // ═══════ WORLD 2 MINI-BOSSES ═══════

    // Mini-Boss 5: Vine Sentinel — Jungle guardian
    5: {
        name: 'Vine Sentinel',
        totalWidth: 110, totalHeight: 100,
        baseHP: 30,
        score: 400,
        speed: 40,
        movePattern: 'weave',
        color: '#33aa55',
        parts: [
            { role: 'core', offsetX: 0, offsetY: 0, width: 55, height: 55, health: 30,
              spriteKey: 'mboss5_core', canShoot: true, shootRate: 2.5, shootPattern: 'spread', bulletCount: 4, bulletSpeed: 130 },
            { role: 'arm', offsetX: -35, offsetY: 10, width: 22, height: 35, health: 10,
              spriteKey: 'mboss5_vine', rotationSpeed: 1, canShoot: true, shootRate: 3, shootPattern: 'aimed', bulletSpeed: 140 },
            { role: 'arm', offsetX: 35, offsetY: 10, width: 22, height: 35, health: 10,
              spriteKey: 'mboss5_vine', rotationSpeed: -1, canShoot: true, shootRate: 3, shootPattern: 'aimed', bulletSpeed: 140 },
        ]
    },
    // Mini-Boss 6: Magma Sprite — Volcanic fire mini
    6: {
        name: 'Magma Sprite',
        totalWidth: 100, totalHeight: 90,
        baseHP: 28,
        score: 380,
        speed: 50,
        movePattern: 'chase',
        color: '#ff6600',
        parts: [
            { role: 'core', offsetX: 0, offsetY: 0, width: 50, height: 50, health: 28,
              spriteKey: 'mboss6_core', canShoot: true, shootRate: 2, shootPattern: 'radial', bulletCount: 8, bulletSpeed: 120 },
            { role: 'turret', offsetX: 0, offsetY: 0, width: 20, height: 20, health: 8,
              spriteKey: 'mboss6_orb', orbitRadius: 38, orbitAngle: 0, orbitSpeed: 2.5,
              canShoot: true, shootRate: 3, shootPattern: 'aimed', bulletSpeed: 150 },
            { role: 'turret', offsetX: 0, offsetY: 0, width: 20, height: 20, health: 8,
              spriteKey: 'mboss6_orb', orbitRadius: 38, orbitAngle: Math.PI, orbitSpeed: 2.5,
              canShoot: true, shootRate: 3, shootPattern: 'aimed', bulletSpeed: 150 },
        ]
    },
    // Mini-Boss 7: Cryo Colossus — Ice frozen hulk
    7: {
        name: 'Cryo Colossus',
        totalWidth: 120, totalHeight: 110,
        baseHP: 35,
        score: 420,
        speed: 25,
        movePattern: 'slowSweep',
        color: '#55ccff',
        parts: [
            { role: 'core', offsetX: 0, offsetY: 0, width: 60, height: 60, health: 35,
              spriteKey: 'mboss7_core', canShoot: true, shootRate: 2.2, shootPattern: 'spiral', bulletCount: 5, bulletSpeed: 115 },
            { role: 'shield', offsetX: 0, offsetY: -38, width: 65, height: 18, health: 15,
              spriteKey: 'mboss7_shield', bobAmplitude: 2, bobSpeed: 1.5 },
            { role: 'turret', offsetX: -40, offsetY: -8, width: 24, height: 24, health: 10,
              spriteKey: 'mboss7_turret', canShoot: true, shootRate: 2.5, shootPattern: 'aimed', bulletSpeed: 155 },
            { role: 'turret', offsetX: 40, offsetY: -8, width: 24, height: 24, health: 10,
              spriteKey: 'mboss7_turret', canShoot: true, shootRate: 2.5, shootPattern: 'aimed', bulletSpeed: 155 },
        ]
    },
    // Mini-Boss 8: Rust Hulk — Mechanical scrap titan
    8: {
        name: 'Rust Hulk',
        totalWidth: 115, totalHeight: 100,
        baseHP: 32,
        score: 440,
        speed: 35,
        movePattern: 'zigzag',
        color: '#99775a',
        parts: [
            { role: 'core', offsetX: 0, offsetY: 0, width: 55, height: 55, health: 32,
              spriteKey: 'mboss8_core', canShoot: true, shootRate: 1.8, shootPattern: 'rapid', bulletSpeed: 170, bulletCount: 3 },
            { role: 'arm', offsetX: -35, offsetY: 8, width: 24, height: 32, health: 10,
              spriteKey: 'mboss8_claw', bobAmplitude: 3, bobSpeed: 2 },
            { role: 'arm', offsetX: 35, offsetY: 8, width: 24, height: 32, health: 10,
              spriteKey: 'mboss8_claw', bobAmplitude: 3, bobSpeed: 2 },
            { role: 'turret', offsetX: 0, offsetY: -30, width: 22, height: 22, health: 8,
              spriteKey: 'mboss8_turret', canShoot: true, shootRate: 2.5, shootPattern: 'spread', bulletCount: 3, bulletSpeed: 140 },
        ]
    }
};

/**
 * MultiBoss — Manages a multi-part boss entity.
 * The boss is destroyed when its core part(s) reach 0 HP.
 * Also used for mini-bosses (isMiniBoss=true) with simpler entrance.
 */
class MultiBoss {
    constructor(x, y, bossId, canvasWidth, isMiniBoss = false, difficultyConfig = null, level = 1) {
        const defs = isMiniBoss ? MINIBOSS_DEFS : BOSS_DEFS;
        const def = defs[bossId] || defs[1];
        this.bossId = bossId;
        this.def = def;
        this.name = def.name;
        this.canvasWidth = canvasWidth;
        this.score = def.score;
        this.isMiniBoss = isMiniBoss;
        this.difficultyConfig = difficultyConfig || {};

        // Difficulty multipliers
        const hpMult = this.difficultyConfig.bossHpMult || 1;
        const spdMult = this.difficultyConfig.bossSpeedMult || 1;

        // Level-based scaling for bosses/mini-bosses (world-relative)
        // HP: +5% per level, Speed: +1.5% per level
        const worldRelLevel = ((level - 1) % 30) + 1;
        const levelHpMult = 1 + (worldRelLevel - 1) * 0.05;
        const levelSpdMult = 1 + (worldRelLevel - 1) * (level > 30 ? 0.01 : 0.015);

        // Center position
        this.centerX = x + def.totalWidth / 2;
        this.centerY = y;
        this.width = def.totalWidth;
        this.height = def.totalHeight;
        this.position = { x: this.centerX - this.width / 2, y: this.centerY - this.height / 2 };
        this.active = true;
        this.targetY = isMiniBoss ? 100 : 120;

        // ── CINEMATIC ENTRANCE ──
        if (isMiniBoss) {
            // Mini-boss: simple slide-in, no warning phase
            this.entering = true;
            this.enterPhase = 1; // skip warning, start at descend
            this.enterTime = 2.0; // start at phase 1 time
            this.enterPartsSpread = 0;
        } else {
            // Phases: 0=warning(0-2s) 1=descend(2-3.5s) 2=deploy(3.5-4.5s) 3=active
            this.entering = true;
            this.enterPhase = 0;
            this.enterTime = 0;
            this.enterPartsSpread = 0;
        }

        // Movement
        this.speed = def.speed * spdMult * levelSpdMult;
        this.moveDir = 1;
        this.moveTimer = 0;

        // Total HP (all parts combined for health bar display)
        // Apply difficulty HP multiplier and level scaling to each part
        const frMult = this.difficultyConfig.enemyFireRateMult || 1;
        const bsMult = this.difficultyConfig.enemyBulletSpeedMult || 1;
        this.parts = def.parts.map(p => {
            const partCfg = { ...p };
            partCfg.health = Math.ceil(p.health * hpMult * levelHpMult);
            if (partCfg.shootRate) partCfg.shootRate = partCfg.shootRate * frMult;
            if (partCfg.bulletSpeed) partCfg.bulletSpeed = partCfg.bulletSpeed * bsMult;
            return new BossPart(partCfg);
        });
        this.maxHealth = this.parts.reduce((s, p) => s + p.maxHealth, 0);
        this.coreParts = this.parts.filter(p => p.isCore);

        // Phase tracking (enrage when HP low)
        this.enraged = false;
        this.dropChance = 1;

        // Initialize part positions so they don't flash at (0,0) on the first render frame
        this._updatePartPositions();
    }

    get health() {
        return this.parts.reduce((s, p) => p.active ? s + p.health : s, 0);
    }

    update(deltaTime, game) {
        const dt = deltaTime * (game.timeScale || 1);
        this.moveTimer += dt;

        // ── CINEMATIC ENTRY ──
        if (this.entering) {
            this.enterTime += dt;

            // Phase 0: WARNING (0-2s) — boss stays off-screen
            if (this.enterPhase === 0) {
                if (this.enterTime >= 2.0) {
                    this.enterPhase = 1;
                }
                this._updatePartPositions();
                // Sync position for Game.js
                this.position.x = this.centerX - this.width / 2;
                this.position.y = this.centerY - this.height / 2;
                return;
            }

            // Phase 1: DESCEND (2-3.5s) — slide in, parts clustered at center
            if (this.enterPhase === 1) {
                const slideProgress = Math.min(1, (this.enterTime - 2.0) / 1.5);
                // Ease-out cubic
                const eased = 1 - Math.pow(1 - slideProgress, 3);
                this.centerY = -200 + (this.targetY - (-200)) * eased;
                this.enterPartsSpread = 0; // parts collapsed at center

                if (slideProgress >= 1) {
                    this.enterPhase = 2;
                }
                this._updatePartPositions();
                this.position.x = this.centerX - this.width / 2;
                this.position.y = this.centerY - this.height / 2;
                return;
            }

            // Phase 2: DEPLOY (3.5-4.5s) — parts spread to final positions
            if (this.enterPhase === 2) {
                const deployProgress = Math.min(1, (this.enterTime - 3.5) / 1.0);
                // Elastic ease-out for satisfying snap
                const t = deployProgress;
                this.enterPartsSpread = t < 1
                    ? 1 - Math.pow(2, -10 * t) * Math.cos((t * 10 - 0.75) * (2 * Math.PI / 3))
                    : 1;

                if (deployProgress >= 1) {
                    this.enterPhase = 3;
                    this.entering = false;
                    this.enterPartsSpread = 1;
                }
                this._updatePartPositions();
                this.position.x = this.centerX - this.width / 2;
                this.position.y = this.centerY - this.height / 2;
                return;
            }
        }

        // Enrage check (below 30% HP → faster shooting)
        const hpRatio = this.health / this.maxHealth;
        if (!this.enraged && hpRatio < 0.3) {
            this.enraged = true;
            for (const part of this.parts) {
                if (part.canShoot) part.shootRate *= 0.6;
            }
        }

        // Movement pattern
        this._applyMovement(dt, game);

        // ── Clamp boss to screen ──
        const bossMargin = this.width * 0.4;
        this.centerX = Math.max(bossMargin, Math.min(this.canvasWidth - bossMargin, this.centerX));

        // Update part positions
        this._updatePartPositions();

        // Part shooting
        for (const part of this.parts) {
            if (!part.active || !part.canShoot) continue;
            part.shootTimer -= dt;
            if (part.shootTimer <= 0) {
                part.shoot(game, this.moveTimer);
                part.shootTimer = part.shootRate;
            }
        }

        // Sync position for Game.js compatibility
        this.position.x = this.centerX - this.width / 2;
        this.position.y = this.centerY - this.height / 2;
    }

    _applyMovement(dt, game) {
        switch (this.def.movePattern) {
            case 'sweep':
                this.centerX += this.moveDir * this.speed * dt;
                if (this.centerX < 80 || this.centerX > this.canvasWidth - 80) this.moveDir *= -1;
                break;
            case 'slowSweep':
                this.centerX += this.moveDir * this.speed * 0.7 * dt;
                if (this.centerX < 100 || this.centerX > this.canvasWidth - 100) this.moveDir *= -1;
                break;
            case 'weave':
                this.centerX += Math.sin(this.moveTimer * 0.8) * this.speed * 1.2 * dt;
                this.centerY = this.targetY + Math.sin(this.moveTimer * 0.5) * 25;
                break;
            case 'figure8':
                this.centerX = this.canvasWidth / 2 + Math.sin(this.moveTimer * 0.6) * 100;
                this.centerY = this.targetY + Math.sin(this.moveTimer * 1.2) * 30;
                break;
            case 'chase': {
                if (game.player && game.player.active) {
                    const px = game.player.position.x + game.player.width / 2;
                    const diff = px - this.centerX;
                    this.centerX += Math.sign(diff) * Math.min(Math.abs(diff), this.speed * dt);
                }
                this.centerY = this.targetY + Math.sin(this.moveTimer * 1.5) * 20;
                break;
            }
            case 'erratic':
                this.centerX += Math.sin(this.moveTimer * 1.2) * this.speed * dt;
                this.centerX += Math.cos(this.moveTimer * 0.7) * this.speed * 0.5 * dt;
                this.centerY = this.targetY + Math.sin(this.moveTimer * 0.9) * 35;
                // Clamp
                this.centerX = Math.max(100, Math.min(this.canvasWidth - 100, this.centerX));
                break;
            case 'zigzag':
                this.centerX += this.moveDir * this.speed * dt;
                this.centerY = this.targetY + Math.sin(this.moveTimer * 2.5) * 18;
                if (this.centerX < 60 || this.centerX > this.canvasWidth - 60) this.moveDir *= -1;
                break;
            default:
                this.centerX += this.moveDir * this.speed * dt;
                if (this.centerX < 80 || this.centerX > this.canvasWidth - 80) this.moveDir *= -1;
        }
    }

    _updatePartPositions() {
        const spread = this.enterPartsSpread;
        for (const part of this.parts) {
            if (part.active) {
                // During entrance, parts collapse toward center
                const origOX = part.offsetX;
                const origOY = part.offsetY;
                if (spread < 1) {
                    part.offsetX = origOX * spread;
                    part.offsetY = origOY * spread;
                }
                part.updatePosition(this.centerX, this.centerY, this.moveTimer);
                // Restore original offsets
                part.offsetX = origOX;
                part.offsetY = origOY;
            }
        }
    }

    /**
     * Deal damage to a specific part. Returns { partDestroyed, bossKilled, part }.
     */
    damagepart(partIndex, amount, game) {
        const part = this.parts[partIndex];
        if (!part || !part.active) return { partDestroyed: false, bossKilled: false, part: null };

        const destroyed = part.takeDamage(amount);

        if (destroyed) {
            // Part destruction explosion
            game.particles.emit(
                part.worldX + part.width / 2,
                part.worldY + part.height / 2,
                'explosion', 12
            );
        }

        // Check if all cores destroyed
        const coreAlive = this.coreParts.some(c => c.active);
        if (!coreAlive) {
            this.active = false;
            return { partDestroyed: destroyed, bossKilled: true, part };
        }

        return { partDestroyed: destroyed, bossKilled: false, part };
    }

    /**
     * Legacy takeDamage — finds the best target part and damages it.
     * Priority: shields → turrets → arms → core
     */
    takeDamage(amount, game) {
        // Find first active target by priority
        const priorities = ['shield', 'turret', 'arm', 'weakpoint', 'core'];
        for (const role of priorities) {
            const candidates = this.parts.filter(p => p.active && p.role === role);
            if (candidates.length > 0) {
                const target = candidates[Math.floor(Math.random() * candidates.length)];
                const idx = this.parts.indexOf(target);
                const result = this.damagepart(idx, amount, game);
                if (result.bossKilled) return true;
                return false;
            }
        }
        return false;
    }

    /**
     * Find which part a bullet at (bx, by) hits. Returns part index or -1.
     */
    getHitPart(bx, by) {
        // Check non-core parts first (so shields/turrets absorb hits)
        for (let i = 0; i < this.parts.length; i++) {
            const p = this.parts[i];
            if (!p.active || p.isCore) continue;
            if (p.containsPoint(bx, by)) return i;
        }
        // Then core
        for (let i = 0; i < this.parts.length; i++) {
            const p = this.parts[i];
            if (!p.active || !p.isCore) continue;
            if (p.containsPoint(bx, by)) return i;
        }
        return -1;
    }

    /**
     * Circle collision with another entity — checks all active parts.
     */
    collidesWithCircle(other) {
        const otherCX = other.position.x + other.width / 2;
        const otherCY = other.position.y + other.height / 2;
        const otherR = Math.min(other.width, other.height) / 2;
        for (const part of this.parts) {
            if (!part.active) continue;
            if (part.collidesCircle(otherCX, otherCY, otherR)) return true;
        }
        return false;
    }

    render(ctx, assets) {
        if (!this.active && this.health > 0) return;
        // Don't render during warning phase
        if (this.enterPhase === 0) return;

        ctx.save();

        // ── ENTRANCE EFFECTS ──
        if (this.entering) {
            // Intense pulsing aura during descent/deploy
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const pulse = 0.5 + 0.5 * Math.sin(this.enterTime * 8);
            const auraSize = this.width * (0.6 + this.enterPartsSpread * 0.4);
            ctx.globalAlpha = (0.12 + pulse * 0.08) * (this.enterPhase === 2 ? 1.5 : 1);
            const entryAura = ctx.createRadialGradient(
                this.centerX, this.centerY, 10,
                this.centerX, this.centerY, auraSize
            );
            entryAura.addColorStop(0, '#ffffff');
            entryAura.addColorStop(0.3, this.def.color);
            entryAura.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = entryAura;
            ctx.beginPath();
            ctx.arc(this.centerX, this.centerY, auraSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Energy lines converging to boss during deploy
            if (this.enterPhase === 2) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = 0.3 * (1 - this.enterPartsSpread);
                ctx.strokeStyle = this.def.color;
                ctx.lineWidth = 2;
                for (let i = 0; i < 8; i++) {
                    const angle = (Math.PI * 2 / 8) * i + this.enterTime * 2;
                    const r1 = 150;
                    const r2 = 20;
                    ctx.beginPath();
                    ctx.moveTo(this.centerX + Math.cos(angle) * r1,
                               this.centerY + Math.sin(angle) * r1);
                    ctx.lineTo(this.centerX + Math.cos(angle) * r2,
                               this.centerY + Math.sin(angle) * r2);
                    ctx.stroke();
                }
                ctx.restore();
            }
        }

        // Menacing aura (normal)
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.06 + 0.03 * Math.sin(this.moveTimer * 3);
        const auraGrad = ctx.createRadialGradient(this.centerX, this.centerY, 20, this.centerX, this.centerY, this.width * 0.5);
        auraGrad.addColorStop(0, this.def.color);
        auraGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.width * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Render parts: arms first, then shields, then turrets, then core on top
        const order = ['arm', 'shield', 'turret', 'weakpoint', 'core'];
        for (const role of order) {
            for (const part of this.parts) {
                if (part.role === role) part.render(ctx, assets);
            }
        }

        // Connection lines between core and active orbiting turrets
        const core = this.coreParts[0];
        if (core && core.active) {
            ctx.save();
            ctx.globalAlpha = 0.15;
            ctx.strokeStyle = this.def.color;
            ctx.lineWidth = 1;
            for (const part of this.parts) {
                if (!part.active || part.isCore || part.orbitRadius <= 0) continue;
                ctx.beginPath();
                ctx.moveTo(this.centerX, this.centerY);
                ctx.lineTo(part.worldX + part.width / 2, part.worldY + part.height / 2);
                ctx.stroke();
            }
            ctx.restore();
        }

        // Health bar
        const barW = (this.isMiniBoss ? this.width + 10 : this.width + 30);
        const barH = this.isMiniBoss ? 7 : 10;
        const barX = this.centerX - barW / 2;
        const barY = this.centerY - this.height / 2 - (this.isMiniBoss ? 18 : 24);
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, barH, 4);
        ctx.fill();
        const hpRatio = this.health / this.maxHealth;
        const barColor = hpRatio > 0.5 ? '#44ff44' : hpRatio > 0.25 ? '#ffaa00' : '#ff4444';
        if (hpRatio > 0) {
            const hpGrad = ctx.createLinearGradient(barX, barY, barX + barW * hpRatio, barY);
            hpGrad.addColorStop(0, barColor);
            hpGrad.addColorStop(1, '#ffffff66');
            ctx.fillStyle = hpGrad;
            ctx.beginPath();
            ctx.roundRect(barX + 1, barY + 1, (barW - 2) * hpRatio, barH - 2, 3);
            ctx.fill();
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, barH, 4);
        ctx.stroke();

        // Part count indicators
        const activeParts = this.parts.filter(p => p.active && !p.isCore).length;
        const totalParts = this.parts.filter(p => !p.isCore).length;

        // Boss / mini-boss label
        const labelPrefix = this.isMiniBoss ? '★ ' : '';
        ctx.fillStyle = this.enraged ? '#ff4444' : (this.isMiniBoss ? 'rgba(255,220,100,0.7)' : 'rgba(255,255,255,0.6)');
        ctx.font = this.isMiniBoss ? mono(9) : mono(10);
        ctx.textAlign = 'center';
        ctx.fillText(`${labelPrefix}${this.name.toUpperCase()} [${activeParts}/${totalParts}]`, this.centerX, barY - 4);

        // Enrage indicator
        if (this.enraged) {
            ctx.font = mono(9);
            ctx.fillStyle = '#ff2222';
            ctx.fillText('⚠ ENRAGED', this.centerX, barY - 14);
        }

        ctx.restore();
    }

    /** For compatibility with old Boss collision API */
    destroy() {
        this.active = false;
    }
}

// ============================================================
//  LEGACY BOSS (kept for reference, but MultiBoss is now used)
// ============================================================

// The old Boss class is replaced by MultiBoss above.
// EnemyFactory.createBoss now creates MultiBoss instances.

/**
 * EnemyFactory - Creates enemies and bosses
 */
class EnemyFactory {
    static create(type, x, y, pattern, canvasWidth, speedMultiplier = 1, difficultyConfig = null, level = 1) {
        const enemy = new Enemy(x, y, type, pattern, canvasWidth, difficultyConfig, level);
        enemy.speed *= speedMultiplier;
        return enemy;
    }

    /**
     * Create a multi-part boss.
     * bossLevel: 1-6 (mapped from LevelData boss field)
     */
    static createBoss(x, y, bossLevel, canvasWidth, difficultyConfig = null, level = 1) {
        const bossId = Math.min(bossLevel, Object.keys(BOSS_DEFS).length);
        return new MultiBoss(x, y, bossId, canvasWidth, false, difficultyConfig, level);
    }

    /**
     * Create a multi-part mini-boss.
     * miniBossType: 1-8 (1-4 = W1, 5-8 = W2)
     */
    static createMiniBoss(x, y, miniBossType, canvasWidth, difficultyConfig = null, level = 1) {
        const maxType = Object.keys(MINIBOSS_DEFS).length;
        const typeId = ((miniBossType - 1) % maxType) + 1;
        return new MultiBoss(x, y, typeId, canvasWidth, true, difficultyConfig, level);
    }

    /**
     * Spawn a wave with optional formation arrangement.
     * formation: string key into FORMATIONS
     */
    static spawnFormationWave(wave, canvasWidth, speedMult, difficultyConfig = null, level = 1) {
        let enemies = [...wave.enemies];
        const formation = wave.formation || 'none';
        if (FORMATIONS[formation]) {
            enemies = FORMATIONS[formation](enemies, canvasWidth);
        }
        const result = [];
        for (const def of enemies) {
            const x = def.x * canvasWidth;
            const y = -80 - Math.random() * 40;
            const enemy = EnemyFactory.create(
                def.type, x, y, def.pattern,
                canvasWidth, speedMult, difficultyConfig, level
            );
            result.push(enemy);
        }
        return result;
    }
}

export { Enemy, MultiBoss, BossPart, EnemyFactory, ENEMY_TYPES, MOVEMENT, FORMATIONS, BOSS_DEFS, MINIBOSS_DEFS };
export default Enemy;
