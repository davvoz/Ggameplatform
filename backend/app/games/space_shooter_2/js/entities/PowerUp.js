import { C_WHITE } from './LevelsThemes.js';
import GameObject from '../../../shared/GameObject.js';

/**
 * PowerUp - Collectible items dropped by enemies
 *
 * Performance modes:
 *   HIGH   → shadowBlur glow ring + radial gradient body + highlight crescent
 *            + icon + rotating sparkle particles
 *   MEDIUM → no shadowBlur glow ring, radial gradient body + icon (no sparkles)
 *   LOW    → flat filled circle + simple icon (no gradients, no glow, no sparkles)
 */

// Shared performance state
let _perfMode = 'high';

const POWERUP_TYPES = {
    health: { icon: '❤️', color: { r: 255, g: 80, b: 80 }, label: '+HP' },
    shield: { icon: '🛡️', color: { r: 100, g: 200, b: 255 }, label: 'Shield' },
    weapon: { icon: '⚡', color: { r: 255, g: 200, b: 50 }, label: 'Multi-Shot' },
    speed: { icon: '💨', color: { r: 100, g: 255, b: 150 }, label: 'Speed' },
    rapid: { icon: '🔥', color: { r: 255, g: 150, b: 50 }, label: 'Rapid' },
    points: { icon: '⭐', color: { r: 255, g: 215, b: 0 }, label: 'Points' },
    ultimate: { icon: '💎', color: { r: 180, g: 100, b: 255 }, label: 'ULT+' },
    // ─── World 2 Power-ups ───
    drone_companion: { icon: '🤖', color: { r: 100, g: 220, b: 255 }, label: 'Drone' },
    bullet_time: { icon: '⏱️', color: { r: 200, g: 180, b: 255 }, label: 'Slowdown' },
    // ─── World 3 Power-ups ───
    glitch_clone: { icon: '👥', color: { r: 0, g: 220, b: 200 }, label: 'Clones' },
    data_drain: { icon: '🌀', color: { r: 120, g: 50, b: 240 }, label: 'Drain' }
};

class PowerUp extends GameObject {
    constructor(x, y, type = 'health') {
        super(x, y, 34, 34);
        this.type = type;
        this.tag = 'powerup';
        this.floatPhase = Math.random() * Math.PI * 2;
        this.floatSpeed = 3;
        this.fallSpeed = 60;
        this.lifeTime = 8;
        this.lifeTimer = 0;
        this.config = POWERUP_TYPES[type] || POWERUP_TYPES.health;
        this.pulsePhase = 0;
        this.magnetRange = 80;
    }

    static setPerformanceMode(mode) {
        _perfMode = mode;
    }

    update(deltaTime, game) {
        this.lifeTimer += deltaTime;
        this.floatPhase += this.floatSpeed * deltaTime;
        this.pulsePhase += deltaTime * 4;

        // Fall down slowly
        this.position.y += this.fallSpeed * deltaTime;
        // Slight horizontal sway
        this.position.x += Math.sin(this.floatPhase) * 15 * deltaTime;

        // Magnet to player if close
        if (game.player?.active) {
            const center = this.getCenter();
            const playerCenter = game.player.getCenter();
            const dist = center.distance(playerCenter);
            if (dist < this.magnetRange) {
                const dir = playerCenter.subtract(center).normalize();
                this.position.x += dir.x * 200 * deltaTime;
                this.position.y += dir.y * 200 * deltaTime;
            }
        }

        // Expire
        if (this.lifeTimer > this.lifeTime || this.position.y > game.logicalHeight + 30) {
            this.destroy();
        }
    }

