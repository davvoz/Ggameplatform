import Bullet from '../entities/Bullet.js';
import Explosion from '../entities/Explosion.js';
import PowerUp from '../entities/PowerUp.js';
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
        const bullet = new Bullet(x, y, vx, vy, owner, damage);
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
            if (m.life <= 0) { m.active = false; continue; }

            let closest = null;
            let closestDist = Infinity;
            for (const enemy of this.enemies) {
                if (!enemy.active) continue;
                const dx = enemy.position.x + enemy.width / 2 - m.x;
                const dy = enemy.position.y + enemy.height / 2 - m.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < closestDist) { closestDist = dist; closest = enemy; }
            }
            if (this.boss && this.boss.active && !this.boss.entering) {
                const dx = this.boss.position.x + this.boss.width / 2 - m.x;
                const dy = this.boss.position.y + this.boss.height / 2 - m.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < closestDist) { closestDist = dist; closest = this.boss; }
            }
            if (this.miniBoss && this.miniBoss.active && !this.miniBoss.entering) {
                const dx = this.miniBoss.position.x + this.miniBoss.width / 2 - m.x;
                const dy = this.miniBoss.position.y + this.miniBoss.height / 2 - m.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < closestDist) { closestDist = dist; closest = this.miniBoss; }
            }

            if (closest) {
                const dx = closest.position.x + closest.width / 2 - m.x;
                const dy = closest.position.y + closest.height / 2 - m.y;
                const angle = Math.atan2(dy, dx);
                m.vx += Math.cos(angle) * m.speed * 3 * dt;
                m.vy += Math.sin(angle) * m.speed * 3 * dt;
                const spd = Math.sqrt(m.vx * m.vx + m.vy * m.vy);
                if (spd > m.speed) {
                    m.vx = m.vx / spd * m.speed;
                    m.vy = m.vy / spd * m.speed;
                }
            }

            m.trail.push({ x: m.x, y: m.y });
            if (m.trail.length > 8) m.trail.shift();

            m.x += m.vx * dt;
            m.y += m.vy * dt;

            for (const enemy of this.enemies) {
                if (!enemy.active) continue;
                if (m.x > enemy.position.x && m.x < enemy.position.x + enemy.width &&
                    m.y > enemy.position.y && m.y < enemy.position.y + enemy.height) {
                    const killed = enemy.takeDamage(m.damage, g);
                    if (killed) g.waveManager.onEnemyKilled(enemy);
                    m.active = false;
                    this.explosions.push(new Explosion(m.x, m.y, 0.5));
                    g.particles.emit(m.x, m.y, 'explosion', 8);
                    break;
                }
            }
            if (this.boss && this.boss.active && !this.boss.entering && m.active) {
                let missileHit = false;
                if (this.boss instanceof MultiBoss) {
                    const hitIdx = this.boss.getHitPart(m.x, m.y);
                    if (hitIdx >= 0) {
                        const res = this.boss.damagepart(hitIdx, m.damage, g);
                        if (res.bossKilled) g.waveManager.onBossKilled();
                        missileHit = true;
                    }
                } else if (m.x > this.boss.position.x && m.x < this.boss.position.x + this.boss.width &&
                           m.y > this.boss.position.y && m.y < this.boss.position.y + this.boss.height) {
                    const killed = this.boss.takeDamage(m.damage, g);
                    if (killed) g.waveManager.onBossKilled();
                    missileHit = true;
                }
                if (missileHit) {
                    m.active = false;
                    this.explosions.push(new Explosion(m.x, m.y, 0.5));
                    g.particles.emit(m.x, m.y, 'explosion', 8);
                }
            }
            if (this.miniBoss && this.miniBoss.active && !this.miniBoss.entering && m.active) {
                const hitIdx = this.miniBoss.getHitPart(m.x, m.y);
                if (hitIdx >= 0) {
                    this.miniBoss.damagepart(hitIdx, m.damage, g);
                    m.active = false;
                    this.explosions.push(new Explosion(m.x, m.y, 0.5));
                    g.particles.emit(m.x, m.y, 'explosion', 8);
                }
            }

            if (m.x < -50 || m.x > g.logicalWidth + 50 || m.y < -50 || m.y > g.logicalHeight + 50) {
                m.active = false;
            }
        }
        this.homingMissiles = this.homingMissiles.filter(m => m.active);
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
            for (let i = 0; i < m.trail.length - 1; i++) {
                const t = i / m.trail.length;
                ctx.globalAlpha = t * 0.5;
                ctx.strokeStyle = '#ff6644';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(m.trail[i].x, m.trail[i].y);
                ctx.lineTo(m.trail[i + 1].x, m.trail[i + 1].y);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#ff4422';
            ctx.shadowColor = '#ff6644';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(m.x, m.y, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}

export default EntityManager;
