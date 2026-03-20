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
            const particleCount = 4 + Math.floor(window.randomSecure() * 6);
            const baseX = window.randomSecure() * W;
            const angle = -Math.PI / 2 + (window.randomSecure() - 0.5) * 0.6;
            for (let p = 0; p < particleCount; p++) {
                particles.push({
                    offset: p * 15,
                    size: 1.5 + window.randomSecure() * 2,
                    alpha: 0.3 - p * 0.03
                });
            }
            this.forceStreams.push({
                x: baseX, y: window.randomSecure() * H,
                angle, speed: 40 + window.randomSecure() * 60,
                colorIdx: Math.floor(window.randomSecure() * 4),
                particles,
                waveAmp: 10 + window.randomSecure() * 20,
                waveFreq: 2 + window.randomSecure() * 3,
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
                s.x = window.randomSecure() * this.canvasWidth;
            }
            if (!s.flashing) {
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

    renderBg(ctx) {}
}
