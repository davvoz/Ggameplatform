import { C_WHITE } from '../LevelsThemes.js';
/**
 * QuantumWorldRenderer — World 4 (Levels 91-120)
 *
 * "Quantum Realm" — Standard Model of particle physics.
 * Thin hub that delegates to 6 sector sub-renderers in quantum/.
 *
 *   Sector 1 (91-95)   "Quark Lattice"     — QuarkLatticeSector
 *   Sector 2 (96-100)  "Lepton Fields"     — LeptonFieldSector
 *   Sector 3 (101-105) "Boson Conduit"     — BosonConduitSector
 *   Sector 4 (106-110) "Higgs Vacuum"      — HiggsVacuumSector
 *   Sector 5 (111-115) "Antimatter Rift"   — AntimatterRiftSector
 *   Sector 6 (116-120) "Unified Field"     — UnifiedFieldSector
 */
import { WorldRenderer } from './WorldRenderer.js';
import { QuarkLatticeSector } from './quantum/QuarkLatticeSector.js';
import { LeptonFieldSector } from './quantum/LeptonFieldSector.js';
import { BosonConduitSector } from './quantum/BosonConduitSector.js';
import { HiggsVacuumSector } from './quantum/HiggsVacuumSector.js';
import { AntimatterRiftSector } from './quantum/AntimatterRiftSector.js';
import { UnifiedFieldSector } from './quantum/UnifiedFieldSector.js';

const FX_LAYER_ORDER = {
    quantumField: 0, feynmanLine: 1, particleTrail: 2, decayProduct: 3, vacuumBubble: 4
};

function _sector(energy) {
    if (energy <= 0.2) return 1;
    if (energy <= 0.4) return 2;
    if (energy <= 0.6) return 3;
    if (energy <= 0.8) return 4;
    if (energy <= 0.92) return 5;
    return 6;
}

const SECTOR_CLASSES = {
    1: QuarkLatticeSector,
    2: LeptonFieldSector,
    3: BosonConduitSector,
    4: HiggsVacuumSector,
    5: AntimatterRiftSector,
    6: UnifiedFieldSector
};

export class QuantumWorldRenderer extends WorldRenderer {
    constructor(canvasWidth, canvasHeight, quality) {
        super(canvasWidth, canvasHeight, quality);
        this.energy = 0;
        this.sector = 1;
        this.time = 0;
        this.fieldHue = 240;
        this._sectorRenderer = null;

        // Active background state (exposed for gameplay interaction)
        this.activeZones = [];

        // Player position (for gameplay zone interaction)
        this.playerX = 0;
        this.playerY = 0;
    }

    /** Called each frame by BackgroundFacade with fresh player data. */
    setPlayerInfo(x, y) {
        this.playerX = x;
        this.playerY = y;
    }

    // ── lifecycle ──────────────────────────────────

    build(theme, level) {
        const qc = (theme?.quantumConfig) || {};
        this.energy = qc.energy || 0;
        this.fieldHue = qc.fieldHue || 240;
        this.sector = _sector(this.energy);
        this.activeZones = [];

        const SectorClass = SECTOR_CLASSES[this.sector];
        this._sectorRenderer = new SectorClass(
            this.canvasWidth, this.canvasHeight, this.quality, this.activeZones, level || 91
        );
        this._sectorRenderer.build();
    }


    update(dt) {
        this.time += dt;

        // Update active zones (decay)
        for (let i = this.activeZones.length - 1; i >= 0; i--) {
            this.activeZones[i].timer -= dt;
            if (this.activeZones[i].timer <= 0) this.activeZones.splice(i, 1);
        }

        if (this._sectorRenderer) this._sectorRenderer.update(dt);
    }

    renderBackground(ctx, time) {
        if (this._sectorRenderer) this._sectorRenderer.renderBg(ctx);
    }

    renderFx(ctx, fxParticles, time) {
        this._renderFxSorted(ctx, fxParticles, FX_LAYER_ORDER);
    }

