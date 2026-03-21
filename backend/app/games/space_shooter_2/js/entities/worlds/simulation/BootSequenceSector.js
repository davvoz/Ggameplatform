/**
 * BootSequenceSector — Sector 1 (Levels 61-65)
 *
 * Retro terminal with scrolling code lines, CRT glow, blinking cursor.
 */
import { SimulationSectorRenderer } from './SimulationSectorRenderer.js';

export class BootSequenceSector extends SimulationSectorRenderer {

    build() {
        this.floaters = [];
        const lineCount = this.quality === 'low' ? 12 : 20;
        const words = ['LOAD','SYS','INIT','0x0F','BOOT','MEM','OK','ERR','>>','RUN','DATA','SCAN','CPU','I/O'];
        for (let i = 0; i < lineCount; i++) {
            let txt = '> ';
            const wc = 2 + Math.floor(Math.random() * 4);
            for (let w = 0; w < wc; w++) txt += words[Math.floor(Math.random() * words.length)] + ' ';
            this.floaters.push({
                x: 8 + Math.random() * (this.canvasWidth * 0.7),
                y: Math.random() * this.canvasHeight,
                text: txt,
                speed: 12 + Math.random() * 14,
                alpha: 0.15 + Math.random() * 0.2,
                hue: 140 + Math.random() * 30
            });
        }
    }

    update(dt) {
        for (const f of this.floaters) {
            f.y += f.speed * dt;
            if (f.y > this.canvasHeight + 16) { f.y = -16; f.x = 8 + Math.random() * (this.canvasWidth * 0.7); }
        }
    }

    renderBg(ctx) {
        const grad = ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
        grad.addColorStop(0, '#020a04');
        grad.addColorStop(0.5, '#041208');
        grad.addColorStop(1, '#020a04');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        ctx.font = '10px monospace';
        for (const f of this.floaters) {
            ctx.fillStyle = `hsla(${f.hue},80%,50%,${f.alpha})`;
            ctx.fillText(f.text, f.x, f.y);
        }

        if (Math.sin(this.time * 4) > 0) {
            ctx.fillStyle = 'rgba(0,255,100,0.6)';
            ctx.fillRect(10, this.canvasHeight - 20, 8, 14);
        }
    }

    renderOverlay(ctx) {
        ctx.save();
        ctx.strokeStyle = 'rgba(0,255,100,0.08)';
        ctx.lineWidth = 3;
        ctx.strokeRect(4, 4, this.canvasWidth - 8, this.canvasHeight - 8);
        const glow = ctx.createLinearGradient(0, this.canvasHeight - 40, 0, this.canvasHeight);
        glow.addColorStop(0, 'rgba(0,255,80,0)');
        glow.addColorStop(1, 'rgba(0,255,80,0.04)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, this.canvasHeight - 40, this.canvasWidth, 40);
        ctx.restore();
    }
}
