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
            const cx = window.randomSecure() * W;
            const cy = window.randomSecure() * H;
            this.pairParticles.push({
                cx, cy,
                separation: 8 + window.randomSecure() * 15,
                angle: window.randomSecure() * Math.PI * 2,
                rotSpeed: 2 + window.randomSecure() * 3,
                size: 2 + window.randomSecure() * 2,
                lifePhase: window.randomSecure() * Math.PI * 2,
                lifeSpeed: 0.3 + window.randomSecure() * 0.5,
                annihilateTimer: this.cooldown(8, 18),
                annihilating: false,
                annihilateDuration: 0,
                driftSpeed: 3 + window.randomSecure() * 5
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
                p.cx = window.randomSecure() * W;
            }
            if (!p.annihilating) {
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
                    p.cx = window.randomSecure() * W;
                    p.cy = window.randomSecure() * H;
                }
            }
        }
    }

    renderBg(ctx) {}
}