    render(ctx) {
        const pulse = 1 + Math.sin(this.pulsePhase) * 0.12;
        const blinkAlpha = this.lifeTimer > this.lifeTime - 2
            ? 0.5 + 0.5 * Math.sin(this.lifeTimer * 10) : 1;

        ctx.save();
        ctx.globalAlpha = blinkAlpha;

        const cx = this.position.x + this.width / 2;
        const cy = this.position.y + this.height / 2;
        const r = (this.width / 2) * pulse;
        const col = this.config.color;
        const colStr = `rgb(${col.r},${col.g},${col.b})`;

        const isHigh = _perfMode === 'high';
        const isLow = _perfMode === 'low';

        // ─── LOW MODE: flat circle + icon, no effects ───
        if (isLow) {
            // Simple flat filled circle
            ctx.fillStyle = colStr;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
            // Thin outline
            ctx.strokeStyle = '#111';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Icon only
            ctx.shadowBlur = 0;
            this.drawPowerUpIcon(ctx, cx, cy, r * 0.5);

            ctx.restore();
            return;
        }

        // ─── MEDIUM / HIGH MODE ───

        // Outer glow ring (HIGH only — uses shadowBlur)
        if (isHigh) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.2 * blinkAlpha;
            ctx.strokeStyle = colStr;
            ctx.shadowColor = colStr;
            ctx.shadowBlur = 18;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Background filled circle with cartoon outline
        const bodyGrad = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.3, 0, cx, cy, r);
        bodyGrad.addColorStop(0, C_WHITE);
        bodyGrad.addColorStop(0.3, `rgba(${col.r},${col.g},${col.b},1)`);
        bodyGrad.addColorStop(0.9, `rgba(${Math.floor(col.r * 0.5)},${Math.floor(col.g * 0.5)},${Math.floor(col.b * 0.5)},1)`);
        bodyGrad.addColorStop(1, `rgba(${Math.floor(col.r * 0.3)},${Math.floor(col.g * 0.3)},${Math.floor(col.b * 0.3)},1)`);
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        // Thick outline
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Highlight crescent (HIGH only)
        if (isHigh) {
            ctx.save();
            ctx.globalAlpha = 0.35;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.ellipse(cx - r * 0.2, cy - r * 0.25, r * 0.45, r * 0.25, -0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Draw proper icon shapes instead of emoji
        ctx.shadowBlur = 0;
        this.drawPowerUpIcon(ctx, cx, cy, r * 0.5);

        // Rotating sparkle particles around the orb (HIGH only)
        if (isHigh) {
            const sparkCount = 3;
            const sparkAngleBase = Date.now() * 0.003;
            ctx.globalAlpha = 0.5 * blinkAlpha;
            ctx.fillStyle = '#fff';
            for (let i = 0; i < sparkCount; i++) {
                const sa = sparkAngleBase + i * Math.PI * 2 / sparkCount;
                const sx = cx + Math.cos(sa) * (r + 4);
                const sy = cy + Math.sin(sa) * (r + 4);
                ctx.beginPath();
                ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }

    drawPowerUpIcon(ctx, cx, cy, size) {
        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;

        switch (this.type) {
            case 'health': {
                // Plus/cross shape
                this.drawHealthIcon(size, ctx, cx, cy);
                break;
            }
            case 'shield': {
                // Shield shape
                this.drawShieldIcon(size, ctx, cx, cy);
                break;
            }
            case 'weapon': {
                // Lightning bolt
                this.drawLightningBolt(size, ctx, cx, cy);
                break;
            }
            case 'speed': {
                // Forward arrows
                this.drawForwardArrows(size, ctx, cx, cy);
                break;
            }
            case 'rapid': {
                // Triple vertical bars
                this.drawTripleBars(size, ctx, cx, cy);
                break;
            }
            case 'points': {
                // Star
                const s = size * 0.8;
                this.drawStarShape(ctx, cx, s, cy);
                break;
            }
            case 'ultimate': {
                // Diamond
                this.drawDiamondIcon(size, ctx, cx, cy);
                break;
            }
            // ─── World 2 Power-up Icons ───
            case 'drone_companion': {
                // Small satellite/drone shape
                this.drawDroneShape(size, ctx, cx, cy);
                break;
            }
            case 'bullet_time': {
                // Clock/stopwatch shape
                this.drawClockIcon(size, ctx, cx, cy);
                break;
            }
            // ─── World 3 Power-up Icons ───
            case 'glitch_clone': {
                // Two overlapping silhouette shapes (clone pair)
                this.drawCloneShape(size, ctx, cx, cy);
                break;
            }
            case 'data_drain': {
                // Spiral vortex/drain icon
                this.drawSpiralVortex(size, ctx, cx, cy);
                break;
            }

        }
        ctx.restore();
    }

    drawHealthIcon(size, ctx, cx, cy) {
        const s = size * 0.7;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.roundRect(cx - s * 0.2, cy - s, s * 0.4, s * 2, 1);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.roundRect(cx - s, cy - s * 0.2, s * 2, s * 0.4, 1);
        ctx.fill();
        ctx.stroke();
    }

    drawShieldIcon(size, ctx, cx, cy) {
        const s = size * 0.8;
        ctx.beginPath();
        ctx.moveTo(cx, cy - s);
        ctx.lineTo(cx + s * 0.8, cy - s * 0.5);
        ctx.lineTo(cx + s * 0.7, cy + s * 0.3);
        ctx.lineTo(cx, cy + s);
        ctx.lineTo(cx - s * 0.7, cy + s * 0.3);
        ctx.lineTo(cx - s * 0.8, cy - s * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    drawLightningBolt(size, ctx, cx, cy) {
        const s = size * 0.8;
        ctx.beginPath();
        ctx.moveTo(cx + s * 0.1, cy - s);
        ctx.lineTo(cx - s * 0.4, cy + s * 0.1);
        ctx.lineTo(cx - s * 0.05, cy + s * 0.05);
        ctx.lineTo(cx - s * 0.1, cy + s);
        ctx.lineTo(cx + s * 0.4, cy - s * 0.1);
        ctx.lineTo(cx + s * 0.05, cy - s * 0.05);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    drawCloneShape(size, ctx, cx, cy) {
        const s = size * 0.65;
        // Back clone (offset, semi-transparent)
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.moveTo(cx + s * 0.3, cy - s * 0.8);
        ctx.lineTo(cx + s * 0.7, cy - s * 0.2);
        ctx.lineTo(cx + s * 0.5, cy + s * 0.8);
        ctx.lineTo(cx + s * 0.1, cy + s * 0.8);
        ctx.lineTo(cx - s * 0.1, cy - s * 0.2);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.globalAlpha = 1;
        // Front clone
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.3, cy - s * 0.8);
        ctx.lineTo(cx + s * 0.3, cy - s * 0.3);
        ctx.lineTo(cx + s * 0.15, cy + s * 0.8);
        ctx.lineTo(cx - s * 0.35, cy + s * 0.8);
        ctx.lineTo(cx - s * 0.6, cy - s * 0.2);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
    }

    drawDroneShape(size, ctx, cx, cy) {
        const s = size * 0.7;
        // Body square
        ctx.beginPath();
        ctx.roundRect(cx - s * 0.35, cy - s * 0.35, s * 0.7, s * 0.7, 2);
        ctx.fill();
        ctx.stroke();
        // Solar panels
        ctx.beginPath();
        ctx.roundRect(cx - s, cy - s * 0.15, s * 0.5, s * 0.3, 1);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.roundRect(cx + s * 0.5, cy - s * 0.15, s * 0.5, s * 0.3, 1);
        ctx.fill();
        ctx.stroke();
        // Eye
        ctx.fillStyle = '#66ddff';
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.15, 0, Math.PI * 2);
        ctx.fill();
    }

    drawDiamondIcon(size, ctx, cx, cy) {
        const s = size * 0.8;
        ctx.beginPath();
        ctx.moveTo(cx, cy - s);
        ctx.lineTo(cx + s * 0.65, cy);
        ctx.lineTo(cx, cy + s);
        ctx.lineTo(cx - s * 0.65, cy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Inner shine
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(cx, cy - s * 0.6);
        ctx.lineTo(cx + s * 0.2, cy);
        ctx.lineTo(cx, cy + s * 0.2);
        ctx.lineTo(cx - s * 0.2, cy);
        ctx.closePath();
        ctx.fill();
    }

    drawSpiralVortex(size, ctx, cx, cy) {
        const s = size * 0.7;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 3; a += 0.15) {
            const sr = s * 0.15 + a * s * 0.2;
            if (sr > s) break;
            const px = cx + sr * Math.cos(a), py = cy + sr * Math.sin(a);
            if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
        // Center dot
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(cx, cy, s * 0.15, 0, Math.PI * 2); ctx.fill();
    }

    drawClockIcon(size, ctx, cx, cy) {
        const s = size * 0.7;
        ctx.beginPath();
        ctx.arc(cx, cy, s, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Clock hands
        ctx.strokeStyle = 'rgba(100,80,200,0.8)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx, cy - s * 0.65);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + s * 0.45, cy + s * 0.1);
        ctx.stroke();
        // Ticks
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(cx + Math.cos(a) * s * 0.82, cy + Math.sin(a) * s * 0.82, 0.8, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawForwardArrows(size, ctx, cx, cy) {
        const s = size * 0.6;
        for (let i = 0; i < 2; i++) {
            const ox = i * s * 0.5 - s * 0.25;
            ctx.beginPath();
            ctx.moveTo(cx + ox, cy - s * 0.6);
            ctx.lineTo(cx + ox + s * 0.5, cy);
            ctx.lineTo(cx + ox, cy + s * 0.6);
            ctx.lineTo(cx + ox + s * 0.15, cy);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
    }

    drawTripleBars(size, ctx, cx, cy) {
        const s = size * 0.5;
        for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.roundRect(cx + i * s * 0.6 - s * 0.15, cy - s, s * 0.3, s * 2, 1);
            ctx.fill();
            ctx.stroke();
        }
    }

    drawStarShape(ctx, cx, s, cy) {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const outerAngle = -Math.PI / 2 + i * Math.PI * 2 / 5;
            const innerAngle = outerAngle + Math.PI / 5;
            ctx.lineTo(cx + Math.cos(outerAngle) * s, cy + Math.sin(outerAngle) * s);
            ctx.lineTo(cx + Math.cos(innerAngle) * s * 0.4, cy + Math.sin(innerAngle) * s * 0.4);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    apply(player, game) {
        switch (this.type) {
            case 'health':
                player.health = Math.min(player.health + 1, player.maxHealth);
                break;
            case 'shield':
                player.shieldTime = 5;
                player.shieldActive = true;
                break;
            case 'weapon':
                if (player.weaponLevel < player.maxWeaponLevel) {
                    player.weaponLevel++;
                }
                break;
            case 'speed':
                player.speedBoost = true;
                player.speedBoostTime = 6;
                player.speed = player.baseSpeed * (game.perkSystem ? game.perkSystem.getSpeedMultiplier() : 1) * 1.5;
                break;
            case 'rapid':
                player.rapidFire = true;
                player.rapidFireTime = 5;
                player.fireRate = player.baseFireRate * 0.5;
                break;
            case 'points':
                game.addScore(500);
                break;
            case 'ultimate':
                player.ultimateCharge = Math.min(player.ultimateCharge + 25, 100);
                break;
            // ─── World 2 Power-ups ───
            case 'drone_companion':
                player.droneActive = true;
                player.droneTime = 10;
                player.droneFireTimer = 0;
                break;
            case 'bullet_time':
                game.bulletTimeActive = true;
                game.bulletTimeTimer = 6;
                break;
            // ─── World 3 Power-ups ───
            case 'glitch_clone':
                player.glitchCloneActive = true;
                player.glitchCloneTime = 8;
                player.glitchCloneFireTimer = 0;
                player.glitchCloneAngle = 0;
                break;
            case 'data_drain':
                player.dataDrainActive = true;
                player.dataDrainTime = 6;
                break;

        }
    }
}

export { PowerUp, POWERUP_TYPES };
export default PowerUp;
