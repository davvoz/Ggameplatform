import { GameConfig, RED_NUMBERS } from '../config/GameConfig.js';

const L = GameConfig.LAYOUT;
const C = GameConfig.COLOR;

const SUPERSAMPLE = 2;          // offscreen layers rendered at 2x for AA
const TRAIL_MAX = 9;            // ball motion-trail samples
const BLUR_SPEED_MIN = 1.6;     // rad/frame-ish threshold for motion blur

/**
 * Draws the wheel (rim + sectors + ball + center hub) with a vertical squash
 * to simulate top-down perspective. No physics here — read-only render.
 *
 * Presentation upgrades (logic untouched):
 *  - Static layers (rim / sectors / hub) pre-rendered once to offscreen
 *    canvases at 2x and rotated per frame → crisp + fast.
 *  - Metallic conic sheen on the rim, gold pocket separators, pocket shading.
 *  - Speed-based motion blur ghost passes while spinning fast.
 *  - Fading ball trail, glossy ball shading and contact shadow.
 *  - Pulsing glow highlight on the winning pocket.
 */
export class WheelRenderer {
    constructor(dataRegistry) {
        this._order = dataRegistry.getWheelOrder();
        this._sectorAngle = (2 * Math.PI) / this._order.length;
        this._pad = L.WHEEL_R_OUTER + 18;
        this._lastWheelAngle = null;
        this._trail = [];
        this._rimLayer    = this._buildRimLayer();
        this._sectorLayer = this._buildSectorLayer();
        this._hubLayer    = this._buildHubLayer();
    }

    draw(ctx, wheelAngle, ballAngle, ballRadiusFactor, highlightNumber) {
        const spinDelta = this._lastWheelAngle === null ? 0 : wheelAngle - this._lastWheelAngle;
        this._lastWheelAngle = wheelAngle;

        ctx.save();
        ctx.translate(L.WHEEL_CX, L.WHEEL_CY);
        ctx.scale(1, L.WHEEL_TILT_Y);

        this._drawGroundShadow(ctx);
        this._drawLayer(ctx, this._rimLayer, 0);

        // Motion-blur ghosts while the wheel is fast.
        const speed = Math.abs(spinDelta);
        if (speed > BLUR_SPEED_MIN / 60) {
            ctx.globalAlpha = 0.22;
            this._drawLayer(ctx, this._sectorLayer, wheelAngle - spinDelta * 0.66);
            ctx.globalAlpha = 0.12;
            this._drawLayer(ctx, this._sectorLayer, wheelAngle - spinDelta * 1.33);
            ctx.globalAlpha = 1;
        }
        this._drawLayer(ctx, this._sectorLayer, wheelAngle);

        if (highlightNumber !== null && highlightNumber !== undefined) {
            this._drawHighlight(ctx, wheelAngle, highlightNumber);
        }
        this._drawLayer(ctx, this._hubLayer, 0);
        this._drawBall(ctx, ballAngle, ballRadiusFactor, speed);
        this._drawSpecular(ctx);
        ctx.restore();
    }

    // ── Per-frame dynamic pieces ──────────────────────────────────────

