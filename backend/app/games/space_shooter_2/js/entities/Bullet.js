import GameObject from './GameObject.js';

/**
 * Bullet - Energy bolt projectile
 *
 * All performance modes render the SAME bolt shape (bezier body, multi-layer
 * core, trail). The only differences:
 *   HIGH   → outer radialGradient glow + sparkle tip + 8-point trail
 *   MEDIUM → no outer glow, sparkle tip, 5-point trail
 *   LOW    → no outer glow, no sparkle, 3-point trail
 *
 * No shadowBlur is used in any mode.
 */

// Shared performance state
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

        // Trail — always present, just shorter on lower modes
        this.trail = [];
        this.maxTrailLength = _perfMode === 'low' ? 3
            : (_perfMode === 'medium'
                ? (owner === 'player' ? 5 : 4)
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

        // Pre-compute direction angle
        const speed = Math.sqrt(vx * vx + vy * vy);
        this._dirAngle = speed > 0 ? Math.atan2(vy / speed, vx / speed) - Math.PI / 2 : 0;
        this._speed = speed;
    }

    static setPerformanceMode(mode) {
        _perfMode = mode;
    }

    update(deltaTime, game) {
        this.age += deltaTime;

        // Trail — flat array of x,y pairs
        this.trail.push(
            this.position.x + this.width / 2,
            this.position.y + this.height / 2
        );
        const maxLen = this.maxTrailLength * 2;
        while (this.trail.length > maxLen) {
            this.trail.shift();
            this.trail.shift();
        }

        // Move
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;

        // Bounds check
        if (this.isOffScreen(game.logicalWidth, game.logicalHeight)) {
            this.destroy();
        }
    }

    render(ctx) {
        const cx = this.position.x + this.width / 2;
        const cy = this.position.y + this.height / 2;
        const bL = this.boltLength;
        const bW = this.boltWidth;
        const isHigh = _perfMode === 'high';
        const isLow  = _perfMode === 'low';

        ctx.save();

        // === TRAIL: tapered line (always rendered, length varies) ===
        if (this.trail.length >= 4) {
            const segs = this.trail.length / 2;
            for (let i = 0; i < this.trail.length - 2; i += 2) {
                const t = (i / 2 + 1) / segs;
                const width = bW * t * 1.5;
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

        // === OUTER GLOW (high only — subtle radialGradient, no shadowBlur) ===
        if (isHigh) {
            ctx.globalAlpha = 0.35;
            const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 14);
            glowGrad.addColorStop(0, `rgba(${this.color.r},${this.color.g},${this.color.b},0.6)`);
            glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = glowGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, 14, 0, Math.PI * 2);
            ctx.fill();
        }

        // === BOLT BODY (always rendered — same shape on all modes) ===
        ctx.globalAlpha = 1;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this._dirAngle);

        // Outer bolt shape (elongated diamond via bezier)
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

        ctx.restore(); // undo translate+rotate

        // === SPARKLE at tip (skip only on low — barely visible difference) ===
        if (!isLow) {
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
        }

        ctx.restore();
    }
}

export default Bullet;