    renderOverlay(ctx, time) {
        this._renderActiveZones(ctx);
    }

    renderPostFx(ctx) {
        //keeping this empty to disable default post-FX rendering (e.g. planet glows) since Quantum World doesn't use it
    }

    // ════════════════════════════════════════════════
    //  SHARED RENDERERS
    // ════════════════════════════════════════════════

    _renderActiveZones(ctx) {
        const t = this.time;
        for (const z of this.activeZones) {
            ctx.save();
            const fade = Math.min(1, z.timer / 2);

            if (z.type === 'info') {
                this._renderBoostZone(ctx, z, t, fade);
            } else {
                this._renderStandardZone(ctx, z, t, fade);
            }

            ctx.restore();
        }
    }

    // ── Boost zone: rotating hex energy field ──────
    _renderBoostZone(ctx, z, t, fade) {
        const SIDES = 6;
        const rot = t * 0.4;               // slow rotation
        const breath = 1 + 0.04 * Math.sin(t * 2.5);  // gentle breathing
        const r = z.radius * breath;
        const a0 = z.intensity * fade;

        // Hex path helper
        const hexPath = (cx, cy, radius, rotation) => {
            ctx.beginPath();
            for (let i = 0; i <= SIDES; i++) {
                const angle = rotation + (Math.PI * 2 / SIDES) * i;
                const px = cx + Math.cos(angle) * radius;
                const py = cy + Math.sin(angle) * radius;
                i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath();
        };

        // Outer faint fill
        ctx.globalAlpha = a0 * 0.1;
        hexPath(z.x, z.y, r, rot);
        ctx.fillStyle = 'rgba(80,180,255,0.25)';
        ctx.fill();

        // Inner brighter hex
        ctx.globalAlpha = a0 * 0.14;
        hexPath(z.x, z.y, r * 0.65, -rot * 0.6);
        ctx.fillStyle = 'rgba(120,210,255,0.3)';
        ctx.fill();

        // Animated border — solid hex outline
        ctx.globalAlpha = a0 * 0.55;
        ctx.strokeStyle = '#60c8ff';
        ctx.lineWidth = 1.5;
        hexPath(z.x, z.y, r * 0.97, rot);
        ctx.stroke();

        // Second counter-rotating hex border (thin)
        ctx.globalAlpha = a0 * 0.25;
        ctx.strokeStyle = '#a0dcff';
        ctx.lineWidth = 1;
        hexPath(z.x, z.y, r * 0.78, -rot * 0.6);
        ctx.stroke();

        // Corner nodes on outer hex
        ctx.globalAlpha = a0 * 0.5;
        ctx.fillStyle = '#80d8ff';
        for (let i = 0; i < SIDES; i++) {
            const angle = rot + (Math.PI * 2 / SIDES) * i;
            const nx = z.x + Math.cos(angle) * r * 0.97;
            const ny = z.y + Math.sin(angle) * r * 0.97;
            ctx.beginPath();
            ctx.arc(nx, ny, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Center icon
        ctx.globalAlpha = a0 * 0.7;
        ctx.fillStyle = C_WHITE;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('⚡ DMG ×2', z.x, z.y);

        // Thin timer arc (bottom third of hex)
        const timerRatio = Math.min(1, z.timer / 3);
        ctx.globalAlpha = a0 * 0.4;
        ctx.strokeStyle = '#60c8ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(z.x, z.y, r * 0.45, Math.PI * 0.5, Math.PI * 0.5 + Math.PI * 2 * timerRatio);
        ctx.stroke();
    }

    // ── Standard zone rendering (safe/danger/distortion) ──
    _renderStandardZone(ctx, z, t, fade) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 4);
        const a = z.type === 'danger' ? '255,60,60' : '200,80,255';
        const col = z.type === 'safe' ? '255,200,60' : a;
        const b = z.type === 'danger' ? '#ff3c3c' : '#c850ff';
        const solidCol = z.type === 'safe' ? '#ffc83c' : b;

        // Filled zone area
        this.renderZoneFill(ctx, z, fade, col, t);

        // Solid animated border
        this.renderAnimatedBorder(ctx, z, fade, pulse, solidCol, t);

        // Zone label
        const { fontSize, effects, subSize } = this.renderQuantumWorldEffects(z, ctx, fade, solidCol);

        // Timer bar
        this.renderTimerBar(z, fontSize, effects, subSize, ctx, fade, solidCol);
    }


    renderTimerBar(z, fontSize, effects, subSize, ctx, fade, solidCol) {
        const barW = z.radius * 0.8;
        const barX = z.x - barW / 2;
        const barY = z.y + fontSize * 0.5 + effects.length * (subSize + 2) + 6;
        const timerRatio = Math.min(1, z.timer / 4);

        ctx.globalAlpha = z.intensity * fade * 0.3;
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(barX, barY, barW, 3);
        ctx.globalAlpha = z.intensity * fade * 0.6;
        ctx.fillStyle = solidCol;
        ctx.fillRect(barX, barY, barW * timerRatio, 3);
    }

    renderQuantumWorldEffects(z, ctx, fade, solidCol) {
        const fontSize = Math.max(10, Math.floor(z.radius * 0.18));
        const subSize = Math.max(8, Math.floor(z.radius * 0.13));
        let label, effects;
        if (z.type === 'safe') {
            label = '⚔ RAPID FIRE'; effects = ['ATK SPEED ×2'];
        } else if (z.type === 'danger') {
            label = '⚠ DANGER'; effects = ['▼ SPD −40%', '☠ DMG/2s'];
        } else {
            label = '⌬ DISTORTION'; effects = ['FOE FREEZE', '☆ DMG ×1.5'];
        }

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = z.intensity * fade * 0.85;
        ctx.fillStyle = C_WHITE;
        ctx.font = `bold ${fontSize}px monospace`;
        ctx.fillText(label, z.x, z.y - subSize * 0.8);

        ctx.globalAlpha = z.intensity * fade * 0.6;
        ctx.fillStyle = solidCol;
        ctx.font = `${subSize}px monospace`;
        for (let i = 0; i < effects.length; i++) {
            ctx.fillText(effects[i], z.x, z.y + fontSize * 0.5 + i * (subSize + 2));
        }
        return { fontSize, effects, subSize };
    }

    renderAnimatedBorder(ctx, z, fade, pulse, solidCol, t) {
        ctx.globalAlpha = z.intensity * fade * (0.5 + pulse * 0.25);
        ctx.strokeStyle = solidCol;
        ctx.lineWidth = 2.5;
        if (z.type === 'distortion') {
            ctx.setLineDash([6, 3, 2, 3]);
            ctx.lineDashOffset = -t * 50;
            ctx.beginPath();
            for (let a = 0; a < Math.PI * 2; a += 0.15) {
                const warp = 1 + 0.08 * Math.sin(a * 7 + t * 3) + 0.05 * Math.cos(a * 3 - t * 5);
                const r = z.radius * 0.96 * warp;
                const px = z.x + Math.cos(a) * r;
                const py = z.y + Math.sin(a) * r;
                a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.setLineDash([]);
        } else {
            ctx.setLineDash([10, 5]);
            ctx.lineDashOffset = -t * 35;
            ctx.beginPath();
            ctx.arc(z.x, z.y, z.radius * 0.96, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    renderZoneFill(ctx, z, fade, col, t) {
        ctx.globalAlpha = z.intensity * fade * 0.18;
        ctx.fillStyle = `rgba(${col},0.3)`;
        ctx.beginPath();
        if (z.type === 'distortion') {
            for (let a = 0; a < Math.PI * 2; a += 0.15) {
                const warp = 1 + 0.08 * Math.sin(a * 7 + t * 3) + 0.05 * Math.cos(a * 3 - t * 5);
                const r = z.radius * warp;
                const px = z.x + Math.cos(a) * r;
                const py = z.y + Math.sin(a) * r;
                a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath();
        } else {
            ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
        }
        ctx.fill();
    }
}
