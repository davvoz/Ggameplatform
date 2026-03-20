/**
 * SimulationWorldRenderer — World 3 (Levels 61-90)
 *
 * "Simulation Break" — the game engine is malfunctioning.
 * Thin hub that delegates to 6 sector sub-renderers in simulation/.
 *
 *   Sector 1 (61-65) "Boot Sequence"  — BootSequenceSector
 *   Sector 2 (66-70) "Corrupted Zone" — CorruptedZoneSector
 *   Sector 3 (71-75) "Data Ocean"     — DataOceanSector
 *   Sector 4 (76-80) "Virus Core"     — VirusCoreSector
 *   Sector 5 (81-85) "Matrix Decay"   — MatrixDecaySector
 *   Sector 6 (86-90) "The Kernel"     — TheKernelSector
 */
import { WorldRenderer } from './WorldRenderer.js';
import { BootSequenceSector }  from './simulation/BootSequenceSector.js';
import { CorruptedZoneSector } from './simulation/CorruptedZoneSector.js';
import { DataOceanSector }     from './simulation/DataOceanSector.js';
import { VirusCoreSector }     from './simulation/VirusCoreSector.js';
import { MatrixDecaySector }   from './simulation/MatrixDecaySector.js';
import { TheKernelSector }     from './simulation/TheKernelSector.js';

const FX_LAYER_ORDER = {
    glitchBlock: 0, dataStream: 1, brokenPoly: 2, pixelNoise: 3, codeFragment: 4
};

function _sector(intensity) {
    if (intensity <= 0.20) return 1;
    if (intensity <= 0.40) return 2;
    if (intensity <= 0.60) return 3;
    if (intensity <= 0.80) return 4;
    if (intensity <= 0.92) return 5;
    return 6;
}

const SECTOR_CLASSES = {
    1: BootSequenceSector,
    2: CorruptedZoneSector,
    3: DataOceanSector,
    4: VirusCoreSector,
    5: MatrixDecaySector,
    6: TheKernelSector
};

export class SimulationWorldRenderer extends WorldRenderer {
    constructor(canvasWidth, canvasHeight, quality) {
        super(canvasWidth, canvasHeight, quality);
        this.intensity = 0;
        this.sector = 1;
        this.time = 0;
        this.gridHue = 180;
        this._sectorRenderer = null;

        // Shared animated layers
        this.stars = [];
        this.scanlines = [];
        this.glitchBands = [];
    }

    // ── lifecycle ──────────────────────────────────

    build(theme) {
        const gc = (theme && theme.glitchConfig) || {};
        this.intensity = gc.intensity || 0;
        this.gridHue = gc.gridHue || 180;
        this.sector = _sector(this.intensity);

        this.stars = [];
        this.scanlines = [];
        this.glitchBands = [];

        this._buildStars();
        this._buildScanlines();
        this._buildGlitchBands();

        const SectorClass = SECTOR_CLASSES[this.sector];
        this._sectorRenderer = new SectorClass(
            this.canvasWidth, this.canvasHeight, this.quality
        );
        this._sectorRenderer.intensity = this.intensity;
        this._sectorRenderer.build();
    }

    update(dt) {
        this.time += dt;
        // Scroll stars
        for (const s of this.stars) {
            s.y += s.speed * dt;
            if (s.y > this.canvasHeight + 2) { s.y = -2; s.x = window.randomSecure() * this.canvasWidth; }
        }
        // Animate glitch bands
        for (const band of this.glitchBands) {
            band.timer -= dt;
            if (band.timer <= 0) {
                band.y = window.randomSecure() * this.canvasHeight;
                band.h = 2 + window.randomSecure() * (4 + this.intensity * 6);
                band.offsetX = (window.randomSecure() - 0.5) * (3 + this.intensity * 8);
                band.timer = 0.2 + window.randomSecure() * 0.5;
                band.alpha = 0.1 + window.randomSecure() * 0.15;
            }
        }
        // Sector-specific update
        if (this._sectorRenderer) {
            this._sectorRenderer.time = this.time;
            this._sectorRenderer.update(dt);
        }
    }

