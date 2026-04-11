/**
 * Obstacle entity — a non-traversable block placed on the arena.
 * Both the ball and characters bounce off obstacles.
 * Styled per-theme with a pixelated, hand-drawn look.
 */
export class Obstacle {
    #x;
    #y;
    #w;
    #h;
    #theme;
    #pulsePhase;

    /**
     * @param {{ x: number, y: number, w: number, h: number }} def
     * @param {object} theme - BackgroundRenderer theme palette
     */
    constructor(def, theme) {
        this.#x = def.x;
        this.#y = def.y;
        this.#w = def.w;
        this.#h = def.h;
        this.#theme = theme;
        this.#pulsePhase = Math.random() * Math.PI * 2;
    }

    get x()      { return this.#x; }
    get y()      { return this.#y; }
    get width()  { return this.#w; }
    get height() { return this.#h; }
    get alive()  { return true; }

    /* --- Collision: circle (ball) vs AABB --- */

    /**
     * Resolve ball collision against this obstacle.
     * Returns true if a collision occurred.
     */
    checkBallCollision(ball) {
        const r = ball.radius;
        const cx = ball.x;
        const cy = ball.y;

        // Nearest point on AABB to the circle center
        const nearX = Math.max(this.#x, Math.min(cx, this.#x + this.#w));
        const nearY = Math.max(this.#y, Math.min(cy, this.#y + this.#h));

        const dx = cx - nearX;
        const dy = cy - nearY;
        const distSq = dx * dx + dy * dy;

        if (distSq >= r * r) return false;

        // Determine dominant collision axis
        const overlapX = this.#overlapX(cx, r);
        const overlapY = this.#overlapY(cy, r);

        if (overlapX < overlapY) {
            ball.vx = -ball.vx;
            ball.x += (dx >= 0 ? 1 : -1) * (r - Math.abs(dx) + 1);
        } else {
            ball.vy = -ball.vy;
            ball.y += (dy >= 0 ? 1 : -1) * (r - Math.abs(dy) + 1);
        }

        ball.triggerImpact();
        return true;
    }

    /**
     * Push a character out of this obstacle (AABB vs circle).
     * Called after character movement to prevent overlap.
     */
    pushCharacterOut(character) {
        const r = character.hitboxRadius;
        const cx = character.x;
        const cy = character.y;

        const nearX = Math.max(this.#x, Math.min(cx, this.#x + this.#w));
        const nearY = Math.max(this.#y, Math.min(cy, this.#y + this.#h));

        const dx = cx - nearX;
        const dy = cy - nearY;
        const distSq = dx * dx + dy * dy;

        if (distSq >= r * r) return false;

        const dist = Math.sqrt(distSq);
        if (dist === 0) {
            // Edge case: center inside AABB — push upward
            character.y = this.#y - r - 1;
            return true;
        }

        const overlap = r - dist;
        character.x += (dx / dist) * (overlap + 1);
        character.y += (dy / dist) * (overlap + 1);
        return true;
    }

    /* --- Drawing --- */

    update(dt) {
        this.#pulsePhase += dt / 800;
    }

    draw(ctx) {
        const pulse = 0.7 + Math.sin(this.#pulsePhase) * 0.15;
        const accent = this.#theme?.accent ?? '#ff4444';

        ctx.save();

        // Block fill
        ctx.fillStyle = this.#theme?.floor ?? '#181830';
        ctx.fillRect(this.#x, this.#y, this.#w, this.#h);

        // Inner highlight (sketchy style)
        ctx.fillStyle = `rgba(255,255,255,0.05)`;
        ctx.fillRect(this.#x + 2, this.#y + 2, this.#w - 4, this.#h / 3);

        // Accent border glow
        ctx.strokeStyle = accent;
        ctx.globalAlpha = pulse;
        ctx.shadowColor = accent;
        ctx.shadowBlur = 6;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(this.#x + 0.5, this.#y + 0.5, this.#w - 1, this.#h - 1);

        // Corner dots (pixel style)
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = accent;
        const d = 2;
        ctx.fillRect(this.#x, this.#y, d, d);
        ctx.fillRect(this.#x + this.#w - d, this.#y, d, d);
        ctx.fillRect(this.#x, this.#y + this.#h - d, d, d);
        ctx.fillRect(this.#x + this.#w - d, this.#y + this.#h - d, d, d);

        // Cross-hatch (sketch feel) for larger blocks
        if (this.#w >= 14 && this.#h >= 14) {
            ctx.globalAlpha = 0.08;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 0.5;
            const step = 6;
            for (let i = -this.#h; i < this.#w; i += step) {
                ctx.beginPath();
                ctx.moveTo(this.#x + i, this.#y);
                ctx.lineTo(this.#x + i + this.#h, this.#y + this.#h);
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    /* --- Private helpers --- */

    #overlapX(cx, r) {
        if (cx < this.#x) return this.#x - (cx - r);
        if (cx > this.#x + this.#w) return (cx + r) - (this.#x + this.#w);
        return r + this.#w; // fully inside on X — large overlap
    }

    #overlapY(cy, r) {
        if (cy < this.#y) return this.#y - (cy - r);
        if (cy > this.#y + this.#h) return (cy + r) - (this.#y + this.#h);
        return r + this.#h;
    }
}
