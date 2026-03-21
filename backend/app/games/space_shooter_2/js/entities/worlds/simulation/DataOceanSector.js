/**
 * DataOceanSector — Sector 3 (Levels 71-75)
 *
 * Neon wireframe waves, circuit islands, teal deep-ocean aesthetic.
 */
import { SimulationSectorRenderer } from './SimulationSectorRenderer.js';

export class DataOceanSector extends SimulationSectorRenderer {

    build() {
        this.wavePoints = [];
        this.floaters = [];

        const cols = Math.floor(this.canvasWidth / 20) + 2;
        for (let layer = 0; layer < 2; layer++) {
            const row = [];
            for (let c = 0; c < cols; c++) {
                row.push({ x: c * 20, baseY: 0, phase: c * 0.3 + layer * 2 });
            }
            this.wavePoints.push(row);
        }

        const islandCount = this.quality === 'low' ? 4 : 8;
        for (let i = 0; i < islandCount; i++) {
            this.floaters.push({
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight,
                w: 20 + Math.random() * 40,
                h: 12 + Math.random() * 25,
                speed: 5 + Math.random() * 10,
                hue: 180 + Math.random() * 30,
                alpha: 0.1 + Math.random() * 0.12
            });
        }
    }

    update(dt) {
        for (const f of this.floaters) {
            f.y += f.speed * dt;
            if (f.y > this.canvasHeight + 30) { f.y = -30; f.x = Math.random() * this.canvasWidth; }
        }
    }

    renderBg(ctx) {
        const W = this.canvasWidth, H = this.canvasHeight;

        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, '#020d0d');
        grad.addColorStop(0.4, '#041815');
        grad.addColorStop(1, '#020f0c');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // Wireframe waves
        for (let li = 0; li < this.wavePoints.length; li++) {
            const row = this.wavePoints[li];
            const baseY = H * (0.35 + li * 0.25);
            const amp = 18 + li * 8;
            const alpha = 0.12 - li * 0.03;

            ctx.strokeStyle = `hsla(${175 + li * 15},80%,55%,${alpha})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            for (let c = 0; c < row.length; c++) {
                const pt = row[c];
                const y = baseY + Math.sin(this.time * 1.2 + pt.phase) * amp;
                if (c === 0) ctx.moveTo(pt.x, y); else ctx.lineTo(pt.x, y);
            }
            ctx.stroke();

            if (this.quality !== 'low') {
                ctx.strokeStyle = `hsla(${175 + li * 15},60%,40%,${alpha * 0.3})`;
                ctx.lineWidth = 0.5;
                for (let c = 0; c < row.length; c += 3) {
                    const pt = row[c];
                    const y = baseY + Math.sin(this.time * 1.2 + pt.phase) * amp;
                    ctx.beginPath();
                    ctx.moveTo(pt.x, y);
                    ctx.lineTo(pt.x, y + 60 + li * 30);
                    ctx.stroke();
                }
            }
        }

        // Circuit islands
        for (const f of this.floaters) {
            ctx.save();
            ctx.globalAlpha = f.alpha;
            ctx.strokeStyle = `hsla(${f.hue},70%,55%,0.8)`;
            ctx.lineWidth = 1;
            ctx.strokeRect(f.x, f.y, f.w, f.h);
            ctx.strokeStyle = `hsla(${f.hue},60%,45%,0.4)`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(f.x + 3, f.y + f.h / 2);
            ctx.lineTo(f.x + f.w - 3, f.y + f.h / 2);
            ctx.moveTo(f.x + f.w / 2, f.y + 3);
            ctx.lineTo(f.x + f.w / 2, f.y + f.h - 3);
            ctx.stroke();
            ctx.fillStyle = `hsla(${f.hue},80%,65%,0.6)`;
            for (const [ox, oy] of [[3,3],[f.w-3,3],[3,f.h-3],[f.w-3,f.h-3]]) {
                ctx.beginPath(); ctx.arc(f.x + ox, f.y + oy, 1.5, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }
    }

    renderOverlay(ctx) {
        ctx.save();
        ctx.globalAlpha = 0.04;
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            const y = (this.time * 15 + i * 70) % this.canvasHeight;
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.canvasWidth, y); ctx.stroke();
        }
        ctx.restore();
    }
}
