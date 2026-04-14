/**
 * BosonConduitSector — Sector 3 (Levels 101-105)
 *
 * Streaming force carrier particles with glowing trails.
 * Force lines telegraph enemy spawn directions.
 */
import { QuantumSectorRenderer } from './QuantumSectorRenderer.js';

export class BosonConduitSector extends QuantumSectorRenderer {

    build() {
        const W = this.canvasWidth, H = this.canvasHeight;
        this.forceStreams = [];

        const streamCount = this.quality === 'low' ? 5 : 10;
        for (let i = 0; i < streamCount; i++) {
            const particles = [];
            const particleCount = 4 + Math.floor(Math.random() * 6);
            const baseX = Math.random() * W;
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
            for (let p = 0; p < particleCount; p++) {
                particles.push({
                    offset: p * 15,
                    size: 1.5 + Math.random() * 2,
                    alpha: 0.3 - p * 0.03
                });
            }
            this.forceStreams.push({
                x: baseX, y: Math.random() * H,
                angle, speed: 40 + Math.random() * 60,
                colorIdx: Math.floor(Math.random() * 4),
                particles,
                waveAmp: 10 + Math.random() * 20,
                waveFreq: 2 + Math.random() * 3,
                flashTimer: this.cooldown(10, 18),
                flashing: false
            });
        }
    }

    update(dt) {
        const H = this.canvasHeight;
        for (const s of this.forceStreams) {
            s.y += s.speed * dt;
            if (s.y > H + 50) {
                s.y = -50;
                s.x = Math.random() * this.canvasWidth;
            }
            const notFlashing = !s.flashing;
            if (notFlashing) {
                s.flashTimer -= dt;
                if (s.flashTimer <= 0) {
                    s.flashing = true;
                    s.flashTimer = 0.5;
                    this.spawnZone(s.x, s.y, 55);
                }
            } else {
                s.flashTimer -= dt;
                if (s.flashTimer <= 0) {
                    s.flashing = false;
                    s.flashTimer = this.cooldown(10, 16);
                }
            }
        }
    }

    renderBg(ctx) {
        //nothing to do here — the parent class renders the quantum distortion background
    }
}
