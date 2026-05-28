/**
 * Animates winning paylines: trace the line then pulse its winning cells.
 * Operates on the current reel area coords (cell centers).
 */
import { GameConfig } from '../config/GameConfig.js';

export class PaylineRenderer {
    t = 0;
    activeHits = [];
    cycleIndex = 0;
    cycleDuration = (GameConfig.TIMINGS.WIN_LINE_DRAW_MS + GameConfig.TIMINGS.WIN_LINE_HOLD_MS) / 1000;
    _cycleT = 0;

    setHits(hits) {
        this.activeHits = hits || [];
        this.cycleIndex = 0;
        this._cycleT = 0;
    }

    update(dt) {
        this.t += dt;
        if (this.activeHits.length === 0) return;
        this._cycleT += dt;
        if (this._cycleT >= this.cycleDuration) {
            this._cycleT = 0;
            this.cycleIndex = (this.cycleIndex + 1) % this.activeHits.length;
        }
    }

    render(ctx) {
        if (this.activeHits.length === 0) return;
        const hit = this.activeHits[this.cycleIndex];
        const drawMs = GameConfig.TIMINGS.WIN_LINE_DRAW_MS;
        const k = Math.min(this._cycleT * 1000 / drawMs, 1);
        const pts = hit.cells.map(([r, row]) => this._cellCenter(r, row));

        ctx.save();
        ctx.strokeStyle = hit.color;
        ctx.shadowColor = hit.color;
        ctx.shadowBlur = 18;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        const segments = pts.length - 1;
        const total = segments;
        const progressed = k * total;
        for (let i = 1; i <= segments; i++) {
            if (i <= progressed) {
                ctx.lineTo(pts[i].x, pts[i].y);
            } else {
                const frac = progressed - (i - 1);
                if (frac > 0) {
                    const a = pts[i - 1], b = pts[i];
                    ctx.lineTo(a.x + (b.x - a.x) * frac, a.y + (b.y - a.y) * frac);
                }
                break;
            }
        }
        ctx.stroke();
        // Pulsing cell markers
        for (let i = 0; i < hit.cells.length; i++) {
            if (i > progressed) break;
            const p = pts[i];
            const pulse = 0.6 + Math.sin(this.t * 8 + i) * 0.4;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 10 + pulse * 4, 0, Math.PI * 2);
            ctx.strokeStyle = hit.color;
            ctx.lineWidth = 2.5;
            ctx.stroke();
        }
        ctx.restore();
    }

    _cellCenter(reelIdx, rowIdx) {
        const L = GameConfig.LAYOUT;
        const colX = L.REEL_AREA_X + reelIdx * (L.CELL_W + L.CELL_GAP_X);
        const rowY = L.REEL_AREA_Y + rowIdx * (L.CELL_H + L.CELL_GAP_Y);
        return { x: colX + L.CELL_W / 2, y: rowY + L.CELL_H / 2 };
    }
}
