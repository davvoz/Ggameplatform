/**
 * SimulationWorldRenderer — World 3 (Levels 61-90)
 *
 * "Simulation Break" — the game engine is malfunctioning.
 * 6 visually distinct sectors with animated cartoon-style backgrounds:
 *   Sector 1 (61-65) "Boot Sequence"  — retro terminal, scrolling code, CRT glow
 *   Sector 2 (66-70) "Corrupted Zone" — floating pixel blocks, purple static clouds
 *   Sector 3 (71-75) "Data Ocean"     — neon wireframe waves, circuit islands
 *   Sector 4 (76-80) "Virus Core"     — red infection tendrils, pulsing nodes
 *   Sector 5 (81-85) "Matrix Decay"   — falling code rain, dissolving cubes
 *   Sector 6 (86-90) "The Kernel"     — fractal void, cosmic code geometry
 */
import { WorldRenderer } from './WorldRenderer.js';

const FX_LAYER_ORDER = {
    glitchBlock: 0, dataStream: 1, brokenPoly: 2, pixelNoise: 3, codeFragment: 4
};

// ── Sector detection from intensity (0..1 maps to sector 1..6) ──
function _sector(intensity) {
    if (intensity <= 0.20) return 1;
    if (intensity <= 0.40) return 2;
    if (intensity <= 0.60) return 3;
    if (intensity <= 0.80) return 4;
    if (intensity <= 0.92) return 5;
    return 6;
}

export class SimulationWorldRenderer extends WorldRenderer {
    constructor(canvasWidth, canvasHeight, quality) {
        super(canvasWidth, canvasHeight, quality);
        this.intensity = 0;
        this.sector = 1;
        this.time = 0;
        this.gridHue = 180;

        // Shared animated layers
        this.stars = [];
        this.floaters = [];       // floating objects (pixels, cubes, code blocks)
        this.wavePoints = [];     // wireframe wave for sector 3
        this.tendrils = [];       // infection tendrils for sector 4
        this.codeColumns = [];    // matrix rain for sector 5
        this.fractals = [];       // fractal geometry for sector 6
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
        this.floaters = [];
        this.wavePoints = [];
        this.tendrils = [];
        this.codeColumns = [];
        this.fractals = [];
        this.scanlines = [];
        this.glitchBands = [];

        this._buildStars();
        this._buildScanlines();
        this._buildGlitchBands();

        switch (this.sector) {
            case 1: this._buildTerminal(); break;
            case 2: this._buildPixelBlocks(); break;
            case 3: this._buildWireframeWave(); break;
            case 4: this._buildVirusTendrils(); break;
            case 5: this._buildMatrixRain(); break;
            case 6: this._buildFractalVoid(); break;
        }
    }

    update(dt) {
        this.time += dt;
        // Scroll stars
        for (const s of this.stars) {
            s.y += s.speed * dt;
            if (s.y > this.canvasHeight + 2) { s.y = -2; s.x = Math.random() * this.canvasWidth; }
        }
        // Animate glitch bands
        for (const band of this.glitchBands) {
            band.timer -= dt;
            if (band.timer <= 0) {
                band.y = Math.random() * this.canvasHeight;
                band.h = 2 + Math.random() * (4 + this.intensity * 6);
                band.offsetX = (Math.random() - 0.5) * (3 + this.intensity * 8);
                band.timer = 0.2 + Math.random() * 0.5;
                band.alpha = 0.1 + Math.random() * 0.15;
            }
        }
        // Sector-specific updates
        switch (this.sector) {
            case 1: this._updateTerminal(dt); break;
            case 2: this._updatePixelBlocks(dt); break;
            case 3: this._updateWireframeWave(dt); break;
            case 4: this._updateVirusTendrils(dt); break;
            case 5: this._updateMatrixRain(dt); break;
            case 6: this._updateFractalVoid(dt); break;
        }
    }

    renderBackground(ctx, time) {
        switch (this.sector) {
            case 1: this._renderTerminalBg(ctx); break;
            case 2: this._renderCorruptedBg(ctx); break;
            case 3: this._renderDataOceanBg(ctx); break;
            case 4: this._renderVirusBg(ctx); break;
            case 5: this._renderMatrixBg(ctx); break;
            case 6: this._renderKernelBg(ctx); break;
        }
        this._renderStars(ctx);
        this._renderScanlines(ctx);
    }

