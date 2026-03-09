/**
 * VirusCoreSector — Sector 4 (Levels 76-80)
 *
 * Red infection tendrils, pulsing nodes, floating infection particles.
 */
import { SimulationSectorRenderer } from './SimulationSectorRenderer.js';

export class VirusCoreSector extends SimulationSectorRenderer {

    build() {
        this.tendrils = [];
        this.floaters = [];

        const nodeCount = this.quality === 'low' ? 5 : 10;
        for (let i = 0; i < nodeCount; i++) {
            this.tendrils.push({
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight,
                radius: 3 + Math.random() * 6,
                pulsePhase: Math.random() * Math.PI * 2,
                speed: 6 + Math.random() * 10,
                connections: []
            });
        }

        for (let i = 0; i < (this.quality === 'low' ? 8 : 16); i++) {
            this.floaters.push({
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight,
                size: 2 + Math.random() * 4,
                speed: 10 + Math.random() * 15,
                alpha: 0.1 + Math.random() * 0.15,
                wobble: Math.random() * Math.PI * 2
            });
        }
    }

    update(dt) {
        for (const n of this.tendrils) {
            n.y += n.speed * dt;
            if (n.y > this.canvasHeight + 10) { n.y = -10; n.x = Math.random() * this.canvasWidth; }
        }
        for (const f of this.floaters) {
            f.y += f.speed * dt;
            f.x += Math.sin(this.time * 2 + f.wobble) * 15 * dt;
            if (f.y > this.canvasHeight + 5) { f.y = -5; f.x = Math.random() * this.canvasWidth; }
        }
    }

    renderBg(ctx) {
        const W = this.canvasWidth, H = this.canvasHeight;

        const grad = ctx.createRadialGradient(W / 2, H / 2, 30, W / 2, H / 2, W * 0.7);
        grad.addColorStop(0, '#1a0505');
        grad.addColorStop(0.5, '#0d0202');
        grad.addColorStop(1, '#050101');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // Connection tendrils between nearby nodes
        ctx.strokeStyle = 'rgba(255,40,40,0.08)';
        ctx.lineWidth = 1;
        for (let i = 0; i < this.tendrils.length; i++) {
            const a = this.tendrils[i];
            for (let j = i + 1; j < this.tendrils.length; j++) {
                const b = this.tendrils[j];
                const dx = a.x - b.x, dy = a.y - b.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    ctx.globalAlpha = (1 - dist / 120) * 0.15;
                    ctx.beginPath();
                    const mx = (a.x + b.x) / 2 + Math.sin(this.time + i) * 8;
                    const my = (a.y + b.y) / 2 + Math.cos(this.time + j) * 8;
                    ctx.moveTo(a.x, a.y);
                    ctx.quadraticCurveTo(mx, my, b.x, b.y);
                    ctx.stroke();
                }
            }
            ctx.globalAlpha = 1;
        }

        // Pulsating nodes
        for (const n of this.tendrils) {
            const pulse = 1 + 0.3 * Math.sin(this.time * 3 + n.pulsePhase);
            const r = n.radius * pulse;
            ctx.save();
            ctx.globalAlpha = 0.12;
            ctx.fillStyle = '#ff2222';
            ctx.beginPath(); ctx.arc(n.x, n.y, r * 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
            ctx.fillStyle = `rgba(255,${60 + Math.floor(pulse * 30)},30,0.7)`;
            ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(255,100,50,0.4)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Floating infection particles
        for (const f of this.floaters) {
            ctx.fillStyle = `rgba(255,50,30,${f.alpha})`;
            ctx.beginPath(); ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2); ctx.fill();
        }
    }

    renderOverlay(ctx) {
        const pulse = 0.5 + 0.5 * Math.sin(this.time * 2);
        ctx.save();
        ctx.globalAlpha = 0.03 + pulse * 0.02;
        ctx.strokeStyle = '#ff2244';
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, this.canvasWidth - 4, this.canvasHeight - 4);
        ctx.restore();
    }
}
