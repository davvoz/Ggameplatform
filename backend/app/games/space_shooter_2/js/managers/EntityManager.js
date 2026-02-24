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
        // Cap total bullets to prevent lag during intense boss fights
        if (this.bullets.length >= 200) return;
        const bullet = new Bullet(x, y, vx, vy, owner, damage);
        // World 2 bouncing bullets power-up
        if (owner === 'player' && this.player && this.player.bouncingBullets) {
            bullet.maxBounces = 2;
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

            // Flat trail: [x0,y0, x1,y1, ...] — max 8 points (16 floats)
            m.trail.push(m.x, m.y);
            while (m.trail.length > 16) {
                m.trail.shift();
                m.trail.shift();
            }

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
