/**
 * Explosion - Dramatic cartoon fireball with multiple visual layers
 */
class Explosion {
    constructor(x, y, size = 1, color = null) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.life = 0;
        this.maxLife = 0.5 + size * 0.2;
        this.active = true;
        this.baseRadius = 24 * size;
        this.color = color || { r: 255, g: 180, b: 50 };

        // Organic blobs (more, bigger)
        this.blobs = [];
        const blobCount = 6 + Math.floor(size * 4);
        for (let i = 0; i < blobCount; i++) {
            const angle = (Math.PI * 2 / blobCount) * i + (Math.random() - 0.5) * 0.5;
            this.blobs.push({
                angle,
                speed: 40 + Math.random() * 80 * size,
                size: 8 + Math.random() * 12 * size,
                x: 0, y: 0
            });
        }

        // Spark particles
        this.sparks = [];
        const sparkCount = 5 + Math.floor(size * 3);
        for (let i = 0; i < sparkCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            this.sparks.push({
                angle,
                speed: 80 + Math.random() * 120 * size,
                x: 0, y: 0,
                life: 0.3 + Math.random() * 0.3
            });
        }
    }

    update(dt) {
        this.life += dt;
        if (this.life >= this.maxLife) {
            this.active = false;
            return;
        }

        for (const blob of this.blobs) {
            blob.x += Math.cos(blob.angle) * blob.speed * dt;
            blob.y += Math.sin(blob.angle) * blob.speed * dt;
            blob.speed *= 0.97; // decelerate
        }

        for (const spark of this.sparks) {
            spark.x += Math.cos(spark.angle) * spark.speed * dt;
            spark.y += Math.sin(spark.angle) * spark.speed * dt;
            spark.speed *= 0.95;
        }
    }

    render(ctx) {
        if (!isFinite(this.x) || !isFinite(this.y)) { this.active = false; return; }
        const t = this.life / this.maxLife;
        const alpha = 1 - t * t; // Quadratic fade for longer visibility

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // === OUTER SHOCKWAVE RINGS (double ring) ===
        if (t > 0.05 && t < 0.7) {
            const ringT = (t - 0.05) / 0.65;
            // Outer ring
            const outerR = this.baseRadius * 2.5 * ringT;
            ctx.globalAlpha = alpha * 0.25 * (1 - ringT);
            ctx.strokeStyle = `rgb(${this.color.r},${this.color.g},${this.color.b})`;
            ctx.lineWidth = 3 * (1 - ringT);
            ctx.beginPath();
            ctx.arc(this.x, this.y, outerR, 0, Math.PI * 2);
            ctx.stroke();
            // Inner ring (slower)
            if (ringT < 0.8) {
                const innerR = this.baseRadius * 1.6 * ringT;
                ctx.globalAlpha = alpha * 0.15 * (1 - ringT);
                ctx.lineWidth = 2 * (1 - ringT);
                ctx.beginPath();
                ctx.arc(this.x, this.y, innerR, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // === FIRE BLOBS ===
        ctx.globalAlpha = alpha;
        for (const blob of this.blobs) {
            const bx = this.x + blob.x;
            const by = this.y + blob.y;
            const bSize = blob.size * (1 - t * 0.6);

            if (bSize <= 0) continue;

            const bGrad = ctx.createRadialGradient(bx, by, 0, bx, by, bSize);
            bGrad.addColorStop(0, `rgba(255,255,200,${alpha * 0.7})`);
            bGrad.addColorStop(0.4, `rgba(${this.color.r},${this.color.g},${this.color.b},${alpha * 0.5})`);
            bGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = bGrad;
            ctx.beginPath();
            ctx.arc(bx, by, bSize, 0, Math.PI * 2);
            ctx.fill();
        }

        // === CORE GLOW (bright white-to-color sphere) ===
        const coreRadius = this.baseRadius * (1.3 - t * 0.8);
        ctx.globalAlpha = alpha * 0.9;
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, coreRadius);
        gradient.addColorStop(0, `rgba(255,255,255,${alpha})`);
        gradient.addColorStop(0.2, `rgba(255,255,200,${alpha * 0.9})`);
        gradient.addColorStop(0.5, `rgba(${this.color.r},${this.color.g},${this.color.b},${alpha * 0.6})`);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, coreRadius, 0, Math.PI * 2);
        ctx.fill();

        // === FLYING SPARKS (bright streaks) ===
        for (const spark of this.sparks) {
            const sparkAlpha = Math.max(0, 1 - this.life / spark.life);
            if (sparkAlpha <= 0) continue;
            ctx.globalAlpha = sparkAlpha * 0.8;
            ctx.fillStyle = '#fff';
            const sx = this.x + spark.x;
            const sy = this.y + spark.y;
            // Streak toward origin
            const dx = -Math.cos(spark.angle) * 4;
            const dy = -Math.sin(spark.angle) * 4;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + dx, sy + dy);
            ctx.lineTo(sx + 1, sy + 1);
            ctx.closePath();
            ctx.fill();
        }

        // === CARTOON OUTLINE RING (appears briefly) ===
        if (t < 0.25) {
            const outlineAlpha = (0.25 - t) * 4;
            ctx.globalAlpha = outlineAlpha * 0.4;
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = '#111';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.baseRadius * (0.5 + t * 3), 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }
}

export default Explosion;
