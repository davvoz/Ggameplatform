/**
 * Animated neon backdrop: vertical gradient + slow scrolling diagonal grid + sparkle dots.
 * Cheap, no per-frame allocations.
 */
import { GameConfig } from '../config/GameConfig.js';

const SPARKS = [];
const SPARK_COUNT = 35;
function initSparks() {
    if (SPARKS.length) return;
    for (let i = 0; i < SPARK_COUNT; i++) {
        SPARKS.push({
            x: Math.random() * GameConfig.VIEW_WIDTH,
            y: Math.random() * GameConfig.VIEW_HEIGHT,
            r: 0.5 + Math.random() * 1.6,
            phase: Math.random() * Math.PI * 2,
            speed: 0.4 + Math.random() * 1.2
        });
    }
}
initSparks();

export class BackgroundRenderer {
    t = 0;

    update(dt) { this.t += dt; }

    render(ctx) {
        const W = GameConfig.VIEW_WIDTH;
        const H = GameConfig.VIEW_HEIGHT;
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, GameConfig.COLOR.BG_TOP);
        g.addColorStop(0.6, GameConfig.COLOR.BG_DEEP);
        g.addColorStop(1, GameConfig.COLOR.BG_BOTTOM);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        // Diagonal scrolling grid lines (cyan)
        ctx.save();
        ctx.strokeStyle = 'rgba(0,255,255,0.06)';
        ctx.lineWidth = 1;
        const step = 36;
        const offset = (this.t * 20) % step;
        for (let x = -H; x < W + H; x += step) {
            ctx.beginPath();
            ctx.moveTo(x + offset, 0);
            ctx.lineTo(x + offset - H, H);
            ctx.stroke();
        }
        ctx.restore();

        // Sparkles
        for (const s of SPARKS) {
            const a = 0.4 + Math.sin(this.t * s.speed + s.phase) * 0.4;
            ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
