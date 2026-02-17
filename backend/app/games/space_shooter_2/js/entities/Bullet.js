import GameObject from './GameObject.js';

/**
 * Bullet - Energy bolt projectile with performance-aware rendering.
 *
 * HIGH   → Full glowing bolt with bezier body, radial glow, sparkling tip, thick trails.
 * MEDIUM → Simple colored oval/ellipse, thin line trail, no shadows or gradients.
 * LOW    → Tiny filled rect, no trail at all, minimal draw calls.
 *
 * The active performanceMode is set once via Bullet.setPerformanceMode() (called by Game).
 */

// Shared performance state (avoids per-bullet property overhead)
let _perfMode = 'high';

class Bullet extends GameObject {
    constructor(x, y, vx, vy, owner = 'player', damage = 1) {
        super(x, y, 12, 20);
        this.velocity.x = vx;
        this.velocity.y = vy;
        this.owner = owner;
        this.damage = damage;
        this.tag = 'bullet';
        this.age = 0;

        // Trail – length adjusted per perf mode
        this.trail = _perfMode === 'low' ? null : [];
        this.maxTrailLength = _perfMode === 'low' ? 0
            : (_perfMode === 'medium'
                ? (owner === 'player' ? 4 : 3)
                : (owner === 'player' ? 8 : 5));

        if (owner === 'player') {
            this.color = { r: 80, g: 200, b: 255 };
            this.coreColor = '#ffffff';
            this.midColor = '#66ccff';
            this.outerColor = '#2288dd';
            this.boltLength = 14;
            this.boltWidth = 5;
        } else {
            this.color = { r: 255, g: 70, b: 70 };
            this.coreColor = '#ffffff';
            this.midColor = '#ff6644';
            this.outerColor = '#cc2200';
            this.boltLength = 10;
            this.boltWidth = 4;
        }

        // Pre-compute direction angle (most bullets fly straight, so cache it)
        const speed = Math.sqrt(vx * vx + vy * vy);
        this._dirAngle = speed > 0 ? Math.atan2(vy / speed, vx / speed) - Math.PI / 2 : 0;
        this._speed = speed;
    }

    /**
     * Global setter – call from Game.setPerformanceMode().
     * Avoids passing performanceMode every frame or per-bullet.
     */
    static setPerformanceMode(mode) {
        _perfMode = mode;
    }

    update(deltaTime, game) {
        this.age += deltaTime;

        // Trail (skip entirely on low)
        if (this.trail) {
            this.trail.push(
                this.position.x + this.width / 2,
                this.position.y + this.height / 2
            );
            // Each entry is 2 floats (x, y) → maxTrailLength * 2
            const maxLen = this.maxTrailLength * 2;
            while (this.trail.length > maxLen) {
                this.trail.shift();
                this.trail.shift();
            }
        }

        // Move
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;

        // Bounds check
        if (this.isOffScreen(game.logicalWidth, game.logicalHeight)) {
            this.destroy();
        }
    }

    // ────────────────────── RENDER DISPATCHER ──────────────────────

    render(ctx) {
        if (_perfMode === 'low') {
            this._renderLow(ctx);
        } else if (_perfMode === 'medium') {
            this._renderMedium(ctx);
        } else {
            this._renderHigh(ctx);
        }
    }

    // ────────────────────── LOW: absolute minimum ──────────────────────

    _renderLow(ctx) {
        const cx = this.position.x + this.width / 2;
        const cy = this.position.y + this.height / 2;
        const bW = this.boltWidth;
        const bL = this.boltLength;

        // Single filled rect, no state changes beyond fillStyle
        ctx.fillStyle = this.midColor;
        ctx.fillRect(cx - bW * 0.5, cy - bL * 0.5, bW, bL);
    }

    // ────────────────────── MEDIUM: simple trail + oval ──────────────────────

    _renderMedium(ctx) {
        const cx = this.position.x + this.width / 2;
        const cy = this.position.y + this.height / 2;

        // Trail – single thin line from oldest to newest
        if (this.trail && this.trail.length >= 4) {
            ctx.globalAlpha = 0.4;
            ctx.strokeStyle = this.midColor;
            ctx.lineWidth = this.boltWidth * 0.6;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(this.trail[0], this.trail[1]);
            for (let i = 2; i < this.trail.length; i += 2) {
                ctx.lineTo(this.trail[i], this.trail[i + 1]);
            }
            ctx.lineTo(cx, cy);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // Simple oval body
        const bL = this.boltLength;
        const bW = this.boltWidth;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this._dirAngle);
        ctx.beginPath();
        ctx.ellipse(0, 0, bW * 0.6, bL * 0.7, 0, 0, Math.PI * 2);
        ctx.fillStyle = this.outerColor;
        ctx.fill();
        // Bright core
        ctx.beginPath();
        ctx.ellipse(0, 0, bW * 0.3, bL * 0.4, 0, 0, Math.PI * 2);
        ctx.fillStyle = this.coreColor;
        ctx.fill();
        ctx.restore();
    }

