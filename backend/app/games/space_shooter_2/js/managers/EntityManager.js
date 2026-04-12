import Bullet from '../entities/Bullet.js';
import Explosion from '../entities/Explosion.js';
import { MultiBoss } from '../entities/Enemy.js';

class EntityManager {
    constructor(game) {
        this.game = game;
        this.player = null;
        this.enemies = [];
        this.bullets = [];
        this.explosions = [];
        this.powerUps = [];
        this.homingMissiles = [];
        this.boss = null;
        this.bossActive = false;
        this.miniBoss = null;
        this.miniBossActive = false;
    }

    spawnBullet(x, y, vx, vy, owner, damage = 1) {
        // Cap total bullets to prevent lag during intense boss fights
        if (this.bullets.length >= 200) return;

        // Quantum Boost: double damage for player bullets while in boost zone
        const qBoosted = owner === 'player' && this.game.entityManager.player?._quantumBoosted;
        if (qBoosted) damage *= 2;

        const bullet = new Bullet(x, y, vx, vy, owner, damage);
        if (qBoosted) bullet._quantumBoosted = true;

        // Virus Inject: player bullets can infect enemies on hit
        if (owner === 'player' && this.game.perkSystem) {
            const infectChance = this.game.perkSystem.getVirusInfectChance();
            if (infectChance > 0) {
                bullet._virusChance = infectChance;
                bullet._virusDuration = this.game.perkSystem.getVirusInfectDuration();
            }
        }

        this.bullets.push(bullet);
    }

    spawnHomingMissile(x, y, angle) {
        this.homingMissiles.push({
            x, y,
            vx: Math.cos(angle) * 100,
            vy: Math.sin(angle) * 100,
            speed: 350,
            life: 3,
            active: true,
            target: null,
            damage: 3,
            trail: []
        });
    }

    updateHomingMissiles(dt) {
        const g = this.game;
        for (const m of this.homingMissiles) {
            if (!m.active) continue;

            m.life -= dt;
            if (m.life <= 0) {
                m.active = false;
                continue;
            }

            this.updateMissileTarget(m);
            this.updateMissilePosition(m, dt);
            this.checkMissileCollisions(m, g);
            this.checkMissileOutOfBounds(m, g);
        }

        this.homingMissiles = this.homingMissiles.filter(m => m.active);
    }

    updateMissileTarget(m) {
        let closest = null;
        let closestDist = Infinity;

        for (const enemy of this.enemies) {
            if (!enemy.active || enemy._isAlly) continue;
            const dist = this.getDistance(enemy.position.x + enemy.width / 2, enemy.position.y + enemy.height / 2, m.x, m.y);
            if (dist < closestDist) {
                closestDist = dist;
                closest = enemy;
            }
        }

        this.checkBossAsTarget(this.boss, m, closestDist);
        this.checkBossAsTarget(this.miniBoss, m, closestDist);

        if (closest) {
            this.steerTowards(m, closest);
        }
    }

    checkBossAsTarget(boss, m, currentClosestDist) {
        if (!boss?.active || boss.entering) return;

        const dx = boss.position.x + boss.width / 2 - m.x;
        const dy = boss.position.y + boss.height / 2 - m.y;
        const dist = Math.hypot(dx, dy);

        if (dist < currentClosestDist) {
            this.steerTowards(m, boss);
        }
    }

    steerTowards(m, target) {
        const dx = target.position.x + target.width / 2 - m.x;
        const dy = target.position.y + target.height / 2 - m.y;
        const angle = Math.atan2(dy, dx);

        m.vx += Math.cos(angle) * m.speed * 3 * (1 / 60);
        m.vy += Math.sin(angle) * m.speed * 3 * (1 / 60);

        const spd = Math.hypot(m.vx, m.vy);
        if (spd > m.speed) {
            m.vx = (m.vx / spd) * m.speed;
            m.vy = (m.vy / spd) * m.speed;
        }
    }

    updateMissilePosition(m, dt) {
        m.trail.push(m.x, m.y);
        while (m.trail.length > 16) {
            m.trail.shift();
            m.trail.shift();
        }

        m.x += m.vx * dt;
        m.y += m.vy * dt;
    }

    checkMissileCollisions(m, g) {
        this.checkEnemyCollisions(m, g);
        this.checkBossCollisions(m, g);
        this.checkMiniBossCollisions(m, g);
    }

    checkEnemyCollisions(m, g) {
        for (const enemy of this.enemies) {
            if (!enemy.active || enemy._isAlly) continue;
            if (this.isInsideRect(m.x, m.y, enemy.position.x, enemy.position.y, enemy.width, enemy.height)) {
                enemy.takeDamage(m.damage, g);
                m.active = false;
                this.createMissileExplosion(m, g);
                break;
            }
        }
    }

