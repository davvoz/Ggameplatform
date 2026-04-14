/**
 * AntimatterRiftSector — Sector 5 (Levels 111-115)
 *
 * Particle-antiparticle pairs flash into existence
 * and annihilate with bright flashes. Warns of danger.
 */
import { QuantumSectorRenderer } from './QuantumSectorRenderer.js';

export class AntimatterRiftSector extends QuantumSectorRenderer {

    build() {
        const W = this.canvasWidth, H = this.canvasHeight;
        this.pairParticles = [];

        const pairCount = this.quality === 'low' ? 5 : 10;
        for (let i = 0; i < pairCount; i++) {
            const cx = Math.random() * W;
            const cy = Math.random() * H;
            this.pairParticles.push({
                cx, cy,
                separation: 8 + Math.random() * 15,
                angle: Math.random() * Math.PI * 2,
                rotSpeed: 2 + Math.random() * 3,
                size: 2 + Math.random() * 2,
                lifePhase: Math.random() * Math.PI * 2,
                lifeSpeed: 0.3 + Math.random() * 0.5,
                annihilateTimer: this.cooldown(8, 18),
                annihilating: false,
                annihilateDuration: 0,
                driftSpeed: 3 + Math.random() * 5
            });
        }
    }

    update(dt) {
        const W = this.canvasWidth, H = this.canvasHeight;
        for (const p of this.pairParticles) {
            p.angle += p.rotSpeed * dt;
            p.lifePhase += p.lifeSpeed * dt;
            p.cy += p.driftSpeed * dt;
            if (p.cy > H + 20) {
                p.cy = -20;
                p.cx = Math.random() * W;
            }
            const notAnnihilating = !p.annihilating;
            if (notAnnihilating) {
                p.annihilateTimer -= dt;
                if (p.annihilateTimer <= 0) {
                    p.annihilating = true;
                    p.annihilateDuration = 0.4;
                    this.spawnZone(p.cx, p.cy, 60 + p.separation);
                }
            } else {
                p.annihilateDuration -= dt;
                if (p.annihilateDuration <= 0) {
                    p.annihilating = false;
                    p.annihilateTimer = this.cooldown(10, 16);
                    p.cx = Math.random() * W;
                    p.cy = Math.random() * H;
                }
            }
        }
    }

    renderBg(ctx) {
        //nothing to do here — the parent class renders the quantum distortion background
    }
}
