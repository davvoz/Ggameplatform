import { C_WHITE } from '../../entities/LevelsThemes.js';

const EMERGE_MIN_DURATION = 0.7;
const EMERGE_RANDOM_DURATION = 0.25;
const EMERGE_TYPES = ['quantumTunnel', 'particleCondense', 'dimensionTear', 'latticeForm'];
const HEX_GRID_SIZE = 10;
const HEX_GRID_ROWS = 5;

/**
 * EmergenceAnimator — Handles the spectacular W4 enemy background-emergence
 * animation. The enemy materialises over ~0.7-0.95 seconds using one of
 * four visual styles, remaining invulnerable until complete.
 */
class EmergenceAnimator {
    timer = 0;
    complete = false;
    savedAlpha = 1;

    constructor() {
        this.duration = EMERGE_MIN_DURATION + Math.random() * EMERGE_RANDOM_DURATION;
        this.type = EMERGE_TYPES[Math.floor(Math.random() * EMERGE_TYPES.length)];
    }

    /** Call once after construction. */
    init(enemy) {
        this.savedAlpha = enemy.alpha;
        enemy.alpha = 0;
    }

    /**
     * @returns {boolean} true if emergence is complete (normal update may proceed).
     */
    update(enemy, dt) {
        if (this.complete) return true;

        this.timer += dt;
        const progress = Math.min(1, this.timer / this.duration);
        enemy.alpha = this.savedAlpha * (progress * progress);
        enemy._invulnerable = true;

        if (progress >= 1) {
            this.complete = true;
            enemy._invulnerable = false;
            enemy.alpha = this.savedAlpha;
        }
        return this.complete;
    }

    render(ctx, enemy, cx, cy) {
        if (this.complete || this.timer === undefined) return;

        const progress = Math.min(1, this.timer / this.duration);
        const t = Date.now() * 0.001;
        const r = Math.max(enemy.width, enemy.height) * 0.7;
        const col = enemy.config.color || '#8888ff';

        ctx.save();
        switch (this.type) {
            case 'quantumTunnel':
                this._drawQuantumTunnel(ctx, cx, cy, progress, t, r, col);
                break;
            case 'particleCondense':
                this._drawParticleCondense(ctx, cx, cy, progress, t, r, col);
                break;
            case 'dimensionTear':
                this._drawDimensionTear(ctx, cx, cy, progress, t, r, col);
                break;
            case 'latticeForm':
                this._drawLatticeForm(ctx, cx, cy, progress, t, r, col);
                break;
        }
        ctx.restore();
    }

    // ── Quantum Tunnel ──────────────────────

    _drawQuantumTunnel(ctx, cx, cy, progress, t, r, col) {
        this._drawTunnelRings(ctx, cx, cy, progress, r, col);
        this._drawTunnelCore(ctx, cx, cy, progress, r);
        this._drawTunnelLines(ctx, cx, cy, progress, t, r, col);
    }