    _drawGroundShadow(ctx) {
        const r = L.WHEEL_R_OUTER;
        const grad = ctx.createRadialGradient(0, 22, r * 0.4, 0, 22, r + 26);
        grad.addColorStop(0, 'rgba(0,0,0,0.55)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(0, 22, r + 26, r + 26, 0, 0, Math.PI * 2);
        ctx.fill();
        // Warm halo under the rim (ambient bounce light).
        const halo = ctx.createRadialGradient(0, 0, r * 0.8, 0, 0, r + 24);
        halo.addColorStop(0, 'rgba(212,160,23,0)');
        halo.addColorStop(0.85, 'rgba(212,160,23,0.10)');
        halo.addColorStop(1, 'rgba(212,160,23,0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(0, 0, r + 24, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawLayer(ctx, layer, angle) {
        const size = this._pad * 2;
        ctx.save();
        ctx.rotate(angle);
        ctx.drawImage(layer, -this._pad, -this._pad, size, size);
        ctx.restore();
    }

    _drawHighlight(ctx, wheelAngle, number) {
        const idx = this._order.indexOf(number);
        if (idx < 0) return;
        const base = wheelAngle + idx * this._sectorAngle;
        const half = this._sectorAngle / 2;
        const pulse = 0.55 + 0.45 * Math.sin(performance.now() / 180);
        const rOuter = L.WHEEL_R_OUTER - 5;
        ctx.save();
        ctx.globalAlpha = 0.35 + 0.3 * pulse;
        ctx.fillStyle = C.GOLD_PALE;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, rOuter, base - half, base + half);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowColor = C.WIN_GLOW;
        ctx.shadowBlur = 16 + 10 * pulse;
        ctx.strokeStyle = C.GOLD_BRIGHT;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
    }

    _drawBall(ctx, ballAngle, ballRadiusFactor, wheelSpeed) {
        const r = L.WHEEL_R_INNER + (L.WHEEL_R_OUTER - L.WHEEL_R_INNER) * ballRadiusFactor;
        const bx = Math.cos(ballAngle) * r;
        const by = Math.sin(ballAngle) * r;

        // Trail: record only while something is moving.
        if (wheelSpeed > 0.0005 || this._trail.length > 0) {
            this._trail.push({ x: bx, y: by });
            if (this._trail.length > TRAIL_MAX) this._trail.shift();
            if (wheelSpeed <= 0.0005) this._trail.shift();   // decay when stopped
        }
        for (let i = 0; i < this._trail.length - 1; i++) {
            const t = (i + 1) / this._trail.length;
            const p = this._trail[i];
            ctx.globalAlpha = 0.16 * t;
            ctx.fillStyle = C.IVORY;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4.5 * t, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Contact shadow.
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.ellipse(bx + 1.5, by + 3, 6, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Glossy ivory sphere.
        const grad = ctx.createRadialGradient(bx - 2.2, by - 2.4, 0.8, bx, by, 6.5);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.55, C.BALL);
        grad.addColorStop(1, '#b8b2a2');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(bx, by, 5.5, 0, Math.PI * 2);
        ctx.fill();
        // Specular dot.
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.beginPath();
        ctx.arc(bx - 2, by - 2.2, 1.3, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawSpecular(ctx) {
        // Soft glass reflection sweeping the upper-left of the bowl.
        const r = L.WHEEL_R_OUTER;
        const grad = ctx.createRadialGradient(-r * 0.45, -r * 0.55, 6, -r * 0.45, -r * 0.55, r * 1.1);
        grad.addColorStop(0, 'rgba(255,255,255,0.10)');
        grad.addColorStop(0.5, 'rgba(255,255,255,0.03)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, r + 6, 0, Math.PI * 2);
        ctx.fill();
    }

    // ── Cached static layers ──────────────────────────────────────────

    _makeLayer() {
        const canvas = document.createElement('canvas');
        const size = this._pad * 2 * SUPERSAMPLE;
        canvas.width = size;
        canvas.height = size;
        const c = canvas.getContext('2d');
        c.translate(size / 2, size / 2);
        c.scale(SUPERSAMPLE, SUPERSAMPLE);
        return { canvas, c };
    }

    _buildRimLayer() {
        const { canvas, c } = this._makeLayer();
        const rOut = L.WHEEL_R_OUTER;
        // Dark wood outer band.
        this._fillCircle(c, rOut + 16, [['#3a2a10', 0], ['#241a08', 1]]);
        // Metallic gold ring — conic sheen when supported.
        if (typeof c.createConicGradient === 'function') {
            const conic = c.createConicGradient(-Math.PI / 3, 0, 0);
            conic.addColorStop(0,    C.GOLD_DEEP);
            conic.addColorStop(0.15, C.GOLD_PALE);
            conic.addColorStop(0.3,  C.GOLD);
            conic.addColorStop(0.55, C.GOLD_DEEP);
            conic.addColorStop(0.7,  C.GOLD_BRIGHT);
            conic.addColorStop(0.85, C.GOLD);
            conic.addColorStop(1,    C.GOLD_DEEP);
            c.fillStyle = conic;
            c.beginPath();
            c.arc(0, 0, rOut + 10, 0, Math.PI * 2);
            c.fill();
        } else {
            this._fillCircle(c, rOut + 10, [[C.GOLD_BRIGHT, 0], [C.GOLD_DEEP, 1]]);
        }
        // Inner bowl edge (dark recess before pockets).
        this._fillCircle(c, rOut + 2, [['#14100a', 0], ['#060503', 1]]);
        // Thin polished bead.
        c.strokeStyle = 'rgba(255,233,168,0.55)';
        c.lineWidth = 1.2;
        c.beginPath();
        c.arc(0, 0, rOut + 10, 0, Math.PI * 2);
        c.stroke();
        return canvas;
    }

    _buildSectorLayer() {
        const { canvas, c } = this._makeLayer();
        const rOuter = L.WHEEL_R_OUTER - 4;
        const rInner = L.WHEEL_R_INNER + 2;
        const half = this._sectorAngle / 2;

        for (let i = 0; i < this._order.length; i++) {
            const n = this._order[i];
            const base = i * this._sectorAngle;
            // Pocket wedge with radial depth shading.
            const grad = c.createRadialGradient(0, 0, rInner, 0, 0, rOuter);
            const col = this._sectorColor(n);
            grad.addColorStop(0, this._shade(col, -0.35));
            grad.addColorStop(0.55, col);
            grad.addColorStop(1, this._shade(col, 0.12));
            c.beginPath();
            c.moveTo(0, 0);
            c.arc(0, 0, rOuter, base - half, base + half);
            c.closePath();
            c.fillStyle = grad;
            c.fill();
            // Gold fret (pocket separator).
            c.save();
            c.rotate(base + half);
            const fret = c.createLinearGradient(rInner, 0, rOuter, 0);
            fret.addColorStop(0, C.GOLD_DEEP);
            fret.addColorStop(0.5, C.GOLD_BRIGHT);
            fret.addColorStop(1, C.GOLD_PALE);
            c.strokeStyle = fret;
            c.lineWidth = 1.4;
            c.beginPath();
            c.moveTo(rInner + 1, 0);
            c.lineTo(rOuter - 1, 0);
            c.stroke();
            c.restore();
            // Number label.
            c.save();
            c.rotate(base);
            c.translate((rOuter + rInner) / 2 + 8, 0);
            c.rotate(Math.PI / 2);
            c.fillStyle = C.IVORY;
            c.font = 'bold 11px Georgia, serif';
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            c.shadowColor = 'rgba(0,0,0,0.6)';
            c.shadowBlur = 2;
            c.fillText(String(n), 0, 0);
            c.restore();
        }
        // Pocket bed shading near the inner ring (depth illusion).
        const bed = c.createRadialGradient(0, 0, rInner, 0, 0, rInner + 22);
        bed.addColorStop(0, 'rgba(0,0,0,0.45)');
        bed.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = bed;
        c.beginPath();
        c.arc(0, 0, rInner + 22, 0, Math.PI * 2);
        c.arc(0, 0, rInner, 0, Math.PI * 2, true);
        c.fill();
        // Inner punch-out ring.
        this._fillCircle(c, rInner, [[C.GOLD, 0], [C.WHEEL_RIM, 1]]);
        return canvas;
    }

    _buildHubLayer() {
        const { canvas, c } = this._makeLayer();
        const rHub = L.WHEEL_R_INNER - 14;
        // Turret cross-arms.
        c.save();
        for (let i = 0; i < 4; i++) {
            c.rotate(Math.PI / 2 * i);
            const arm = c.createLinearGradient(0, -3, 0, 3);
            arm.addColorStop(0, C.GOLD_PALE);
            arm.addColorStop(0.5, C.GOLD);
            arm.addColorStop(1, C.GOLD_DEEP);
            c.fillStyle = arm;
            c.beginPath();
            c.roundRect(8, -3, rHub + 16, 6, 3);
            c.fill();
            c.beginPath();
            c.arc(rHub + 24, 0, 4.5, 0, Math.PI * 2);
            c.fill();
        }
        c.restore();
        // Dome base ring + dark dome.
        this._fillCircle(c, rHub, [[C.GOLD_BRIGHT, 0], [C.GOLD_DEEP, 1]]);
        this._fillCircle(c, rHub - 5, [['#2c2c34', 0], ['#08080c', 1]]);
        // Polished center cap.
        this._fillCircle(c, 9, [[C.GOLD_PALE, 0], [C.GOLD_DEEP, 1]]);
        c.fillStyle = 'rgba(255,255,255,0.8)';
        c.beginPath();
        c.arc(-2.5, -2.5, 2, 0, Math.PI * 2);
        c.fill();
        return canvas;
    }

    // ── Small helpers ─────────────────────────────────────────────────

    _sectorColor(n) {
        if (n === 0) return C.GREEN;
        return RED_NUMBERS.has(n) ? C.RED : C.BLACK;
    }

    _fillCircle(c, radius, stops) {
        const grad = c.createRadialGradient(0, -radius * 0.4, radius * 0.1, 0, 0, radius);
        for (const [color, pos] of stops) grad.addColorStop(pos, color);
        c.fillStyle = grad;
        c.beginPath();
        c.arc(0, 0, radius, 0, Math.PI * 2);
        c.fill();
    }

    /** Lighten (amt>0) or darken (amt<0) a #rrggbb color. */
    _shade(hex, amt) {
        const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
        if (!m) return hex;
        const ch = (s) => {
            const v = Number.parseInt(s, 16);
            const out = amt >= 0 ? v + (255 - v) * amt : v * (1 + amt);
            return Math.round(Math.min(255, Math.max(0, out))).toString(16).padStart(2, '0');
        };
        return `#${ch(m[1])}${ch(m[2])}${ch(m[3])}`;
    }
}