    checkBossCollisions(m, g) {
        if (!this.boss?.active || this.boss.entering || !m.active) return;

        let missileHit = false;
        if (this.boss instanceof MultiBoss) {
            const hitIdx = this.boss.getHitPart(m.x, m.y);
            if (hitIdx >= 0) {
                this.boss.damagepart(hitIdx, m.damage, g);
                missileHit = true;
            }
        } else if (this.isInsideRect(m.x, m.y, this.boss.position.x, this.boss.position.y, this.boss.width, this.boss.height)) {
            this.boss.takeDamage(m.damage, g);
            missileHit = true;
        }

        if (missileHit) {
            m.active = false;
            this.createMissileExplosion(m, g);
        }
    }

    checkMiniBossCollisions(m, g) {
        if (!this.miniBoss?.active || this.miniBoss.entering || !m.active) return;

        const hitIdx = this.miniBoss.getHitPart(m.x, m.y);
        if (hitIdx >= 0) {
            this.miniBoss.damagepart(hitIdx, m.damage, g);
            m.active = false;
            this.createMissileExplosion(m, g);
        }
    }

    checkMissileOutOfBounds(m, g) {
        const margin = 50;
        if (m.x < -margin || m.x > g.logicalWidth + margin || m.y < -margin || m.y > g.logicalHeight + margin) {
            m.active = false;
        }
    }

    isInsideRect(x, y, rectX, rectY, width, height) {
        return x > rectX && x < rectX + width && y > rectY && y < rectY + height;
    }

    getDistance(x1, y1, x2, y2) {
        const dx = x1 - x2;
        const dy = y1 - y2;
        return Math.hypot(dx, dy);
    }

    createMissileExplosion(m, g) {
        this.explosions.push(new Explosion(m.x, m.y, 0.5));
        g.particles.emit(m.x, m.y, 'explosion', 8);
    }

    cleanup() {
        this.enemies = this.enemies.filter(e => e.active);
        this.bullets = this.bullets.filter(b => b.active);
        this.explosions = this.explosions.filter(e => e.active);
        this.powerUps = this.powerUps.filter(p => p.active);
    }

    clearAll() {
        this.enemies = [];
        this.bullets = [];
        this.explosions = [];
        this.powerUps = [];
        this.homingMissiles = [];
        this.boss = null;
        this.bossActive = false;
        this.miniBoss = null;
        this.miniBossActive = false;
        this.player = null;
    }

    renderHomingMissiles(ctx) {
        for (const m of this.homingMissiles) {
            if (!m.active) continue;
            ctx.save();

            // Trail particles (orange fading circles like space_shooter)
            if (m.trail.length >= 4) {
                const trailLen = m.trail.length / 2;
                for (let i = 0; i < m.trail.length; i += 2) {
                    const progress = (i / 2) / trailLen; // 0 = oldest, 1 = newest
                    const alpha = progress * 0.6;
                    ctx.fillStyle = `rgba(255, 150, 50, ${alpha})`;
                    ctx.beginPath();
                    ctx.arc(m.trail[i], m.trail[i + 1], 4 * progress, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Missile body — rotated to face movement direction
            const angle = Math.atan2(m.vy, m.vx);
            const w = 12;
            const h = 20;
            ctx.translate(m.x, m.y);
            ctx.rotate(angle + Math.PI / 2); // nose points along velocity

            ctx.globalAlpha = 1;

            // Missile body (metallic gray like space_shooter)
            ctx.fillStyle = '#8a8a8a';
            ctx.beginPath();
            ctx.moveTo(0, -h / 2);           // nose tip
            ctx.lineTo(-w / 3, h / 3);
            ctx.lineTo(w / 3, h / 3);
            ctx.closePath();
            ctx.fill();

            // Nose cone (red)
            ctx.fillStyle = '#ff4444';
            ctx.beginPath();
            ctx.moveTo(0, -h / 2);
            ctx.lineTo(-w / 4, -h / 4);
            ctx.lineTo(w / 4, -h / 4);
            ctx.closePath();
            ctx.fill();

            // Fins (dark gray)
            ctx.fillStyle = '#666666';
            ctx.fillRect(-w / 2, h / 4, w / 4, h / 4);
            ctx.fillRect(w / 4, h / 4, w / 4, h / 4);

            // Exhaust flame with gradient
            const flicker = Math.random() * 0.3 + 0.7;
            const flameGrad = ctx.createLinearGradient(0, h / 3, 0, h / 2 + 10);
            flameGrad.addColorStop(0, `rgba(255, 200, 50, ${flicker})`);
            flameGrad.addColorStop(0.5, `rgba(255, 100, 0, ${flicker * 0.7})`);
            flameGrad.addColorStop(1, 'rgba(255, 50, 0, 0)');

            ctx.fillStyle = flameGrad;
            ctx.beginPath();
            ctx.moveTo(-w / 4, h / 3);
            ctx.lineTo(0, h / 2 + 8 + Math.random() * 5);
            ctx.lineTo(w / 4, h / 3);
            ctx.closePath();
            ctx.fill();

            // Glow (high perf only)
            if (this.game.performanceMode === 'high') {
                ctx.globalAlpha = 0.3;
                ctx.shadowColor = '#ff6644';
                ctx.shadowBlur = 8;
                ctx.fillStyle = '#ff4422';
                ctx.beginPath();
                ctx.arc(0, 0, 4, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    }
}

export default EntityManager;
