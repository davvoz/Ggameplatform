import { C_MEDIUM_BLUE, C_WHITE } from '../LevelsThemes.js';

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
        this._baseShootRate = this.shootRate;
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
                if (!game.player?.active) return;
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
                if (!game.player?.active) return;
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
        // W3 Boss: Corrupted Compiler syntax shield — core is immune
        if (this._shielded) return false;
        // W3 Boss: Data Devourer absorb — bullets heal instead
        if (this._absorbing) {
            this.health = Math.min(this.maxHealth, this.health + amount);
            this.hitFlash = 0.5;
            return false;
        }
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
        return Math.hypot(dx, dy) < r + otherR;
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
            const notATurretValue =  this.role === 'shield' ? C_MEDIUM_BLUE : '#cc6633';
            const notCoreValue = this.role === 'turret' ? '#ffaa33' : notATurretValue;
            ctx.fillStyle = this.isCore ? '#ff2244' : notCoreValue;
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
            ctx.fillStyle = C_WHITE;
            ctx.beginPath();
            ctx.arc(cx, cy, this.width / 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

export default BossPart;