    renderFx(ctx, fxParticles, time) {
        this._renderFxSorted(ctx, fxParticles, FX_LAYER_ORDER);
    }

    renderOverlay(ctx, time) {
        switch (this.sector) {
            case 1: this._renderTerminalOverlay(ctx); break;
            case 2: this._renderCorruptedOverlay(ctx); break;
            case 3: this._renderDataOceanOverlay(ctx); break;
            case 4: this._renderVirusOverlay(ctx); break;
            case 5: this._renderMatrixOverlay(ctx); break;
            case 6: this._renderKernelOverlay(ctx); break;
        }
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
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight,
                size: 0.5 + Math.random() * 1.5,
                speed: 4 + Math.random() * 8,
                hue: this.gridHue + (Math.random() - 0.5) * 40,
                alpha: 0.15 + Math.random() * 0.25
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
                y: Math.random() * this.canvasHeight, h: 3, offsetX: 0,
                alpha: 0.12, timer: Math.random() * 0.6
            });
        }
    }

    // ════════════════════════════════════════════════
    //  SECTOR 1 — BOOT SEQUENCE (retro terminal)
    // ════════════════════════════════════════════════

    _buildTerminal() {
        // Scrolling code lines
        const lineCount = this.quality === 'low' ? 12 : 20;
        const words = ['LOAD','SYS','INIT','0x0F','BOOT','MEM','OK','ERR','>>','RUN','DATA','SCAN','CPU','I/O'];
        for (let i = 0; i < lineCount; i++) {
            let txt = '> ';
            const wc = 2 + Math.floor(Math.random() * 4);
            for (let w = 0; w < wc; w++) txt += words[Math.floor(Math.random() * words.length)] + ' ';
            this.floaters.push({
                x: 8 + Math.random() * (this.canvasWidth * 0.7),
                y: Math.random() * this.canvasHeight,
                text: txt,
                speed: 12 + Math.random() * 14,
                alpha: 0.15 + Math.random() * 0.2,
                hue: 140 + Math.random() * 30 // green terminal
            });
        }
    }

    _updateTerminal(dt) {
        for (const f of this.floaters) {
            f.y += f.speed * dt;
            if (f.y > this.canvasHeight + 16) { f.y = -16; f.x = 8 + Math.random() * (this.canvasWidth * 0.7); }
        }
    }

    _renderTerminalBg(ctx) {
        // Dark green-black CRT background
        const grad = ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
        grad.addColorStop(0, '#020a04');
        grad.addColorStop(0.5, '#041208');
        grad.addColorStop(1, '#020a04');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        // Scrolling code text
        ctx.font = '10px monospace';
        for (const f of this.floaters) {
            ctx.fillStyle = `hsla(${f.hue},80%,50%,${f.alpha})`;
            ctx.fillText(f.text, f.x, f.y);
        }

        // Blinking cursor
        if (Math.sin(this.time * 4) > 0) {
            ctx.fillStyle = 'rgba(0,255,100,0.6)';
            ctx.fillRect(10, this.canvasHeight - 20, 8, 14);
        }
    }

    _renderTerminalOverlay(ctx) {
        // CRT curvature vignette + faint green border glow
        ctx.save();
        ctx.strokeStyle = 'rgba(0,255,100,0.08)';
        ctx.lineWidth = 3;
        ctx.strokeRect(4, 4, this.canvasWidth - 8, this.canvasHeight - 8);
        // Phosphor glow at bottom
        const glow = ctx.createLinearGradient(0, this.canvasHeight - 40, 0, this.canvasHeight);
        glow.addColorStop(0, 'rgba(0,255,80,0)');
        glow.addColorStop(1, 'rgba(0,255,80,0.04)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, this.canvasHeight - 40, this.canvasWidth, 40);
        ctx.restore();
    }

    // ════════════════════════════════════════════════
    //  SECTOR 2 — CORRUPTED ZONE (floating pixel blocks)
    // ════════════════════════════════════════════════

    _buildPixelBlocks() {
        const count = this.quality === 'low' ? 15 : 30;
        for (let i = 0; i < count; i++) {
            this.floaters.push({
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight,
                size: 4 + Math.random() * 16,
                speed: 8 + Math.random() * 18,
                rotSpeed: (Math.random() - 0.5) * 2,
                rot: Math.random() * Math.PI * 2,
                hue: 260 + Math.random() * 50, // purples
                alpha: 0.12 + Math.random() * 0.18,
                broken: Math.random() < 0.4 // some are cracked
            });
        }
    }

    _updatePixelBlocks(dt) {
        for (const f of this.floaters) {
            f.y += f.speed * dt;
            f.rot += f.rotSpeed * dt;
            if (f.y > this.canvasHeight + 20) {
                f.y = -20; f.x = Math.random() * this.canvasWidth;
                f.size = 4 + Math.random() * 16;
            }
        }
    }

    _renderCorruptedBg(ctx) {
        // Deep purple-black gradient
        const grad = ctx.createLinearGradient(0, 0, this.canvasWidth * 0.3, this.canvasHeight);
        grad.addColorStop(0, '#08030f');
        grad.addColorStop(0.5, '#0c0618');
        grad.addColorStop(1, '#06020c');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        // Floating pixel blocks
        for (const f of this.floaters) {
            ctx.save();
            ctx.translate(f.x, f.y);
            ctx.rotate(f.rot);
            ctx.globalAlpha = f.alpha;

            // Main block
            ctx.fillStyle = `hsla(${f.hue},60%,40%,1)`;
            ctx.fillRect(-f.size / 2, -f.size / 2, f.size, f.size);
            // Bold outline
            ctx.strokeStyle = `hsla(${f.hue},70%,60%,0.6)`;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(-f.size / 2, -f.size / 2, f.size, f.size);

            // Crack lines on broken blocks
            if (f.broken && f.size > 8) {
                ctx.strokeStyle = `hsla(${f.hue + 40},80%,70%,0.5)`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-f.size * 0.3, -f.size * 0.4);
                ctx.lineTo(f.size * 0.1, f.size * 0.2);
                ctx.lineTo(f.size * 0.35, f.size * 0.4);
                ctx.stroke();
            }
            ctx.restore();
        }

        // Static noise patches
        if (this.quality !== 'low') {
            ctx.save();
            ctx.globalAlpha = 0.04 + this.intensity * 0.03;
            for (let i = 0; i < 5; i++) {
                const nx = ((Math.sin(this.time * 1.3 + i * 7) * 0.5 + 0.5) * this.canvasWidth) | 0;
                const ny = ((Math.cos(this.time * 0.9 + i * 4) * 0.5 + 0.5) * this.canvasHeight) | 0;
                const nw = 30 + Math.random() * 50;
                const nh = 20 + Math.random() * 30;
                ctx.fillStyle = `hsla(280,40%,50%,0.3)`;
                ctx.fillRect(nx, ny, nw, nh);
            }
            ctx.restore();
        }
    }

    _renderCorruptedOverlay(ctx) {
        // Purple ambient glow at edges
        ctx.save();
        ctx.globalAlpha = 0.06;
        const edgeGrad = ctx.createLinearGradient(0, 0, 60, 0);
        edgeGrad.addColorStop(0, '#8833ff');
        edgeGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = edgeGrad;
        ctx.fillRect(0, 0, 60, this.canvasHeight);
        const edgeGrad2 = ctx.createLinearGradient(this.canvasWidth, 0, this.canvasWidth - 60, 0);
        edgeGrad2.addColorStop(0, '#8833ff');
        edgeGrad2.addColorStop(1, 'transparent');
        ctx.fillStyle = edgeGrad2;
        ctx.fillRect(this.canvasWidth - 60, 0, 60, this.canvasHeight);
        ctx.restore();
    }

    // ════════════════════════════════════════════════
    //  SECTOR 3 — DATA OCEAN (wireframe waves + circuit islands)
    // ════════════════════════════════════════════════

    _buildWireframeWave() {
        // Two scrolling wave layers
        const cols = Math.floor(this.canvasWidth / 20) + 2;
        for (let layer = 0; layer < 2; layer++) {
            const row = [];
            for (let c = 0; c < cols; c++) {
                row.push({ x: c * 20, baseY: 0, phase: c * 0.3 + layer * 2 });
            }
            this.wavePoints.push(row);
        }
        // Circuit "islands" — small rectangular structures
        const islandCount = this.quality === 'low' ? 4 : 8;
        for (let i = 0; i < islandCount; i++) {
            this.floaters.push({
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight,
                w: 20 + Math.random() * 40,
                h: 12 + Math.random() * 25,
                speed: 5 + Math.random() * 10,
                hue: 180 + Math.random() * 30,
                alpha: 0.1 + Math.random() * 0.12
            });
        }
    }

    _updateWireframeWave(dt) {
        for (const f of this.floaters) {
            f.y += f.speed * dt;
            if (f.y > this.canvasHeight + 30) { f.y = -30; f.x = Math.random() * this.canvasWidth; }
        }
    }

    _renderDataOceanBg(ctx) {
        // Deep teal-black gradient
        const grad = ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
        grad.addColorStop(0, '#020d0d');
        grad.addColorStop(0.4, '#041815');
        grad.addColorStop(1, '#020f0c');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        // Wireframe waves
        const W = this.canvasWidth, H = this.canvasHeight;
        for (let li = 0; li < this.wavePoints.length; li++) {
            const row = this.wavePoints[li];
            const baseY = H * (0.35 + li * 0.25);
            const amp = 18 + li * 8;
            const alpha = 0.12 - li * 0.03;

            ctx.strokeStyle = `hsla(${175 + li * 15},80%,55%,${alpha})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            for (let c = 0; c < row.length; c++) {
                const pt = row[c];
                const y = baseY + Math.sin(this.time * 1.2 + pt.phase) * amp;
                if (c === 0) ctx.moveTo(pt.x, y); else ctx.lineTo(pt.x, y);
            }
            ctx.stroke();

            // Vertical grid lines from wave to bottom
            if (this.quality !== 'low') {
                ctx.strokeStyle = `hsla(${175 + li * 15},60%,40%,${alpha * 0.3})`;
                ctx.lineWidth = 0.5;
                for (let c = 0; c < row.length; c += 3) {
                    const pt = row[c];
                    const y = baseY + Math.sin(this.time * 1.2 + pt.phase) * amp;
                    ctx.beginPath();
                    ctx.moveTo(pt.x, y);
                    ctx.lineTo(pt.x, y + 60 + li * 30);
                    ctx.stroke();
                }
            }
        }

        // Circuit islands
        for (const f of this.floaters) {
            ctx.save();
            ctx.globalAlpha = f.alpha;
            ctx.strokeStyle = `hsla(${f.hue},70%,55%,0.8)`;
            ctx.lineWidth = 1;
            ctx.strokeRect(f.x, f.y, f.w, f.h);
            // Inner circuit traces
            ctx.strokeStyle = `hsla(${f.hue},60%,45%,0.4)`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(f.x + 3, f.y + f.h / 2);
            ctx.lineTo(f.x + f.w - 3, f.y + f.h / 2);
            ctx.moveTo(f.x + f.w / 2, f.y + 3);
            ctx.lineTo(f.x + f.w / 2, f.y + f.h - 3);
            ctx.stroke();
            // Corner dots
            ctx.fillStyle = `hsla(${f.hue},80%,65%,0.6)`;
            for (const [ox, oy] of [[3,3],[f.w-3,3],[3,f.h-3],[f.w-3,f.h-3]]) {
                ctx.beginPath(); ctx.arc(f.x + ox, f.y + oy, 1.5, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }
    }

    _renderDataOceanOverlay(ctx) {
        // Subtle horizontal data flow lines
        ctx.save();
        ctx.globalAlpha = 0.04;
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            const y = (this.time * 15 + i * 70) % this.canvasHeight;
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.canvasWidth, y); ctx.stroke();
        }
        ctx.restore();
    }

    // ════════════════════════════════════════════════
    //  SECTOR 4 — VIRUS CORE (infection tendrils)
    // ════════════════════════════════════════════════

    _buildVirusTendrils() {
        // Pulsating infection nodes
        const nodeCount = this.quality === 'low' ? 5 : 10;
        for (let i = 0; i < nodeCount; i++) {
            this.tendrils.push({
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight,
                radius: 3 + Math.random() * 6,
                pulsePhase: Math.random() * Math.PI * 2,
                speed: 6 + Math.random() * 10,
                connections: [] // filled on render from nearest neighbours
            });
        }
        // Floating red particles
        for (let i = 0; i < (this.quality === 'low' ? 8 : 16); i++) {
            this.floaters.push({
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight,
                size: 2 + Math.random() * 4,
                speed: 10 + Math.random() * 15,
                alpha: 0.1 + Math.random() * 0.15,
                wobble: Math.random() * Math.PI * 2
            });
        }
    }

    _updateVirusTendrils(dt) {
        for (const n of this.tendrils) {
            n.y += n.speed * dt;
            if (n.y > this.canvasHeight + 10) { n.y = -10; n.x = Math.random() * this.canvasWidth; }
        }
        for (const f of this.floaters) {
            f.y += f.speed * dt;
            f.x += Math.sin(this.time * 2 + f.wobble) * 15 * dt;
            if (f.y > this.canvasHeight + 5) { f.y = -5; f.x = Math.random() * this.canvasWidth; }
        }
    }

    _renderVirusBg(ctx) {
        // Dark red-black gradient
        const grad = ctx.createRadialGradient(
            this.canvasWidth / 2, this.canvasHeight / 2, 30,
            this.canvasWidth / 2, this.canvasHeight / 2, this.canvasWidth * 0.7
        );
        grad.addColorStop(0, '#1a0505');
        grad.addColorStop(0.5, '#0d0202');
        grad.addColorStop(1, '#050101');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        // Connection tendrils between nearby nodes
        ctx.strokeStyle = 'rgba(255,40,40,0.08)';
        ctx.lineWidth = 1;
        for (let i = 0; i < this.tendrils.length; i++) {
            const a = this.tendrils[i];
            for (let j = i + 1; j < this.tendrils.length; j++) {
                const b = this.tendrils[j];
                const dx = a.x - b.x, dy = a.y - b.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    ctx.globalAlpha = (1 - dist / 120) * 0.15;
                    ctx.beginPath();
                    // Curved tendril (quadratic bezier through midpoint offset)
                    const mx = (a.x + b.x) / 2 + Math.sin(this.time + i) * 8;
                    const my = (a.y + b.y) / 2 + Math.cos(this.time + j) * 8;
                    ctx.moveTo(a.x, a.y);
                    ctx.quadraticCurveTo(mx, my, b.x, b.y);
                    ctx.stroke();
                }
            }
            ctx.globalAlpha = 1;
        }

        // Pulsating nodes
        for (const n of this.tendrils) {
            const pulse = 1 + 0.3 * Math.sin(this.time * 3 + n.pulsePhase);
            const r = n.radius * pulse;
            // Outer glow
            ctx.save();
            ctx.globalAlpha = 0.12;
            ctx.fillStyle = '#ff2222';
            ctx.beginPath(); ctx.arc(n.x, n.y, r * 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
            // Core
            ctx.fillStyle = `rgba(255,${60 + Math.floor(pulse * 30)},30,0.7)`;
            ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(255,100,50,0.4)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Floating infection particles
        for (const f of this.floaters) {
            ctx.fillStyle = `rgba(255,50,30,${f.alpha})`;
            ctx.beginPath(); ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2); ctx.fill();
        }
    }

    _renderVirusOverlay(ctx) {
        // Pulsating red border effect
        const pulse = 0.5 + 0.5 * Math.sin(this.time * 2);
        ctx.save();
        ctx.globalAlpha = 0.03 + pulse * 0.02;
        ctx.strokeStyle = '#ff2244';
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, this.canvasWidth - 4, this.canvasHeight - 4);
        ctx.restore();
    }

    // ════════════════════════════════════════════════
    //  SECTOR 5 — MATRIX DECAY (code rain + dissolving cubes)
    // ════════════════════════════════════════════════

    _buildMatrixRain() {
        const cols = Math.floor(this.canvasWidth / 14);
        for (let c = 0; c < cols; c++) {
            this.codeColumns.push({
                x: c * 14 + 7,
                y: Math.random() * this.canvasHeight,
                speed: 40 + Math.random() * 60,
                length: 5 + Math.floor(Math.random() * 12),
                chars: [],
                changeTimer: 0
            });
            // Fill with random chars
            const col = this.codeColumns[this.codeColumns.length - 1];
            for (let i = 0; i < col.length; i++) {
                col.chars.push(String.fromCharCode(0x30A0 + Math.floor(Math.random() * 96)));
            }
        }
        // Dissolving cubes
        const cubeCount = this.quality === 'low' ? 6 : 12;
        for (let i = 0; i < cubeCount; i++) {
            this.floaters.push({
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight,
                size: 6 + Math.random() * 14,
                speed: 5 + Math.random() * 12,
                dissolve: Math.random(), // 0 = solid, 1 = fully dissolved
                dissolveSpeed: 0.1 + Math.random() * 0.15,
                rot: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 1.5,
                hue: 100 + Math.random() * 40 // green-ish
            });
        }
    }

    _updateMatrixRain(dt) {
        for (const col of this.codeColumns) {
            col.y += col.speed * dt;
            if (col.y > this.canvasHeight + col.length * 14) {
                col.y = -col.length * 14;
                col.speed = 40 + Math.random() * 60;
            }
            col.changeTimer += dt;
            if (col.changeTimer > 0.15) {
                col.changeTimer = 0;
                const idx = Math.floor(Math.random() * col.chars.length);
                col.chars[idx] = String.fromCharCode(0x30A0 + Math.floor(Math.random() * 96));
            }
        }
        for (const f of this.floaters) {
            f.y += f.speed * dt;
            f.rot += f.rotSpeed * dt;
            f.dissolve += f.dissolveSpeed * dt;
            if (f.dissolve > 1.2 || f.y > this.canvasHeight + 20) {
                f.y = -20; f.x = Math.random() * this.canvasWidth;
                f.dissolve = 0; f.size = 6 + Math.random() * 14;
            }
        }
    }

    _renderMatrixBg(ctx) {
        // Very dark green-black
        ctx.fillStyle = '#020802';
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        // Matrix code rain
        ctx.font = '12px monospace';
        for (const col of this.codeColumns) {
            for (let i = 0; i < col.chars.length; i++) {
                const cy = col.y + i * 14;
                if (cy < -14 || cy > this.canvasHeight + 14) continue;
                const fade = i / col.chars.length;
                const isHead = i === 0;
                ctx.fillStyle = isHead
                    ? 'rgba(180,255,180,0.7)'
                    : `rgba(0,${180 - Math.floor(fade * 100)},0,${0.3 - fade * 0.2})`;
                ctx.fillText(col.chars[i], col.x, cy);
            }
        }

        // Dissolving cubes
        for (const f of this.floaters) {
            if (f.dissolve >= 1) continue;
            ctx.save();
            ctx.translate(f.x, f.y);
            ctx.rotate(f.rot);
            ctx.globalAlpha = (1 - f.dissolve) * 0.35;
            const s = f.size * (1 - f.dissolve * 0.3);
            ctx.strokeStyle = `hsla(${f.hue},60%,50%,0.8)`;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(-s / 2, -s / 2, s, s);
            // Smaller inner square fading
            if (f.dissolve < 0.5) {
                ctx.globalAlpha = (0.5 - f.dissolve) * 0.4;
                ctx.fillStyle = `hsla(${f.hue},50%,40%,1)`;
                const is = s * 0.5;
                ctx.fillRect(-is / 2, -is / 2, is, is);
            }
            // Fragment particles as it dissolves
            if (f.dissolve > 0.3) {
                ctx.globalAlpha = (f.dissolve - 0.3) * 0.5;
                ctx.fillStyle = `hsla(${f.hue},70%,55%,0.6)`;
                for (let p = 0; p < 4; p++) {
                    const px = (Math.sin(this.time * 3 + p * 1.5) * s * f.dissolve);
                    const py = (Math.cos(this.time * 2.5 + p * 2) * s * f.dissolve);
                    ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI * 2); ctx.fill();
                }
            }
            ctx.restore();
        }
    }

    _renderMatrixOverlay(ctx) {
        // Very faint green scanline tint
        ctx.save();
        ctx.globalAlpha = 0.02;
        ctx.fillStyle = '#00ff44';
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        ctx.restore();
    }

    // ════════════════════════════════════════════════
    //  SECTOR 6 — THE KERNEL (fractal void + cosmic geometry)
    // ════════════════════════════════════════════════

    _buildFractalVoid() {
        // Geometric fractal-like shapes
        const count = this.quality === 'low' ? 5 : 10;
        for (let i = 0; i < count; i++) {
            this.fractals.push({
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight,
                sides: 3 + Math.floor(Math.random() * 5), // 3-7 sides
                radius: 8 + Math.random() * 25,
                rot: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.8,
                speed: 3 + Math.random() * 8,
                hue: Math.random() * 360,
                alpha: 0.08 + Math.random() * 0.12,
                innerRings: 1 + Math.floor(Math.random() * 3)
            });
        }
        // Cosmic dust
        for (let i = 0; i < (this.quality === 'low' ? 10 : 20); i++) {
            this.floaters.push({
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight,
                size: 1 + Math.random() * 3,
                speed: 2 + Math.random() * 6,
                hue: Math.random() * 360,
                alpha: 0.1 + Math.random() * 0.2,
                orbit: Math.random() * Math.PI * 2
            });
        }
    }

    _updateFractalVoid(dt) {
        for (const f of this.fractals) {
            f.y += f.speed * dt;
            f.rot += f.rotSpeed * dt;
            f.hue = (f.hue + 15 * dt) % 360; // slowly shift color
            if (f.y > this.canvasHeight + 30) {
                f.y = -30; f.x = Math.random() * this.canvasWidth;
            }
        }
        for (const f of this.floaters) {
            f.y += f.speed * dt;
            f.orbit += dt * 0.5;
            f.x += Math.sin(f.orbit) * 10 * dt;
            if (f.y > this.canvasHeight + 5) { f.y = -5; f.x = Math.random() * this.canvasWidth; }
        }
    }

    _renderKernelBg(ctx) {
        // Void gradient — deep dark with subtle color shifts
        const grad = ctx.createRadialGradient(
            this.canvasWidth / 2, this.canvasHeight / 2, 10,
            this.canvasWidth / 2, this.canvasHeight / 2, this.canvasWidth * 0.8
        );
        const pulse = Math.sin(this.time * 0.5) * 0.5 + 0.5;
        grad.addColorStop(0, `rgba(${15 + pulse * 10},5,${20 + pulse * 15},1)`);
        grad.addColorStop(0.5, '#050208');
        grad.addColorStop(1, '#020104');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        // Fractal geometry
        for (const f of this.fractals) {
            ctx.save();
            ctx.translate(f.x, f.y);
            ctx.rotate(f.rot);

            for (let ring = 0; ring < f.innerRings; ring++) {
                const r = f.radius * (1 - ring * 0.3);
                const alpha = f.alpha * (1 - ring * 0.3);
                ctx.globalAlpha = alpha;
                ctx.strokeStyle = `hsla(${f.hue + ring * 30},70%,55%,1)`;
                ctx.lineWidth = 1.2;

                ctx.beginPath();
                for (let s = 0; s <= f.sides; s++) {
                    const a = (Math.PI * 2 / f.sides) * s;
                    const px = Math.cos(a) * r;
                    const py = Math.sin(a) * r;
                    if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.stroke();
            }

            // Center dot
            ctx.globalAlpha = f.alpha * 1.5;
            ctx.fillStyle = `hsla(${f.hue},80%,65%,1)`;
            ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();

            ctx.restore();
        }

        // Cosmic dust particles
        for (const f of this.floaters) {
            ctx.fillStyle = `hsla(${f.hue},60%,60%,${f.alpha})`;
            ctx.beginPath(); ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2); ctx.fill();
        }

        // Connecting lines between nearby fractals (neural network feel)
        ctx.save();
        ctx.globalAlpha = 0.04;
        ctx.strokeStyle = '#ff44aa';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < this.fractals.length; i++) {
            const a = this.fractals[i];
            for (let j = i + 1; j < this.fractals.length; j++) {
                const b = this.fractals[j];
                const dx = a.x - b.x, dy = a.y - b.y;
                if (dx * dx + dy * dy < 25000) {
                    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
                }
            }
        }
        ctx.restore();
    }

    _renderKernelOverlay(ctx) {
        // Pulsating cosmic glow from center
        const pulse = 0.5 + 0.5 * Math.sin(this.time * 1.5);
        ctx.save();
        ctx.globalAlpha = 0.03 + pulse * 0.02;
        const cg = ctx.createRadialGradient(
            this.canvasWidth / 2, this.canvasHeight / 2, 10,
            this.canvasWidth / 2, this.canvasHeight / 2, this.canvasWidth * 0.5
        );
        cg.addColorStop(0, '#ff22aa');
        cg.addColorStop(1, 'transparent');
        ctx.fillStyle = cg;
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        ctx.restore();
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
        if (Math.random() < 0.04) {
            ctx.save();
            ctx.globalAlpha = 0.04 + Math.random() * 0.04;
            ctx.fillStyle = Math.random() < 0.5 ? '#0ff' : '#f0f';
            ctx.fillRect(0, Math.random() * this.canvasHeight, this.canvasWidth, 2 + Math.random() * 6);
            ctx.restore();
        }
    }
}

export default SimulationWorldRenderer;
