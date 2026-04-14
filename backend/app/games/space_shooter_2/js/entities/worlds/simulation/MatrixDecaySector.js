/**
 * MatrixDecaySector — Sector 5 (Levels 81-85)
 *
 * Falling code rain (katakana chars), dissolving cubes.
 */
import { SimulationSectorRenderer } from './SimulationSectorRenderer.js';

export class MatrixDecaySector extends SimulationSectorRenderer {

    build() {
        this.codeColumns = [];
        this.floaters = [];

        const cols = Math.floor(this.canvasWidth / 14);
        for (let c = 0; c < cols; c++) {
            const col = {
                x: c * 14 + 7,
                y: Math.random() * this.canvasHeight,
                speed: 40 + Math.random() * 60,
                length: 5 + Math.floor(Math.random() * 12),
                chars: [],
                changeTimer: 0
            };
            new Array(col.length).fill(0).forEach(() => {
                col.chars.push(String.fromCodePoint(0x30A0 + Math.floor(Math.random() * 96)));
            });
            this.codeColumns.push(col);
        }

        const cubeCount = this.quality === 'low' ? 6 : 12;
        for (let i = 0; i < cubeCount; i++) {
            this.floaters.push({
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight,
                size: 6 + Math.random() * 14,
                speed: 5 + Math.random() * 12,
                dissolve: Math.random(),
                dissolveSpeed: 0.1 + Math.random() * 0.15,
                rot: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 1.5,
                hue: 100 + Math.random() * 40
            });
        }
    }

    update(dt) {
        for (const col of this.codeColumns) {
            col.y += col.speed * dt;
            if (col.y > this.canvasHeight + col.length * 14) {
                col.y = -col.length * 14;
                col.speed = 40 + Math.random() * 60;
            }
            col.changeTimer += dt;
            if (col.changeTimer > 0.15) {
                col.changeTimer = 0;
                const idx = Math.floor(Math.random() * col.chars.length);
                col.chars[idx] = String.fromCodePoint(0x30A0 + Math.floor(Math.random() * 96));
            }
        }
        for (const f of this.floaters) {
            f.y += f.speed * dt;
            f.rot += f.rotSpeed * dt;
            f.dissolve += f.dissolveSpeed * dt;
            if (f.dissolve > 1.2 || f.y > this.canvasHeight + 20) {
                f.y = -20; f.x = Math.random() * this.canvasWidth;
                f.dissolve = 0; f.size = 6 + Math.random() * 14;
            }
        }
    }

    renderBg(ctx) {
        ctx.fillStyle = '#020802';
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        // Matrix code rain
        ctx.font = '12px monospace';
        for (const col of this.codeColumns) {
            for (let i = 0; i < col.chars.length; i++) {
                const cy = col.y + i * 14;
                if (cy < -14 || cy > this.canvasHeight + 14) continue;
                const fade = i / col.chars.length;
                const isHead = i === 0;
                ctx.fillStyle = isHead
                    ? 'rgba(180,255,180,0.7)'
                    : `rgba(0,${180 - Math.floor(fade * 100)},0,${0.3 - fade * 0.2})`;
                ctx.fillText(col.chars[i], col.x, cy);
            }
        }

        // Dissolving cubes
        for (const f of this.floaters) {
            if (f.dissolve >= 1) continue;
            ctx.save();
            ctx.translate(f.x, f.y);
            ctx.rotate(f.rot);
            ctx.globalAlpha = (1 - f.dissolve) * 0.35;
            const s = f.size * (1 - f.dissolve * 0.3);
            ctx.strokeStyle = `hsla(${f.hue},60%,50%,0.8)`;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(-s / 2, -s / 2, s, s);
            if (f.dissolve < 0.5) {
                ctx.globalAlpha = (0.5 - f.dissolve) * 0.4;
                ctx.fillStyle = `hsla(${f.hue},50%,40%,1)`;
                const is = s * 0.5;
                ctx.fillRect(-is / 2, -is / 2, is, is);
            }
            if (f.dissolve > 0.3) {
                ctx.globalAlpha = (f.dissolve - 0.3) * 0.5;
                ctx.fillStyle = `hsla(${f.hue},70%,55%,0.6)`;
                for (let p = 0; p < 4; p++) {
                    const px = (Math.sin(this.time * 3 + p * 1.5) * s * f.dissolve);
                    const py = (Math.cos(this.time * 2.5 + p * 2) * s * f.dissolve);
                    ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI * 2); ctx.fill();
                }
            }
            ctx.restore();
        }
    }

    renderOverlay(ctx) {
        ctx.save();
        ctx.globalAlpha = 0.02;
        ctx.fillStyle = '#00ff44';
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        ctx.restore();
    }
}
