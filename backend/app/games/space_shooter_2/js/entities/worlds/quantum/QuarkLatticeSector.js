/**
 * QuarkLatticeSector — Sector 1 (Levels 91-95)
 *
 * Colored quark nodes connected by gluon spring-lines.
 * Gluon bonds flash to indicate safe movement lanes.
 */
import { QuantumSectorRenderer } from './QuantumSectorRenderer.js';

export class QuarkLatticeSector extends QuantumSectorRenderer {

    build() {
        const W = this.canvasWidth, H = this.canvasHeight;
        this.latticeNodes = [];
        this.gluonBonds = [];

        const nodeCount = this.quality === 'low' ? 8 : 16;
        const cols = 4;
        const rows = Math.ceil(nodeCount / cols);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (this.latticeNodes.length >= nodeCount) break;
                const jitter = 20;
                this.latticeNodes.push({
                    x: (c + 0.5) / cols * W + (window.randomSecure() - 0.5) * jitter,
                    y: (r + 0.5) / rows * H + (window.randomSecure() - 0.5) * jitter,
                    baseX: (c + 0.5) / cols * W,
                    baseY: (r + 0.5) / rows * H,
                    colorIdx: Math.floor(window.randomSecure() * 3),
                    radius: 4 + window.randomSecure() * 4,
                    phase: window.randomSecure() * Math.PI * 2,
                    pulseSpeed: 1.5 + window.randomSecure() * 2,
                    scrollSpeed: 35
                });
            }
        }
        for (let i = 0; i < this.latticeNodes.length; i++) {
            for (let j = i + 1; j < this.latticeNodes.length; j++) {
                const a = this.latticeNodes[i], b = this.latticeNodes[j];
                const dist = Math.hypot(a.baseX - b.baseX, a.baseY - b.baseY);
                if (dist < W / cols * 1.5) {
                    this.gluonBonds.push({
                        from: i, to: j,
                        strength: 0.5 + window.randomSecure() * 0.5,
                        flashTimer: this.cooldown(8, 14),
                        flashing: false,
                        flashDuration: 0
                    });
                }
            }
        }
    }

    update(dt) {
        const H = this.canvasHeight, W = this.canvasWidth;
        for (const n of this.latticeNodes) {
            n.baseY += n.scrollSpeed * dt;
            if (n.baseY > H + 30) {
                n.baseY = -30;
                n.baseX = (0.1 + window.randomSecure() * 0.8) * W;
            }
            n.phase += n.pulseSpeed * dt;
            n.x = n.baseX + Math.sin(n.phase) * 8;
            n.y = n.baseY + Math.cos(n.phase * 0.7) * 6;
        }
        for (const b of this.gluonBonds) {
            if (b.flashing) {
                b.flashDuration -= dt;
                if (b.flashDuration <= 0) b.flashing = false;
            } else {
                b.flashTimer -= dt;
                if (b.flashTimer <= 0) {
                    b.flashing = true;
                    b.flashDuration = 0.8;
                    b.flashTimer = this.cooldown(10, 16);
                    const a = this.latticeNodes[b.from];
                    const c = this.latticeNodes[b.to];
                    this.spawnZone((a.x + c.x) / 2, (a.y + c.y) / 2, 70);
                }
            }
        }
    }

    renderBg(ctx) {}
}
