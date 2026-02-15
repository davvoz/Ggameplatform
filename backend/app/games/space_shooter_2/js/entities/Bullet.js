import GameObject from './GameObject.js';

/**
 * Bullet - Energy bolt projectile with thick cartoon trail
 * Player bullets are large cyan energy bolts, enemy bullets are red orbs
 */
class Bullet extends GameObject {
    constructor(x, y, vx, vy, owner = 'player', damage = 1) {
        super(x, y, 12, 20);
        this.velocity.x = vx;
        this.velocity.y = vy;
        this.owner = owner;
        this.damage = damage;
        this.tag = 'bullet';
        this.trail = [];
        this.maxTrailLength = owner === 'player' ? 8 : 5;
        this.age = 0;

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
    }

    update(deltaTime, game) {
        this.age += deltaTime;

        // Store trail positions
        this.trail.push({
            x: this.position.x + this.width / 2,
            y: this.position.y + this.height / 2,
            age: 0
        });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }

        // Move
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;

        // Check bounds
        if (this.isOffScreen(game.canvas.width, game.canvas.height)) {
            this.destroy();
        }
    }

    render(ctx) {
        const cx = this.position.x + this.width / 2;
        const cy = this.position.y + this.height / 2;

        ctx.save();

        // === TRAIL: thick glowing tapered line ===
        if (this.trail.length > 1) {
            for (let i = 0; i < this.trail.length - 1; i++) {
                const t = (i + 1) / this.trail.length;
                const width = this.boltWidth * t * 1.5;
                ctx.globalAlpha = t * 0.5;
                ctx.strokeStyle = this.midColor;
                ctx.lineWidth = width + 2;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(this.trail[i].x, this.trail[i].y);
                ctx.lineTo(this.trail[i + 1].x, this.trail[i + 1].y);
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

        // === BOLT BODY: elongated energy shape ===
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 10;

        // Direction of travel for orientation
        const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
        const dirX = speed > 0 ? this.velocity.x / speed : 0;
        const dirY = speed > 0 ? this.velocity.y / speed : -1;
        const angle = Math.atan2(dirY, dirX);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle - Math.PI / 2);

        // Outer bolt shape (elongated diamond)
        const bL = this.boltLength;
        const bW = this.boltWidth;
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
        const pulse = 0.8 + Math.sin(this.age * 20) * 0.2;
        ctx.globalAlpha = 0.7 * pulse;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        // Cross sparkle
        const sparkSize = 3 * pulse;
        const tipX = cx + dirX * bL * 0.8;
        const tipY = cy + dirY * bL * 0.8;
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
