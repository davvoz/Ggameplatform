/**
 * CorruptedZoneSector — Sector 2 (Levels 66-70)
 *
 * Floating pixel blocks, purple static clouds, cracked fragments.
 */
import { SimulationSectorRenderer } from './SimulationSectorRenderer.js';

export class CorruptedZoneSector extends SimulationSectorRenderer {

    build() {
        this.floaters = [];
        const count = this.quality === 'low' ? 15 : 30;
        for (let i = 0; i < count; i++) {
            this.floaters.push({
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight,
                size: 4 + Math.random() * 16,
                speed: 8 + Math.random() * 18,
                rotSpeed: (Math.random() - 0.5) * 2,
                rot: Math.random() * Math.PI * 2,
                hue: 260 + Math.random() * 50,
                alpha: 0.12 + Math.random() * 0.18,
                broken: Math.random() < 0.4
            });
        }
    }

    update(dt) {
        for (const f of this.floaters) {
            f.y += f.speed * dt;
            f.rot += f.rotSpeed * dt;
            if (f.y > this.canvasHeight + 20) {
                f.y = -20; f.x = Math.random() * this.canvasWidth;
                f.size = 4 + Math.random() * 16;
            }
        }
    }

    renderBg(ctx) {
        const grad = ctx.createLinearGradient(0, 0, this.canvasWidth * 0.3, this.canvasHeight);
        grad.addColorStop(0, '#08030f');
        grad.addColorStop(0.5, '#0c0618');
        grad.addColorStop(1, '#06020c');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        for (const f of this.floaters) {
            ctx.save();
            ctx.translate(f.x, f.y);
            ctx.rotate(f.rot);
            ctx.globalAlpha = f.alpha;

            ctx.fillStyle = `hsla(${f.hue},60%,40%,1)`;
            ctx.fillRect(-f.size / 2, -f.size / 2, f.size, f.size);
            ctx.strokeStyle = `hsla(${f.hue},70%,60%,0.6)`;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(-f.size / 2, -f.size / 2, f.size, f.size);

            if (f.broken && f.size > 8) {
                ctx.strokeStyle = `hsla(${f.hue + 40},80%,70%,0.5)`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-f.size * 0.3, -f.size * 0.4);
                ctx.lineTo(f.size * 0.1, f.size * 0.2);
                ctx.lineTo(f.size * 0.35, f.size * 0.4);
                ctx.stroke();
            }
            ctx.restore();
        }

        if (this.quality !== 'low') {
            ctx.save();
            ctx.globalAlpha = 0.04 + this.intensity * 0.03;
            for (let i = 0; i < 5; i++) {
                const nx = Math.trunc((Math.sin(this.time * 1.3 + i * 7) * 0.5 + 0.5) * this.canvasWidth);
                const ny = Math.trunc((Math.cos(this.time * 0.9 + i * 4) * 0.5 + 0.5) * this.canvasHeight);
                const nw = 30 + Math.random() * 50;
                const nh = 20 + Math.random() * 30;
                ctx.fillStyle = `hsla(280,40%,50%,0.3)`;
                ctx.fillRect(nx, ny, nw, nh);
            }
            ctx.restore();
        }
    }

    renderOverlay(ctx) {
        ctx.save();
        ctx.globalAlpha = 0.06;
        const edgeGrad = ctx.createLinearGradient(0, 0, 60, 0);
        edgeGrad.addColorStop(0, '#8833ff');
        edgeGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = edgeGrad;
        ctx.fillRect(0, 0, 60, this.canvasHeight);
        const edgeGrad2 = ctx.createLinearGradient(this.canvasWidth, 0, this.canvasWidth - 60, 0);
        edgeGrad2.addColorStop(0, '#8833ff');
        edgeGrad2.addColorStop(1, 'transparent');
        ctx.fillStyle = edgeGrad2;
        ctx.fillRect(this.canvasWidth - 60, 0, 60, this.canvasHeight);
        ctx.restore();
    }
}
