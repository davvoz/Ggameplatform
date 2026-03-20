/**
 * LeptonFieldSector — Sector 2 (Levels 96-100)
 *
 * Bohr atom orbital rings with pulsing electron paths.
 * Orbital rings pulse to indicate energy zones.
 */
import { QuantumSectorRenderer } from './QuantumSectorRenderer.js';

export class LeptonFieldSector extends QuantumSectorRenderer {

    build() {
        const W = this.canvasWidth, H = this.canvasHeight;
        this.orbitals = [];

        const atomCount = this.quality === 'low' ? 3 : 5;
        for (let i = 0; i < atomCount; i++) {
            const cx = (0.15 + window.randomSecure() * 0.7) * W;
            const cy = (0.15 + window.randomSecure() * 0.7) * H;
            const shellCount = 2 + Math.floor(window.randomSecure() * 2);
            const shells = [];
            for (let s = 0; s < shellCount; s++) {
                const r = 30 + s * 25 + window.randomSecure() * 15;
                const electronCount = 1 + Math.floor(window.randomSecure() * 3);
                const electrons = [];
                for (let el = 0; el < electronCount; el++) {
                    electrons.push({
                        angle: (Math.PI * 2 / electronCount) * el + window.randomSecure() * 0.3,
                        speed: 1.5 + window.randomSecure() * 2
                    });
                }
                shells.push({ radius: r, electrons, tilt: window.randomSecure() * 0.4 - 0.2 });
            }
            this.orbitals.push({
                cx, cy, shells,
                nucleusSize: 3 + window.randomSecure() * 3,
                colorIdx: Math.floor(window.randomSecure() * 3),
                pulsePhase: window.randomSecure() * Math.PI * 2,
                pulseSpeed: 0.5 + window.randomSecure(),
                scrollSpeed: 30 + window.randomSecure() * 15,
                zoneCooldown: this.cooldown(6, 10)
            });
        }
    }

    update(dt) {
        const H = this.canvasHeight, W = this.canvasWidth;
        for (const atom of this.orbitals) {
            atom.cy += atom.scrollSpeed * dt;
            const maxR = atom.shells.length ? atom.shells[atom.shells.length - 1].radius : 40;
            if (atom.cy > H + maxR + 10) {
                atom.cy = -maxR - 10;
                atom.cx = (0.1 + window.randomSecure() * 0.8) * W;
            }
            atom.pulsePhase += atom.pulseSpeed * dt;
            for (const shell of atom.shells) {
                for (const el of shell.electrons) {
                    el.angle += el.speed * dt;
                }
            }
            // Spawn a single boost zone per atom, with cooldown to prevent spam
            atom.zoneCooldown -= dt;
            if (atom.zoneCooldown <= 0 && Math.sin(atom.pulsePhase) > 0.95) {
                // Max 2 active zones at any time
                if (this.activeZones.length < 2) {
                    const r = atom.shells[atom.shells.length - 1].radius + 40;
                    this.spawnZone(atom.cx, atom.cy, r);
                }
                atom.zoneCooldown = this.cooldown(10, 16);
            }
        }
    }

    renderBg(ctx) {}
}