    _drawTunnelRings(ctx, cx, cy, progress, r, col) {
        const rings = 4;
        for (let i = 0; i < rings; i++) {
            const rp = (progress + i * 0.15) % 1;
            const rr = r * 0.3 + r * 1.2 * (1 - rp);
            ctx.globalAlpha = rp * 0.3 * (1 - progress);
            ctx.strokeStyle = col;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(cx, cy, rr, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    _drawTunnelCore(ctx, cx, cy, progress, r) {
        ctx.globalAlpha = progress * progress * 0.4;
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = C_WHITE;
        ctx.beginPath();
        ctx.arc(cx, cy, r * (0.1 + progress * 0.5), 0, Math.PI * 2);
        ctx.fill();
    }

    _drawTunnelLines(ctx, cx, cy, progress, t, r, col) {
        if (progress >= 0.7) return;
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = (0.7 - progress) * 0.5;
        ctx.strokeStyle = col;
        ctx.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
            const yOff = Math.sin(t * 20 + i * 5) * r * 0.4;
            const xSpread = r * progress;
            ctx.beginPath();
            ctx.moveTo(cx - xSpread, cy + yOff);
            ctx.lineTo(cx + xSpread, cy + yOff);
            ctx.stroke();
        }
    }

    // ── Particle Condense ───────────────────

    _drawParticleCondense(ctx, cx, cy, progress, t, r, col) {
        const count = 16;
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + t * 2;
            const dist = r * 2.5 * (1 - progress);
            const px = cx + Math.cos(angle) * dist;
            const py = cy + Math.sin(angle) * dist;
            const size = 2 + progress * 3;
            ctx.globalAlpha = progress * 0.5;
            ctx.fillStyle = i % 3 === 0 ? C_WHITE : col;
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fill();
            if (progress > 0.2) {
                ctx.globalAlpha = progress * 0.15;
                ctx.strokeStyle = col;
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                ctx.moveTo(px, py);
                const trailDist = dist + 15;
                ctx.lineTo(
                    cx + Math.cos(angle) * trailDist,
                    cy + Math.sin(angle) * trailDist
                );
                ctx.stroke();
            }
        }
        ctx.globalAlpha = progress * progress * 0.3;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(cx, cy, r * progress * 0.6, 0, Math.PI * 2);
        ctx.fill();
    }

    // ── Dimension Tear ──────────────────────

    _drawDimensionTear(ctx, cx, cy, progress, t, r, col) {
        const crackH = r * 2.5 * Math.min(1, progress * 2);
        const crackO = progress > 0.5 ? (progress - 0.5) * 2 : 0;
        const crackW = 3 + crackO * r * 0.8;

        this._drawTearVoid(ctx, cx, cy, crackW, crackH, progress);
        this._drawTearEdges(ctx, cx, cy, crackW, crackH, { progress, t, col });
        this._drawTearSparks(ctx, cx, cy, crackW, crackH, progress, t);
    }

    _drawTearVoid(ctx, cx, cy, w, h, progress) {
        ctx.globalAlpha = 0.5 * Math.min(1, progress * 3);
        ctx.fillStyle = '#000011';
        ctx.beginPath();
        ctx.ellipse(cx, cy, w * 0.5, h * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawTearEdges(ctx, cx, cy, w, h, params) {
        const { progress, t, col } = params;
        ctx.strokeStyle = col;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6 * Math.min(1, progress * 3);
        ctx.shadowColor = col;
        ctx.shadowBlur = 8;
        const segs = 12;
        for (let side = -1; side <= 1; side += 2) {
            ctx.beginPath();
            for (let i = 0; i <= segs; i++) {
                const f = i / segs;
                const yp = cy - h / 2 + h * f;
                const xp = cx + side * w * 0.5 + Math.sin(f * Math.PI * 3 + t * 5) * 2;
                i === 0 ? ctx.moveTo(xp, yp) : ctx.lineTo(xp, yp);
            }
            ctx.stroke();
        }
        ctx.shadowBlur = 0;
    }

    _drawTearSparks(ctx, cx, cy, w, h, progress, t) {
        if (progress <= 0.3) return;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = (progress - 0.3) * 0.5;
        for (let i = 0; i < 8; i++) {
            const sparkA = Math.sin(t * 12 + i * 4) * w * 0.6;
            const sparkY = cy + (i / 7 - 0.5) * h * 0.8;
            ctx.fillStyle = C_WHITE;
            ctx.beginPath();
            ctx.arc(cx + sparkA, sparkY,
                1.5 + Math.sin(t * 15 + i) * 0.8, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ── Lattice Form ────────────────────────

    _drawLatticeForm(ctx, cx, cy, progress, t, r, col) {
        const baseAlpha = Math.min(1, progress * 2);
        const collapse = progress > 0.5 ? (progress - 0.5) * 2 : 0;
        const gridR = r * 1.8 * (1 - collapse * 0.7);

        this._drawLatticeGrid(ctx, cx, cy, baseAlpha, collapse, gridR, col);
        this._drawLatticeNodes(ctx, cx, cy, { baseAlpha, collapse, gridR, t, col });
    }

    _drawLatticeGrid(ctx, cx, cy, baseAlpha, collapse, gridR, col) {
        ctx.globalAlpha = baseAlpha * 0.25 * (1 - collapse);
        ctx.strokeStyle = col;
        ctx.lineWidth = 0.8;
        for (let row = -HEX_GRID_ROWS; row <= HEX_GRID_ROWS; row++) {
            for (let c = -HEX_GRID_ROWS; c <= HEX_GRID_ROWS; c++) {
                const hx = cx + c * HEX_GRID_SIZE * 1.5;
                const hy = cy + row * HEX_GRID_SIZE * 1.73 + (c % 2) * HEX_GRID_SIZE * 0.87;
                if (Math.hypot(hx - cx, hy - cy) > gridR) continue;
                this._drawHexagon(ctx, hx, hy);
            }
        }
    }

    _drawHexagon(ctx, hx, hy) {
        ctx.beginPath();
        for (let v = 0; v < 6; v++) {
            const a = Math.PI / 3 * v;
            const vx = hx + Math.cos(a) * HEX_GRID_SIZE * 0.45;
            const vy = hy + Math.sin(a) * HEX_GRID_SIZE * 0.45;
            v === 0 ? ctx.moveTo(vx, vy) : ctx.lineTo(vx, vy);
        }
        ctx.closePath();
        ctx.stroke();
    }

    _drawLatticeNodes(ctx, cx, cy, params) {
        const { baseAlpha, collapse, gridR, t, col } = params;
        ctx.globalAlpha = baseAlpha * 0.4;
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = col;
        const nodeCount = 12;
        for (let i = 0; i < nodeCount; i++) {
            const na = (Math.PI * 2 / nodeCount) * i;
            const nr = gridR * 0.6;
            const nx = cx + Math.cos(na) * nr * (1 - collapse);
            const ny = cy + Math.sin(na) * nr * (1 - collapse);
            const bright = Math.sin(t * 8 + i * 1.3) > 0 ? 1 : 0.3;
            ctx.globalAlpha = baseAlpha * 0.5 * bright;
            ctx.beginPath();
            ctx.arc(nx, ny, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

export default EmergenceAnimator;
