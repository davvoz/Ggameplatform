/**
 * HiggsVacuumSector — Sector 4 (Levels 106-110)
 *
 * Higgs field wells that create visible gravity distortions.
 * Mass wells glow before activating, affecting player.
 */
import { QuantumSectorRenderer } from './QuantumSectorRenderer.js';

export class HiggsVacuumSector extends QuantumSectorRenderer {

    build() {
        const W = this.canvasWidth, H = this.canvasHeight;
        this.massWells = [];

        const wellCount = this.quality === 'low' ? 3 : 6;
        for (let i = 0; i < wellCount; i++) {
            this.massWells.push({
                x: (0.1 + Math.random() * 0.8) * W,
                y: (0.1 + Math.random() * 0.8) * H,
                radius: 30 + Math.random() * 50,
                depth: 0.5 + Math.random() * 0.5,
                pulsePhase: Math.random() * Math.PI * 2,
                pulseSpeed: 0.8 + Math.random() * 1.2,
                activeTimer: this.cooldown(10, 20),
                isActive: false,
                activeDuration: 0,
                fieldStrength: 0.3 + Math.random() * 0.7,
                scrollSpeed: 28 + Math.random() * 12
            });
        }
    }

    update(dt) {
        const H = this.canvasHeight, W = this.canvasWidth;
        for (const w of this.massWells) {
            w.y += w.scrollSpeed * dt;
            if (w.y > H + w.radius + 20) {
                w.y = -w.radius - 20;
                w.x = (0.1 + Math.random() * 0.8) * W;
            }
            w.pulsePhase += w.pulseSpeed * dt;
            const disactive = !w.isActive;
            if (disactive) {
                w.activeTimer -= dt;
                if (w.activeTimer < 1.5 && w.activeTimer > 0) {
                    w.depth = 0.5 + 0.5 * Math.sin(w.activeTimer * 8);
                }
                if (w.activeTimer <= 0) {
                    w.isActive = true;
                    w.activeDuration = 3 + Math.random() * 2;
                    this.spawnZone(w.x, w.y, w.radius * 2.5);
                }
            } else {
                w.activeDuration -= dt;
                if (w.activeDuration <= 0) {
                    w.isActive = false;
                    w.activeTimer = this.cooldown(12, 18);
                }
            }
        }
    }

    renderBg(ctx) {
        //nothing to do here — the parent class renders the quantum distortion background
    }
}
