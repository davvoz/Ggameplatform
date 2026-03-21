/**
 * UnifiedFieldSector — Sector 6 (Levels 116-120)
 *
 * All forces merge: Feynman diagrams form in background.
 * Vertices pulse before field shifts affect gameplay.
 */
import { QuantumSectorRenderer } from './QuantumSectorRenderer.js';

export class UnifiedFieldSector extends QuantumSectorRenderer {

    build() {
        const W = this.canvasWidth, H = this.canvasHeight;
        this.feynmanVerts = [];
        this.feynmanLines = [];

        const vertCount = this.quality === 'low' ? 6 : 12;
        for (let i = 0; i < vertCount; i++) {
            this.feynmanVerts.push({
                x: (0.1 + Math.random() * 0.8) * W,
                y: (0.1 + Math.random() * 0.8) * H,
                type: ['vertex', 'loop', 'propagator'][Math.floor(Math.random() * 3)],
                active: false,
                timer: this.cooldown(8, 16),
                pulsePhase: Math.random() * Math.PI * 2,
                colorIdx: Math.floor(Math.random() * 4),
                scrollSpeed: 32 + Math.random() * 12
            });
        }
        for (let i = 0; i < this.feynmanVerts.length; i++) {
            for (let j = i + 1; j < this.feynmanVerts.length; j++) {
                const a = this.feynmanVerts[i], b = this.feynmanVerts[j];
                const dist = Math.hypot(a.x - b.x, a.y - b.y);
                if (dist < W * 0.4 && Math.random() < 0.4) {
                    this.feynmanLines.push({
                        from: i, to: j,
                        type: ['straight', 'wavy', 'dashed'][Math.floor(Math.random() * 3)],
                        colorIdx: Math.floor(Math.random() * 4)
                    });
                }
            }
        }
    }

    update(dt) {
        const H = this.canvasHeight, W = this.canvasWidth;
        for (const v of this.feynmanVerts) {
            v.y += v.scrollSpeed * dt;
            if (v.y > H + 30) {
                v.y = -30;
                v.x = (0.1 + Math.random() * 0.8) * W;
            }
            v.pulsePhase += dt * 2;
            if (!v.active) {
                v.timer -= dt;
                if (v.timer <= 0) {
                    v.active = true;
                    v.timer = 1.5 + Math.random() * 2;
                    this.spawnZone(v.x, v.y, 85);
                }
            } else {
                v.timer -= dt;
                if (v.timer <= 0) {
                    v.active = false;
                    v.timer = this.cooldown(10, 16);
                }
            }
        }
    }

    renderBg(ctx) {}
}