    renderBackground(ctx, time) {
        if (this._sectorRenderer) this._sectorRenderer.renderBg(ctx);
        this._renderStars(ctx);
        this._renderScanlines(ctx);
    }

    renderFx(ctx, fxParticles, time) {
        this._renderFxSorted(ctx, fxParticles, FX_LAYER_ORDER);
    }

    renderOverlay(ctx, time) {
        if (this._sectorRenderer) this._sectorRenderer.renderOverlay(ctx);
        this._renderGlitchBands(ctx);
        this._renderVignette(ctx);
    }

    renderPostFx(ctx) {
        if (this.intensity >= 0.7) this._renderHeavyDistortion(ctx);
    }

    // ════════════════════════════════════════════════
    //  SHARED BUILDERS
    // ════════════════════════════════════════════════

    _buildStars() {
        const count = this.quality === 'low' ? 20 : 40;
        for (let i = 0; i < count; i++) {
            this.stars.push({
                x: window.randomSecure() * this.canvasWidth,
                y: window.randomSecure() * this.canvasHeight,
                size: 0.5 + window.randomSecure() * 1.5,
                speed: 4 + window.randomSecure() * 8,
                hue: this.gridHue + (window.randomSecure() - 0.5) * 40,
                alpha: 0.15 + window.randomSecure() * 0.25
            });
        }
    }

    _buildScanlines() {
        const count = this.quality === 'low' ? 30 : 60;
        const gap = this.canvasHeight / count;
        for (let i = 0; i < count; i++) this.scanlines.push({ y: i * gap });
    }

    _buildGlitchBands() {
        const count = Math.max(1, Math.floor(1 + this.intensity * 3));
        for (let i = 0; i < count; i++) {
            this.glitchBands.push({
                y: window.randomSecure() * this.canvasHeight, h: 3, offsetX: 0,
                alpha: 0.12, timer: window.randomSecure() * 0.6
            });
        }
    }

    // ════════════════════════════════════════════════
    //  SHARED RENDER HELPERS
    // ════════════════════════════════════════════════

    _renderStars(ctx) {
        for (const s of this.stars) {
            ctx.fillStyle = `hsla(${s.hue},50%,60%,${s.alpha})`;
            ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill();
        }
    }

    _renderScanlines(ctx) {
        const alpha = 0.012 + this.intensity * 0.018;
        ctx.fillStyle = `rgba(0,0,0,${alpha})`;
        for (const sl of this.scanlines) {
            ctx.fillRect(0, sl.y, this.canvasWidth, 1);
        }
    }

    _renderGlitchBands(ctx) {
        for (const band of this.glitchBands) {
            ctx.save();
            ctx.globalAlpha = band.alpha;
            ctx.fillStyle = 'rgba(255,0,0,0.25)';
            ctx.fillRect(band.offsetX, band.y, this.canvasWidth, band.h * 0.5);
            ctx.fillStyle = 'rgba(0,255,255,0.25)';
            ctx.fillRect(-band.offsetX, band.y + band.h * 0.3, this.canvasWidth, band.h * 0.5);
            ctx.restore();
        }
    }

    _renderVignette(ctx) {
        const w = this.canvasWidth, h = this.canvasHeight;
        const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.65);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, `rgba(0,0,0,${0.3 + this.intensity * 0.12})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    }

    _renderHeavyDistortion(ctx) {
        if (window.randomSecure() < 0.04) {
            ctx.save();
            ctx.globalAlpha = 0.04 + window.randomSecure() * 0.04;
            ctx.fillStyle = window.randomSecure() < 0.5 ? '#0ff' : '#f0f';
            ctx.fillRect(0, window.randomSecure() * this.canvasHeight, this.canvasWidth, 2 + window.randomSecure() * 6);
            ctx.restore();
        }
    }
}

export default SimulationWorldRenderer;
