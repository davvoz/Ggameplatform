/**
 * TheKernelSector — Sector 6 (Levels 86-90)
 *
 * Fractal void, cosmic code geometry, neural-network connecting lines.
 */
import { SimulationSectorRenderer } from './SimulationSectorRenderer.js';

export class TheKernelSector extends SimulationSectorRenderer {

    build() {
        this.fractals = [];
        this.floaters = [];

        const count = this.quality === 'low' ? 5 : 10;
        for (let i = 0; i < count; i++) {
            this.fractals.push({
                x: window.randomSecure() * this.canvasWidth,
                y: window.randomSecure() * this.canvasHeight,
                sides: 3 + Math.floor(window.randomSecure() * 5),
                radius: 8 + window.randomSecure() * 25,
                rot: window.randomSecure() * Math.PI * 2,
                rotSpeed: (window.randomSecure() - 0.5) * 0.8,
                speed: 3 + window.randomSecure() * 8,
                hue: window.randomSecure() * 360,
                alpha: 0.08 + window.randomSecure() * 0.12,
                innerRings: 1 + Math.floor(window.randomSecure() * 3)
            });
        }

        for (let i = 0; i < (this.quality === 'low' ? 10 : 20); i++) {
            this.floaters.push({
                x: window.randomSecure() * this.canvasWidth,
                y: window.randomSecure() * this.canvasHeight,
                size: 1 + window.randomSecure() * 3,
                speed: 2 + window.randomSecure() * 6,
                hue: window.randomSecure() * 360,
                alpha: 0.1 + window.randomSecure() * 0.2,
                orbit: window.randomSecure() * Math.PI * 2
            });
        }
    }

    update(dt) {
        for (const f of this.fractals) {
            f.y += f.speed * dt;
            f.rot += f.rotSpeed * dt;
            f.hue = (f.hue + 15 * dt) % 360;
            if (f.y > this.canvasHeight + 30) {
                f.y = -30; f.x = window.randomSecure() * this.canvasWidth;
            }
        }
        for (const f of this.floaters) {
            f.y += f.speed * dt;
            f.orbit += dt * 0.5;
            f.x += Math.sin(f.orbit) * 10 * dt;
            if (f.y > this.canvasHeight + 5) { f.y = -5; f.x = window.randomSecure() * this.canvasWidth; }
        }
    }

    renderBg(ctx) {
        const W = this.canvasWidth, H = this.canvasHeight;

        const pulse = Math.sin(this.time * 0.5) * 0.5 + 0.5;
        const grad = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W * 0.8);
        grad.addColorStop(0, `rgba(${15 + pulse * 10},5,${20 + pulse * 15},1)`);
        grad.addColorStop(0.5, '#050208');
        grad.addColorStop(1, '#020104');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // Fractal geometry
        for (const f of this.fractals) {
            ctx.save();
            ctx.translate(f.x, f.y);
            ctx.rotate(f.rot);

            for (let ring = 0; ring < f.innerRings; ring++) {
                const r = f.radius * (1 - ring * 0.3);
                const alpha = f.alpha * (1 - ring * 0.3);
                ctx.globalAlpha = alpha;
                ctx.strokeStyle = `hsla(${f.hue + ring * 30},70%,55%,1)`;
                ctx.lineWidth = 1.2;

                ctx.beginPath();
                for (let s = 0; s <= f.sides; s++) {
                    const a = (Math.PI * 2 / f.sides) * s;
                    const px = Math.cos(a) * r;
                    const py = Math.sin(a) * r;
                    if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.stroke();
            }

            ctx.globalAlpha = f.alpha * 1.5;
            ctx.fillStyle = `hsla(${f.hue},80%,65%,1)`;
            ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();

            ctx.restore();
        }

        // Cosmic dust
        for (const f of this.floaters) {
            ctx.fillStyle = `hsla(${f.hue},60%,60%,${f.alpha})`;
            ctx.beginPath(); ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2); ctx.fill();
        }

        // Connecting lines between nearby fractals
        ctx.save();
        ctx.globalAlpha = 0.04;
        ctx.strokeStyle = '#ff44aa';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < this.fractals.length; i++) {
            const a = this.fractals[i];
            for (let j = i + 1; j < this.fractals.length; j++) {
                const b = this.fractals[j];
                const dx = a.x - b.x, dy = a.y - b.y;
                if (dx * dx + dy * dy < 25000) {
                    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
                }
            }
        }
        ctx.restore();
    }

    renderOverlay(ctx) {
        const pulse = 0.5 + 0.5 * Math.sin(this.time * 1.5);
        ctx.save();
        ctx.globalAlpha = 0.03 + pulse * 0.02;
        const cg = ctx.createRadialGradient(
            this.canvasWidth / 2, this.canvasHeight / 2, 10,
            this.canvasWidth / 2, this.canvasHeight / 2, this.canvasWidth * 0.5
        );
        cg.addColorStop(0, '#ff22aa');
        cg.addColorStop(1, 'transparent');
        ctx.fillStyle = cg;
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        ctx.restore();
    }
}