    // ────────────────────── HIGH: full effects (previous code) ──────────────────────

    _renderHigh(ctx) {
        const cx = this.position.x + this.width / 2;
        const cy = this.position.y + this.height / 2;

        ctx.save();

        // === TRAIL: thick glowing tapered line ===
        if (this.trail && this.trail.length >= 4) {
            const segs = this.trail.length / 2;
            for (let i = 0; i < this.trail.length - 2; i += 2) {
                const t = (i / 2 + 1) / segs;
                const width = this.boltWidth * t * 1.5;
                ctx.globalAlpha = t * 0.5;
                ctx.strokeStyle = this.midColor;
                ctx.lineWidth = width + 2;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(this.trail[i], this.trail[i + 1]);
                ctx.lineTo(this.trail[i + 2], this.trail[i + 3]);
                ctx.stroke();
                // Inner bright core trail
                ctx.globalAlpha = t * 0.7;
                ctx.strokeStyle = this.coreColor;
                ctx.lineWidth = width * 0.5;
                ctx.stroke();
            }
        }

        // === OUTER GLOW ===
        ctx.globalAlpha = 0.35;
        ctx.shadowColor = `rgb(${this.color.r},${this.color.g},${this.color.b})`;
        ctx.shadowBlur = 16;
        const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 14);
        glowGrad.addColorStop(0, `rgba(${this.color.r},${this.color.g},${this.color.b},0.6)`);
        glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        ctx.fill();

        // === BOLT BODY ===
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 10;

        const bL = this.boltLength;
        const bW = this.boltWidth;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this._dirAngle);

        // Outer bolt shape (elongated diamond)
        ctx.beginPath();
        ctx.moveTo(0, -bL);
        ctx.bezierCurveTo(bW, -bL * 0.3, bW, bL * 0.2, 0, bL * 0.6);
        ctx.bezierCurveTo(-bW, bL * 0.2, -bW, -bL * 0.3, 0, -bL);
        ctx.closePath();
        ctx.fillStyle = this.outerColor;
        ctx.fill();
        ctx.strokeStyle = this.midColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Mid layer
        ctx.beginPath();
        ctx.moveTo(0, -bL * 0.7);
        ctx.bezierCurveTo(bW * 0.6, -bL * 0.2, bW * 0.6, bL * 0.1, 0, bL * 0.35);
        ctx.bezierCurveTo(-bW * 0.6, bL * 0.1, -bW * 0.6, -bL * 0.2, 0, -bL * 0.7);
        ctx.closePath();
        ctx.fillStyle = this.midColor;
        ctx.fill();

        // White hot core
        ctx.beginPath();
        ctx.moveTo(0, -bL * 0.45);
        ctx.bezierCurveTo(bW * 0.3, -bL * 0.1, bW * 0.3, bL * 0.05, 0, bL * 0.15);
        ctx.bezierCurveTo(-bW * 0.3, bL * 0.05, -bW * 0.3, -bL * 0.1, 0, -bL * 0.45);
        ctx.closePath();
        ctx.fillStyle = this.coreColor;
        ctx.fill();

        ctx.restore();

        // === SPARKLE at tip ===
        const dirX = this._speed > 0 ? this.velocity.x / this._speed : 0;
        const dirY = this._speed > 0 ? this.velocity.y / this._speed : -1;
        const pulse = 0.8 + Math.sin(this.age * 20) * 0.2;
        ctx.globalAlpha = 0.7 * pulse;
        ctx.fillStyle = '#fff';
        const sparkSize = 3 * pulse;
        const tipX = cx + dirX * bL * 0.8;
        const tipY = cy + dirY * bL * 0.8;
        ctx.beginPath();
        ctx.moveTo(tipX, tipY - sparkSize);
        ctx.lineTo(tipX + 1, tipY);
        ctx.lineTo(tipX, tipY + sparkSize);
        ctx.lineTo(tipX - 1, tipY);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(tipX - sparkSize, tipY);
        ctx.lineTo(tipX, tipY + 1);
        ctx.lineTo(tipX + sparkSize, tipY);
        ctx.lineTo(tipX, tipY - 1);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}

export default Bullet;
