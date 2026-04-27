import { GameConfig as C } from '../config/GameConfig.js';
import { LaunchSpring }    from '../entities/LaunchSpring.js';

const BOSS_SLEEP    = 0;
const BOSS_DEFEATED = 4;

/**
 * Convert a hex color + alpha to CSS rgba(). Accepts "#rrggbb" or "#rgb".
 * Module-level to avoid per-frame allocation.
 * @param {string} hex
 * @param {number} a  0–1
 * @returns {string}
 */
function _hexToRgba(hex, a) {
    const h = hex.replace('#', '');
    let r, g, b;
    if (h.length === 3) {
        r = Number.parseInt(h[0] + h[0], 16);
        g = Number.parseInt(h[1] + h[1], 16);
        b = Number.parseInt(h[2] + h[2], 16);
    } else {
        r = Number.parseInt(h.slice(0, 2), 16);
        g = Number.parseInt(h.slice(2, 4), 16);
        b = Number.parseInt(h.slice(4, 6), 16);
    }
    return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
}

/**
 * Renders all in-world entities (walls, bumpers, flippers, warps, gears, …).
 *
 * Single Responsibility: knows HOW to draw entities, not WHEN or WHERE
 * in the render loop to draw them.
 *
 * Usage:
 *   entityRenderer.setup(ctx, time, particles);   // once per frame
 *   entityRenderer.drawSection(section);           // per section
 *   entityRenderer.drawAllWarpExits(sections, camTop, camBot);
 */
export class EntityRenderer {
    _ctx       = null;
    _time      = 0;
    _particles = null;

    /**
     * Must be called at the start of each frame before any draw method.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} time  — elapsed seconds
     * @param {{ burst: Function }} particles
     */
    setup(ctx, time, particles) {
        this._ctx       = ctx;
        this._time      = time;
        this._particles = particles;
    }

    // ── Public draw API ──────────────────────────────────────────────────────

    /**
     * Draw all entities belonging to a section (world-space).
     * @param {import('../sections/Section.js').Section} section
     */
    drawSection(section) {
        const p = section.palette;
        this._drawWalls(section, p);
        this._drawCurves(section, p);
        this._drawCorridors(section, p);
        this._drawCurvedCorridors(section, p);
        for (const gear of section.gears)      this._drawGear(gear, p);
        for (const pend of section.pendulums)  this._drawPendulum(pend, p);
        for (const l    of section.lights)     this._drawLight(l);
        for (const w    of section.warps)      this._drawWarpHole(w);
        for (const t    of section.targets)    this._drawTarget(t, p);
        for (const b    of section.bumpers)    this._drawBumper(b, p);
        for (const s    of section.slings)     this._drawSling(s, p);
        for (const k    of section.kickers)    this._drawKicker(k, p);
        for (const sp   of section.springs)       this._drawSpring(sp, p);
        for (const ls   of section.launchSprings)  this._drawLaunchSpring(ls, p);
        for (const gate of section.gates)          this._drawGate(gate, p);
        if (section.boss)                       this._drawBoss(section.boss, p);
        for (const f    of section.flippers)   this._drawFlipper(f, p);
        this._drawDeathLines(section);
    }

    /**
     * Draw all warp-exit destination portals visible in the viewport.
     * @param {import('../sections/Section.js').Section[]} sections
     * @param {number} camTop
     * @param {number} camBot
     */
    drawAllWarpExits(sections, camTop, camBot) {
        for (const section of sections) {
            for (const w of section.warps) {
                if (w.exitY < camTop - 30 || w.exitY > camBot + 30) continue;
                this._drawWarpExitPortal(w.exitX, w.exitY);
            }
        }
    }

    // ── Entity draw methods ──────────────────────────────────────────────────

    _drawWalls(section, p) {
        const ctx = this._ctx;
        ctx.save();
        ctx.shadowColor = p.wallGlow;
        ctx.shadowBlur  = 22;
        ctx.strokeStyle = p.wall;
        ctx.lineWidth   = 4;
        ctx.lineCap     = 'round';
        ctx.beginPath();
        for (const w of section.walls) {
            ctx.moveTo(w[0], w[1]);
            ctx.lineTo(w[2], w[3]);
        }
        ctx.stroke();
        ctx.shadowBlur  = 0;
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = 0.5;
        ctx.lineWidth   = 1.5;
        ctx.stroke();
        ctx.restore();
    }

    _drawCurves(section, p) {
        const ctx = this._ctx;
        if (!section.curves?.length) return;
        ctx.save();
        ctx.shadowColor = p.wallGlow;
        ctx.shadowBlur  = 22;
        ctx.strokeStyle = p.wall;
        ctx.lineWidth   = 4;
        ctx.lineCap     = 'round';
        for (const c of section.curves) {
            ctx.beginPath();
            const ccw = c.endAngle < c.startAngle;
            ctx.arc(c.cx, c.cy, c.radius, c.startAngle, c.endAngle, ccw);
            ctx.stroke();
        }
        ctx.shadowBlur  = 0;
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = 0.5;
        ctx.lineWidth   = 1.5;
        for (const c of section.curves) {
            ctx.beginPath();
            const ccw = c.endAngle < c.startAngle;
            ctx.arc(c.cx, c.cy, c.radius, c.startAngle, c.endAngle, ccw);
            ctx.stroke();
        }
        ctx.restore();
    }

    _drawCorridors(section, p) {
        const ctx = this._ctx;
        if (!section.corridors?.length) return;

        // ── Background fill (drawn first, walls on top) ──────────────────────
        for (const co of section.corridors) {
            this._drawCorridorBg(co, p);
        }

        // ── Walls ────────────────────────────────────────────────────────────
        ctx.save();
        ctx.shadowColor = p.wallGlow;
        ctx.shadowBlur  = 22;
        ctx.strokeStyle = p.wall;
        ctx.lineWidth   = 4;
        ctx.lineCap     = 'round';
        ctx.beginPath();
        for (const co of section.corridors) {
            for (const w of co.walls) {
                ctx.moveTo(w.ax, w.ay);
                ctx.lineTo(w.bx, w.by);
            }
        }
        ctx.stroke();
        ctx.shadowBlur  = 0;
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = 0.5;
        ctx.lineWidth   = 1.5;
        ctx.stroke();
        ctx.restore();
    }

    /**
     * Fills the interior of a straight corridor with a dark tunnel background
     * and a pulsing centre glow tinted by the section palette.
     * @param {import('../entities/Corridor.js').Corridor} co
     * @param {object} p  section palette
     */
    _drawCorridorBg(co, p) {
        const ctx  = this._ctx;
        const [wA, wB] = co.walls;

        // Midpoints of each wall define the cross-corridor gradient axis
        const mAx = (wA.ax + wA.bx) * 0.5;
        const mAy = (wA.ay + wA.by) * 0.5;
        const mBx = (wB.ax + wB.bx) * 0.5;
        const mBy = (wB.ay + wB.by) * 0.5;

        const pulse  = 0.5 + 0.5 * Math.sin(this._time * 1.3);
        const glow   = p.wallGlow ?? p.wall ?? '#880088';
        const bgCol  = p.bg      ?? '#04020a';

        const grad = ctx.createLinearGradient(mAx, mAy, mBx, mBy);
        grad.addColorStop(0,    _hexToRgba(bgCol, 0.97));
        grad.addColorStop(0.25, _hexToRgba(glow,  0.06 + 0.04 * pulse));
        grad.addColorStop(0.5,  _hexToRgba(glow,  0.16 + 0.08 * pulse));
        grad.addColorStop(0.75, _hexToRgba(glow,  0.06 + 0.04 * pulse));
        grad.addColorStop(1,    _hexToRgba(bgCol, 0.97));

        ctx.save();
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(wA.ax, wA.ay);
        ctx.lineTo(wA.bx, wA.by);
        ctx.lineTo(wB.bx, wB.by);
        ctx.lineTo(wB.ax, wB.ay);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    _drawCurvedCorridors(section, p) {
        const ctx = this._ctx;
        if (!section.curvedCorridors?.length) return;

        // ── Background fill (drawn first, arcs on top) ───────────────────────
        for (const cc of section.curvedCorridors) {
            this._drawCurvedCorridorBg(cc, p);
        }

        // ── Arc walls ────────────────────────────────────────────────────────
        ctx.save();
        ctx.shadowColor = p.wallGlow;
        ctx.shadowBlur  = 22;
        ctx.strokeStyle = p.wall;
        ctx.lineWidth   = 4;
        ctx.lineCap     = 'round';
        for (const cc of section.curvedCorridors) {
            for (const arc of cc.arcs) {
                ctx.beginPath();
                const ccw = arc.endAngle < arc.startAngle;
                ctx.arc(arc.cx, arc.cy, arc.radius, arc.startAngle, arc.endAngle, ccw);
                ctx.stroke();
            }
        }
        ctx.shadowBlur  = 0;
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = 0.5;
        ctx.lineWidth   = 1.5;
        for (const cc of section.curvedCorridors) {
            for (const arc of cc.arcs) {
                ctx.beginPath();
                const ccw = arc.endAngle < arc.startAngle;
                ctx.arc(arc.cx, arc.cy, arc.radius, arc.startAngle, arc.endAngle, ccw);
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    /**
     * Fills the annular sector of a curved corridor with a dark background
     * and a pulsing centre-ring glow tinted by the section palette.
     * @param {import('../entities/CurvedCorridor.js').CurvedCorridor} cc
     * @param {object} p  section palette
     */
    _drawCurvedCorridorBg(cc, p) {
        const ctx   = this._ctx;
        const inner = cc.innerRadius;
        const outer = cc.outerRadius;
        const start = cc.startAngle;
        const end   = cc.endAngle;
        const ccw   = end < start;

        const pulse  = 0.5 + 0.5 * Math.sin(this._time * 1.3);
        const glow   = p.wallGlow ?? p.wall ?? '#880088';
        const bgCol  = p.bg      ?? '#04020a';

        // Radial gradient: dark at inner edge → glow at centre ring → dark at outer edge
        const grad = ctx.createRadialGradient(cc.cx, cc.cy, inner, cc.cx, cc.cy, outer);
        grad.addColorStop(0,    _hexToRgba(bgCol, 0.97));
        grad.addColorStop(0.25, _hexToRgba(glow,  0.06 + 0.04 * pulse));
        grad.addColorStop(0.5,  _hexToRgba(glow,  0.16 + 0.08 * pulse));
        grad.addColorStop(0.75, _hexToRgba(glow,  0.06 + 0.04 * pulse));
        grad.addColorStop(1,    _hexToRgba(bgCol, 0.97));

        ctx.save();
        ctx.fillStyle = grad;
        ctx.beginPath();
        // Outer arc (forward), then inner arc (reverse) — closes the annular sector
        ctx.arc(cc.cx, cc.cy, outer, start, end, ccw);
        ctx.arc(cc.cx, cc.cy, inner, end, start, !ccw);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    _drawLight(l) {
        const ctx = this._ctx;
        const a   = l.intensity();
        ctx.save();
        ctx.shadowColor = l.color;
        ctx.shadowBlur  = 10 * a;
        ctx.fillStyle   = l.color;
        ctx.globalAlpha = 0.35 + 0.55 * a;
        ctx.beginPath();
        ctx.arc(l.x, l.y, l.radius * (0.9 + 0.2 * a), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    _drawTarget(t, p) {
        const ctx = this._ctx;

        // ── Respawning: animated pop-up from bottom ──────────────────────────
        if (t.respawning && t.respawnProgress > 0) {
            const prog = t.respawnProgress;          // 0..1
            const h    = t.h * prog;
            const y    = t.y + t.h - h;
            ctx.save();
            ctx.shadowColor = p.accent;
            ctx.shadowBlur  = 18 + 12 * prog;
            ctx.fillStyle   = p.accent2;
            ctx.fillRect(t.x, y, t.w, h);
            ctx.shadowBlur  = 0;
            ctx.strokeStyle = '#ffffff';
            ctx.globalAlpha = 0.5 * prog;
            ctx.lineWidth   = 1;
            ctx.strokeRect(t.x + 0.5, y + 0.5, t.w - 1, h - 1);
            ctx.restore();
            return;
        }

        // ── Down (flat line) ─────────────────────────────────────────────────
        if (!t.standing) {
            ctx.fillStyle = C.COLOR_DIM;
            ctx.fillRect(t.x, t.y + t.h - 2, t.w, 2);
            return;
        }

        // ── Standing ─────────────────────────────────────────────────────────
        ctx.save();
        ctx.shadowColor = p.wallGlow;
        ctx.shadowBlur  = 8;
        ctx.fillStyle   = t.flash > 0 ? p.accent : p.wall;
        ctx.fillRect(t.x, t.y, t.w, t.h);
        ctx.shadowBlur  = 0;
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = 0.6;
        ctx.lineWidth   = 1;
        ctx.strokeRect(t.x + 0.5, t.y + 0.5, t.w - 1, t.h - 1);
        ctx.restore();
    }

    _drawBumper(b, p) {
        const fired      = b.flash > 0;
        const flashRatio = Math.min(1, b.flash / 0.18);
        const pulse      = 0.5 + 0.5 * Math.sin(this._time * 3 + b.x * 0.07);
        const r          = b.r;
        // Damped 3-lobe rubber wobble: oscillates after impact, decays with flashRatio
        const rubberAmp  = Math.sin(flashRatio * Math.PI * 5) * (1 - flashRatio) * 4.5;
        // Solenoid pop: body scales up slightly at mid-flash (parabolic)
        const bodyPop    = 4 * flashRatio * (1 - flashRatio) * 0.07;
        // Idle animation: slow spoke rotation + LED chase phase (unique offset per bumper)
        const idleAngle  = this._time * 0.55;
        const chaseAngle = this._time * 3.5 + b.x * 0.05;
        this._drawBumperRubber(b, r, fired, flashRatio, rubberAmp, pulse, p);
        this._drawBumperMount(b, r, fired, flashRatio, p);
        this._drawBumperSegments(b, r, fired, flashRatio, pulse, chaseAngle, p);
        this._drawBumperBody(b, r, fired, flashRatio, bodyPop, idleAngle, p);
    }

    /** @private — elastic rubber ring with 3-lobe squash deformation on ball impact */
    _drawBumperRubber(b, r, fired, flashRatio, rubberAmp, pulse, p) {
        const ctx     = this._ctx;
        const rBase   = r + 7.5;
        const rInner  = r + 2;
        const pts     = 64;
        const breathe = 0.6 + 0.4 * pulse;

        ctx.save();
        ctx.shadowColor = fired ? p.accent : p.wallGlow;
        ctx.shadowBlur  = fired ? 20 * flashRatio : 5;

        // Outer rubber contour — deforms into 3-lobe shape on hit
        ctx.beginPath();
        for (let i = 0; i <= pts; i++) {
            const a  = (i / pts) * Math.PI * 2;
            const rv = rBase + rubberAmp * Math.sin(a * 3) + breathe * 0.4;
            if (i === 0) { ctx.moveTo(b.x + Math.cos(a) * rv, b.y + Math.sin(a) * rv); }
            else         { ctx.lineTo(b.x + Math.cos(a) * rv, b.y + Math.sin(a) * rv); }
        }
        ctx.closePath();

        const rubberGrad = ctx.createRadialGradient(b.x, b.y, rInner, b.x, b.y, rBase + 2);
        if (fired) {
            rubberGrad.addColorStop(0,    `rgba(105,58,8,${0.78 + 0.18 * flashRatio})`);
            rubberGrad.addColorStop(0.55, 'rgba(58,26,3,0.96)');
            rubberGrad.addColorStop(1,    'rgba(18,6,0,0.99)');
        } else {
            rubberGrad.addColorStop(0,    'rgba(52,58,70,0.90)');
            rubberGrad.addColorStop(0.55, 'rgba(28,32,42,0.95)');
            rubberGrad.addColorStop(1,    'rgba(10,10,16,0.98)');
        }
        ctx.fillStyle   = rubberGrad;
        ctx.fill();
        ctx.strokeStyle = fired ? p.accent : '#30404e';
        ctx.lineWidth   = 1.8;
        ctx.stroke();
        ctx.shadowBlur  = 0;

        // Inner rubber rim (deforms slightly less)
        ctx.beginPath();
        for (let i = 0; i <= pts; i++) {
            const a  = (i / pts) * Math.PI * 2;
            const rv = rInner + rubberAmp * 0.42 * Math.sin(a * 3 + 0.28);
            if (i === 0) { ctx.moveTo(b.x + Math.cos(a) * rv, b.y + Math.sin(a) * rv); }
            else         { ctx.lineTo(b.x + Math.cos(a) * rv, b.y + Math.sin(a) * rv); }
        }
        ctx.closePath();
        ctx.strokeStyle = fired
            ? `rgba(255,175,55,${0.45 + 0.5 * flashRatio})`
            : 'rgba(95,125,158,0.28)';
        ctx.lineWidth   = 0.9;
        ctx.stroke();

        // 12 radial grip ridges pressed into rubber surface
        ctx.strokeStyle = 'rgba(0,0,0,0.38)';
        ctx.lineWidth   = 0.65;
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(b.x + Math.cos(a) * (rInner + 0.8), b.y + Math.sin(a) * (rInner + 0.8));
            ctx.lineTo(b.x + Math.cos(a) * (rBase  - 1),   b.y + Math.sin(a) * (rBase  - 1));
            ctx.stroke();
        }

        ctx.restore();
    }

    /** @private — fixed metal mounting band with 24 dial ticks and 6 hex bolt studs */
    _drawBumperMount(b, r, fired, flashRatio, p) {
        const ctx   = this._ctx;
        const rBand = r + 2;
        const boltR = 2.4;
        const boltD = r + 4.8;

        ctx.save();

        // Metal band gradient
        const bandGrad = ctx.createRadialGradient(b.x, b.y, r - 0.5, b.x, b.y, rBand);
        if (fired) {
            bandGrad.addColorStop(0, `rgba(95,52,8,${0.85 + 0.12 * flashRatio})`);
            bandGrad.addColorStop(1, 'rgba(32,14,2,0.98)');
        } else {
            bandGrad.addColorStop(0, 'rgba(36,48,66,0.92)');
            bandGrad.addColorStop(1, 'rgba(12,16,26,0.97)');
        }
        ctx.beginPath();
        ctx.arc(b.x, b.y, rBand, 0, Math.PI * 2);
        ctx.fillStyle   = bandGrad;
        ctx.fill();
        ctx.strokeStyle = fired ? p.accent : '#1c2c40';
        ctx.lineWidth   = 1;
        ctx.shadowColor = fired ? p.accent : p.wallGlow;
        ctx.shadowBlur  = fired ? 12 * flashRatio : 3;
        ctx.stroke();

        // 24 fixed dial tick marks (no rotation)
        ctx.shadowBlur  = 0;
        ctx.strokeStyle = fired ? 'rgba(255,195,75,0.6)' : 'rgba(75,115,155,0.48)';
        for (let i = 0; i < 24; i++) {
            const a      = (i / 24) * Math.PI * 2;
            const isMain = i % 4 === 0;
            const r1     = rBand - 0.4;
            const r2     = r1 - (isMain ? 2.8 : 1.4);
            ctx.lineWidth = isMain ? 1 : 0.55;
            ctx.beginPath();
            ctx.moveTo(b.x + Math.cos(a) * r1, b.y + Math.sin(a) * r1);
            ctx.lineTo(b.x + Math.cos(a) * r2, b.y + Math.sin(a) * r2);
            ctx.stroke();
        }

        // 6 hex bolt studs at fixed positions
        this._drawBumperHexBolts(b, boltD, boltR, fired, flashRatio, p);

        ctx.restore();
    }

    /** @private — 6 fixed hex bolt studs riveted through the rubber ring */
    _drawBumperHexBolts(b, boltD, boltR, fired, flashRatio, p) {
        const ctx = this._ctx;
        ctx.save();
        ctx.shadowColor = fired ? p.accent : 'transparent';
        ctx.shadowBlur  = fired ? 9 * flashRatio : 0;
        for (let i = 0; i < 6; i++) {
            const a  = (i / 6) * Math.PI * 2 - Math.PI / 2;
            const bx = b.x + Math.cos(a) * boltD;
            const by = b.y + Math.sin(a) * boltD;
            ctx.beginPath();
            for (let v = 0; v < 6; v++) {
                const va = a + (v / 6) * Math.PI * 2;
                const hx = bx + Math.cos(va) * boltR;
                const hy = by + Math.sin(va) * boltR;
                if (v === 0) { ctx.moveTo(hx, hy); } else { ctx.lineTo(hx, hy); }
            }
            ctx.closePath();
            ctx.fillStyle   = fired ? '#e8c060' : '#3e5472';
            ctx.fill();
            ctx.shadowBlur  = 0;
            ctx.strokeStyle = 'rgba(0,0,0,0.65)';
            ctx.lineWidth   = 0.6;
            ctx.stroke();
            ctx.fillStyle = fired ? 'rgba(255,255,255,0.58)' : 'rgba(200,218,238,0.3)';
            ctx.beginPath();
            ctx.arc(bx, by, 0.75, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    /** @private — 8-segment LED activation ring */
    _drawBumperSegments(b, r, fired, flashRatio, pulse, chaseAngle, p) {
        const ctx      = this._ctx;
        const segCount = 8;
        const arc      = (Math.PI * 2 / segCount) * 0.72;
        const gap      = (Math.PI * 2 / segCount) * 0.28;
        const segR     = r - 1.5;

        ctx.save();
        ctx.lineWidth = 5;
        ctx.lineCap   = 'butt';

        for (let i = 0; i < segCount; i++) {
            const start = -Math.PI / 2 + (i / segCount) * Math.PI * 2 + gap / 2;
            const end   = start + arc;
            if (fired) {
                ctx.globalAlpha = 0.62 + 0.38 * flashRatio;
                ctx.strokeStyle = p.accent;
                ctx.shadowColor = p.accent;
                ctx.shadowBlur  = 15 + 10 * flashRatio;
            } else {
                // Idle chase: a bright peak (cos³ envelope) orbits the LED ring
                const segAngle = (i / segCount) * Math.PI * 2;
                const chase    = Math.pow(Math.max(0, Math.cos(segAngle - chaseAngle)), 3);
                ctx.globalAlpha = 0.12 + 0.55 * chase;
                ctx.strokeStyle = chase > 0.35 ? p.accent : p.wallGlow;
                ctx.shadowColor = p.accent;
                ctx.shadowBlur  = chase > 0.1 ? 12 * chase : 0;
            }
            ctx.beginPath();
            ctx.arc(b.x, b.y, segR, start, end);
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
        ctx.shadowBlur  = 0;
        ctx.restore();
    }

    /** @private — main disc body: engraved spokes, cap disc, solenoid pop on impact */
    _drawBumperBody(b, r, fired, flashRatio, bodyPop, idleAngle, p) {
        const ctx    = this._ctx;
        const pulse  = 0.5 + 0.5 * Math.sin(this._time * 3 + b.x * 0.07);
        const scale  = 1 + bodyPop;
        const rBody  = (r - 5) * scale;
        const rCap   = rBody * 0.6;
        const rSpoke = rBody * 0.82;

        ctx.save();

        // Outer body glow
        ctx.shadowColor = fired ? p.accent : p.wallGlow;
        ctx.shadowBlur  = fired ? 22 + 16 * flashRatio : 12 + 7 * pulse;

        // Main body radial gradient
        const bodyGrad = ctx.createRadialGradient(b.x - 3, b.y - 4, 1.5, b.x, b.y, rBody);
        bodyGrad.addColorStop(0,   fired ? '#ffffff'  : '#eee8ff');
        bodyGrad.addColorStop(0.3, fired ? p.accent   : p.accent2);
        bodyGrad.addColorStop(0.8, fired ? p.accent   : p.wall);
        bodyGrad.addColorStop(1,   'rgba(0,0,0,0.28)');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, rBody, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Body edge ring
        ctx.strokeStyle = fired ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.16)';
        ctx.lineWidth   = 1.1;
        ctx.beginPath();
        ctx.arc(b.x, b.y, rBody - 0.5, 0, Math.PI * 2);
        ctx.stroke();

        // 6 engraved spokes (asterisk) — rotate slowly in idle
        ctx.strokeStyle = fired ? 'rgba(0,0,0,0.38)' : 'rgba(0,0,0,0.28)';
        ctx.lineWidth   = 1.1;
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + idleAngle;
            ctx.beginPath();
            ctx.moveTo(b.x + Math.cos(a) * (rCap * 0.2), b.y + Math.sin(a) * (rCap * 0.2));
            ctx.lineTo(b.x + Math.cos(a) * rSpoke,         b.y + Math.sin(a) * rSpoke);
            ctx.stroke();
        }

        // Outer cap ring
        ctx.strokeStyle = fired ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.20)';
        ctx.lineWidth   = 1.1;
        ctx.beginPath();
        ctx.arc(b.x, b.y, rCap, 0, Math.PI * 2);
        ctx.stroke();

        // Cap disc fill
        const capGrad = ctx.createRadialGradient(b.x - 2, b.y - 2, 0.5, b.x, b.y, rCap);
        capGrad.addColorStop(0, fired ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.30)');
        capGrad.addColorStop(1, 'rgba(0,0,0,0.22)');
        ctx.fillStyle = capGrad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, rCap, 0, Math.PI * 2);
        ctx.fill();

        // Inner rivet ring
        ctx.strokeStyle = fired ? 'rgba(255,255,255,0.40)' : 'rgba(255,255,255,0.12)';
        ctx.lineWidth   = 0.75;
        ctx.beginPath();
        ctx.arc(b.x, b.y, rCap * 0.52, 0, Math.PI * 2);
        ctx.stroke();

        // Specular dome highlight
        ctx.globalAlpha = fired ? 0.96 : 0.5 + 0.38 * pulse;
        ctx.fillStyle   = '#ffffff';
        ctx.beginPath();
        ctx.arc(b.x - rBody * 0.27, b.y - rBody * 0.27, rBody * 0.19, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    _drawSling(s, p) {
        const dx = s.bx - s.ax;
        const dy = s.by - s.ay;
        const len = Math.hypot(dx, dy);
        if (len === 0) return;
        const tx         = dx / len;
        const ty         = dy / len;
        const fired      = s.flash > 0;
        const flashRatio = Math.min(1, s.flash / 0.15);
        this._drawSlingPlate(s, tx, ty, fired, p);
        this._drawSlingBand(s, fired, flashRatio, p);
        this._drawSlingBolts(s, fired, p);
    }

    /** @private — metal backing plate + rivets */
    _drawSlingPlate(s, tx, ty, fired, p) {
        const ctx     = this._ctx;
        const nx      = s.nx;
        const ny      = s.ny;
        const depth   = 9;
        const inset   = 5;
        const frontAx = s.ax + tx * inset;
        const frontAy = s.ay + ty * inset;
        const frontBx = s.bx - tx * inset;
        const frontBy = s.by - ty * inset;
        const backAx  = frontAx - nx * depth;
        const backAy  = frontAy - ny * depth;
        const backBx  = frontBx - nx * depth;
        const backBy  = frontBy - ny * depth;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(frontAx, frontAy);
        ctx.lineTo(frontBx, frontBy);
        ctx.lineTo(backBx,  backBy);
        ctx.lineTo(backAx,  backAy);
        ctx.closePath();

        const g = ctx.createLinearGradient(s.ax, s.ay, s.bx, s.by);
        if (fired) {
            g.addColorStop(0,   'rgba(255,80,40,0.55)');
            g.addColorStop(0.5, 'rgba(255,140,60,0.72)');
            g.addColorStop(1,   'rgba(255,80,40,0.55)');
        } else {
            g.addColorStop(0,   'rgba(18,28,48,0.88)');
            g.addColorStop(0.5, 'rgba(38,55,88,0.92)');
            g.addColorStop(1,   'rgba(18,28,48,0.88)');
        }
        ctx.fillStyle   = g;
        ctx.fill();
        ctx.strokeStyle = fired ? p.accent : '#2a3a5a';
        ctx.lineWidth   = 0.6;
        ctx.stroke();

        // Rivets along the back edge
        const segLen = Math.hypot(frontBx - frontAx, frontBy - frontAy);
        const count  = Math.max(2, Math.floor(segLen / 22));
        ctx.fillStyle  = fired ? '#ffee88' : '#4a6478';
        ctx.shadowBlur = 0;
        for (let i = 1; i < count; i++) {
            const t  = i / count;
            const rx = backAx + (backBx - backAx) * t;
            const ry = backAy + (backBy - backAy) * t;
            ctx.beginPath();
            ctx.arc(rx, ry, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    /** @private — curved rubber band with specular highlight */
    _drawSlingBand(s, fired, flashRatio, p) {
        const ctx   = this._ctx;
        const nx    = s.nx;
        const ny    = s.ny;
        const bulge = 4 + flashRatio * 14;
        const mx    = (s.ax + s.bx) / 2 + nx * bulge;
        const my    = (s.ay + s.by) / 2 + ny * bulge;

        ctx.save();
        ctx.lineCap = 'round';

        // Shadow/glow behind band
        ctx.shadowColor = fired ? p.accent : p.wallGlow;
        ctx.shadowBlur  = fired ? 24 : 9;

        // Main rubber
        ctx.beginPath();
        ctx.moveTo(s.ax, s.ay);
        ctx.quadraticCurveTo(mx, my, s.bx, s.by);
        ctx.strokeStyle = fired ? p.accent : '#b03800';
        ctx.lineWidth   = fired ? 7 : 4.5;
        ctx.stroke();

        // Specular line on rubber surface
        ctx.shadowBlur  = 0;
        ctx.beginPath();
        ctx.moveTo(s.ax, s.ay);
        ctx.quadraticCurveTo(mx, my, s.bx, s.by);
        ctx.strokeStyle = fired ? 'rgba(255,255,210,0.88)' : 'rgba(255,160,80,0.38)';
        ctx.lineWidth   = 1.2;
        ctx.stroke();

        ctx.restore();
    }

    /** @private — mechanical bolt mount at each endpoint */
    _drawSlingBolts(s, fired, p) {
        const ctx       = this._ctx;
        const boltColor = fired ? p.accent : '#6a8aaa';

        ctx.save();
        ctx.shadowColor = boltColor;
        ctx.shadowBlur  = fired ? 14 : 5;

        for (const pt of [{ x: s.ax, y: s.ay }, { x: s.bx, y: s.by }]) {
            // Outer mount ring
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
            ctx.fillStyle   = fired ? '#2a1800' : '#141e2e';
            ctx.fill();
            ctx.strokeStyle = boltColor;
            ctx.lineWidth   = 1.5;
            ctx.stroke();

            // Inner bolt cap
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 3.2, 0, Math.PI * 2);
            ctx.fillStyle = fired ? p.accent : '#3e5e7a';
            ctx.fill();

            // Cross-slot engraving
            ctx.strokeStyle = 'rgba(0,0,0,0.55)';
            ctx.lineWidth   = 0.8;
            ctx.beginPath();
            ctx.moveTo(pt.x - 1.8, pt.y); ctx.lineTo(pt.x + 1.8, pt.y);
            ctx.moveTo(pt.x, pt.y - 1.8); ctx.lineTo(pt.x, pt.y + 1.8);
            ctx.stroke();
        }

        ctx.shadowBlur = 0;
        ctx.restore();
    }

    _drawKicker(k, p) {
        const ctx    = this._ctx;
        const cx     = k.x + k.w / 2;
        const cy     = k.y + k.h / 2;
        const w      = k.w;
        const h      = k.h;
        const fire   = k.flash;
        const fired  = fire > 0;
        const kickT  = fired ? Math.min(1, fire / 0.25) : 0;  // 0..1 normalised kick phase
        const plateH = Math.max(4, h * 0.38);
        const kickOut = kickT * h * 0.9;                       // plate extension in local -y

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((k.angleDeg ?? 0) * Math.PI / 180);

        // ── Housing body ───────────────────────────────────────────────────
        ctx.shadowColor = fired ? p.accent : p.wallGlow;
        ctx.shadowBlur  = fired ? 20 : 6;
        ctx.fillStyle   = '#080812';
        ctx.fillRect(-w/2, -h/2, w, h);

        // Vertical ribs (mechanical segmentation)
        const ribCount = Math.max(3, Math.floor(w / 10));
        ctx.strokeStyle = p.accent;
        ctx.lineWidth   = 0.8;
        ctx.globalAlpha = 0.28;
        for (let i = 1; i < ribCount; i++) {
            const rx = -w/2 + i * (w / ribCount);
            ctx.beginPath();
            ctx.moveTo(rx, -h/2 + 2);
            ctx.lineTo(rx,  h/2 - 2);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Housing border
        ctx.strokeStyle = fired ? p.accent : p.wallGlow;
        ctx.lineWidth   = fired ? 2 : 1.5;
        ctx.shadowBlur  = fired ? 22 : 8;
        ctx.strokeRect(-w/2 + 0.5, -h/2 + 0.5, w - 1, h - 1);

        // ── Piston rods ────────────────────────────────────────────────────
        const rodTopY    = -h/2 - kickOut + plateH;
        const rodBottomY =  h/2 - 2;
        ctx.strokeStyle  = fired ? p.accent : '#44556a';
        ctx.lineWidth    = 1.5;
        ctx.shadowBlur   = fired ? 8 : 0;
        for (const rx of [-w * 0.28, w * 0.28]) {
            ctx.beginPath();
            ctx.moveTo(rx, rodTopY);
            ctx.lineTo(rx, rodBottomY);
            ctx.stroke();
        }

        // ── Launch surface plate (punches outward in local -y on fire) ─────
        const plateTopY = -h/2 - kickOut;
        ctx.shadowBlur  = fired ? 28 : 12;
        ctx.fillStyle   = fired ? '#ffffff' : p.accent;
        ctx.fillRect(-w/2 + 1, plateTopY, w - 2, plateH);

        // Plate highlight stripe
        ctx.shadowBlur  = 0;
        ctx.strokeStyle = 'rgba(255,255,255,0.65)';
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(-w/2 + 5, plateTopY + plateH * 0.45);
        ctx.lineTo( w/2 - 5, plateTopY + plateH * 0.45);
        ctx.stroke();

        // ── Corner bolts ───────────────────────────────────────────────────
        ctx.shadowBlur = 0;
        const bolts = [[-w/2+3.5, -h/2+3.5], [w/2-3.5, -h/2+3.5], [-w/2+3.5, h/2-3.5], [w/2-3.5, h/2-3.5]];
        for (const [bx, by] of bolts) {
            ctx.fillStyle = '#8899aa';
            ctx.beginPath();
            ctx.arc(bx, by, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#334455';
            ctx.lineWidth   = 0.8;
            ctx.beginPath();
            ctx.moveTo(bx - 1.5, by); ctx.lineTo(bx + 1.5, by);
            ctx.moveTo(bx, by - 1.5); ctx.lineTo(bx, by + 1.5);
            ctx.stroke();
        }

        ctx.restore();
    }

    _drawSpring(sp, p) {
        const ctx         = this._ctx;
        const compression = sp.flash;          // 1 = just fired (compressed), 0 = ready (extended)
        const fired       = compression > 0;
        const r           = sp.radius;
        const bodyLen     = r * 2.5;
        const padH        = r * 0.42;
        const padW        = r * 0.92;
        const dx = sp.dirX, dy = sp.dirY;
        const px = -dy,     py = dx;

        // Pre-compute all state-dependent style values (eliminates inline ternaries in hot path)
        const restRatio     = 1 - Math.min(1, compression);
        // Idle vibration fades smoothly to zero as the pad fires (physically correct)
        const idleOffset    = Math.sin(this._time * 9.5 + sp.x * 0.13) * 1.1 * restRatio;
        const mainColor     = fired ? p.accent : p.wall;
        const glowColor     = fired ? p.accent : p.wallGlow;
        const padColor      = fired ? '#ffffff' : p.accent;
        const boltColor     = fired ? '#e0b840' : '#3a5068';
        // glowK = 0 at rest, 1 when fired — drives all numeric glow values without extra ternaries
        const glowK         = fired ? 1 : 0;
        const baseShadow    = 4 + glowK * 10;
        const coilBlur      = 2 + glowK * 8;
        const padBlur       = 5 + glowK * 17;
        const baseHighlight = fired ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.10)';
        const coilShadow1   = fired ? 'rgba(180,90,5,0.28)' : 'rgba(25,50,80,0.38)';
        const frontFaceClr  = fired ? 'rgba(255,255,255,0.72)' : p.accent;
        const frontFaceBlur = 4 + glowK * 8;
        const sideWallClr   = fired ? p.accent : '#1c2c40';
        const bevelClr      = fired ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.15)';

        // Geometry
        const bx       = sp.x - dx * bodyLen;
        const by       = sp.y - dy * bodyLen;
        const padCX    = sp.x - dx * compression * bodyLen * 0.68 + dx * idleOffset;
        const padCY    = sp.y - dy * compression * bodyLen * 0.68 + dy * idleOffset;
        const coilEndX = padCX - dx * padH * 0.5;
        const coilEndY = padCY - dy * padH * 0.5;
        const coilAmp  = r * 0.3 * (0.55 + 0.45 * (1 - compression));
        const coilN    = 7;
        const steps    = 56;   // 8 sub-steps per loop

        ctx.save();

        // ── BASE MOUNT: thick plate + two mounting bolts ────────────────────
        ctx.shadowColor = glowColor;
        ctx.shadowBlur  = baseShadow;
        ctx.strokeStyle = mainColor;
        ctx.lineWidth   = padH + 4;
        ctx.lineCap     = 'butt';
        ctx.beginPath();
        ctx.moveTo(bx + px * (padW + 4), by + py * (padW + 4));
        ctx.lineTo(bx - px * (padW + 4), by - py * (padW + 4));
        ctx.stroke();
        ctx.shadowBlur  = 0;
        ctx.strokeStyle = baseHighlight;
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(bx + px * (padW + 4), by + py * (padW + 4));
        ctx.lineTo(bx - px * (padW + 4), by - py * (padW + 4));
        ctx.stroke();
        // Bolt 1
        const b1x = bx + px * padW * 0.52;
        const b1y = by + py * padW * 0.52;
        ctx.fillStyle   = boltColor;
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.lineWidth   = 0.6;
        ctx.beginPath(); ctx.arc(b1x, b1y, 2.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(b1x - 1.4, b1y); ctx.lineTo(b1x + 1.4, b1y);
        ctx.moveTo(b1x, b1y - 1.4); ctx.lineTo(b1x, b1y + 1.4);
        ctx.stroke();
        // Bolt 2
        const b2x = bx - px * padW * 0.52;
        const b2y = by - py * padW * 0.52;
        ctx.fillStyle   = boltColor;
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.lineWidth   = 0.6;
        ctx.beginPath(); ctx.arc(b2x, b2y, 2.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(b2x - 1.4, b2y); ctx.lineTo(b2x + 1.4, b2y);
        ctx.moveTo(b2x, b2y - 1.4); ctx.lineTo(b2x, b2y + 1.4);
        ctx.stroke();

        // ── COIL: two-pass depth illusion ───────────────────────────────────
        // Pass 1: wide dark shadow (simulates the back of the coil tube)
        ctx.shadowBlur  = 0;
        ctx.lineWidth   = 3.4;
        ctx.lineCap     = 'round';
        ctx.strokeStyle = coilShadow1;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        for (let i = 1; i <= steps; i++) {
            const t    = i / steps;
            const side = Math.sin(t * Math.PI * 2 * coilN) * coilAmp * 0.85;
            ctx.lineTo(bx + (coilEndX - bx) * t + px * side, by + (coilEndY - by) * t + py * side);
        }
        ctx.lineTo(coilEndX, coilEndY);
        ctx.stroke();
        // Pass 2: thin bright wire (front face of coil)
        ctx.shadowColor = glowColor;
        ctx.shadowBlur  = coilBlur;
        ctx.strokeStyle = mainColor;
        ctx.lineWidth   = 1.8;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        for (let i = 1; i <= steps; i++) {
            const t    = i / steps;
            const side = Math.sin(t * Math.PI * 2 * coilN) * coilAmp;
            ctx.lineTo(bx + (coilEndX - bx) * t + px * side, by + (coilEndY - by) * t + py * side);
        }
        ctx.lineTo(coilEndX, coilEndY);
        ctx.stroke();

        // ── PAD: plunger cap — body + front face + side walls + bevel ───────
        ctx.shadowColor = glowColor;
        ctx.shadowBlur  = padBlur;
        ctx.strokeStyle = padColor;
        ctx.lineWidth   = padH;
        ctx.lineCap     = 'butt';
        ctx.beginPath();
        ctx.moveTo(padCX + px * padW, padCY + py * padW);
        ctx.lineTo(padCX - px * padW, padCY - py * padW);
        ctx.stroke();
        const pFX = padCX + dx * padH * 0.5;
        const pFY = padCY + dy * padH * 0.5;
        ctx.strokeStyle = frontFaceClr;
        ctx.lineWidth   = 1.8;
        ctx.shadowBlur  = frontFaceBlur;
        ctx.beginPath();
        ctx.moveTo(pFX + px * padW, pFY + py * padW);
        ctx.lineTo(pFX - px * padW, pFY - py * padW);
        ctx.stroke();
        ctx.strokeStyle = sideWallClr;
        ctx.lineWidth   = 1.2;
        ctx.shadowBlur  = 0;
        ctx.beginPath();
        ctx.moveTo(padCX + px * padW, padCY + py * padW);
        ctx.lineTo(pFX   + px * padW, pFY   + py * padW);
        ctx.moveTo(padCX - px * padW, padCY - py * padW);
        ctx.lineTo(pFX   - px * padW, pFY   - py * padW);
        ctx.stroke();
        ctx.strokeStyle = bevelClr;
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(padCX + px * padW * 0.62, padCY + py * padW * 0.62);
        ctx.lineTo(padCX - px * padW * 0.62, padCY - py * padW * 0.62);
        ctx.stroke();

        ctx.restore();
    }

    _drawLaunchSpring(ls, p) {
        const ctx      = this._ctx;
        const style    = this._launchSpringStyle(ls, p);
        const r        = ls.radius;
        const padH     = r * 0.45;
        const padW     = r * 0.85;
        const amp      = r * 0.22;
        const dx = ls.dirX,  dy = ls.dirY;
        const px = -dy,      py = dx;   // perpendicular

        // Far end of the barrel (full extension point)
        const barX = ls.x + dx * ls.maxExtension;
        const barY = ls.y + dy * ls.maxExtension;

        ctx.save();
        ctx.shadowColor = style.glowColor;
        ctx.shadowBlur  = 6 + style.glowIntens * 20;

        // Guide rails (transparent tracks showing full travel distance)
        ctx.strokeStyle = p.wall;
        ctx.lineWidth   = 1.5;
        ctx.lineCap     = 'butt';
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.moveTo(ls.x + px * (padW + 3), ls.y + py * (padW + 3));
        ctx.lineTo(barX + px * (padW + 3), barY + py * (padW + 3));
        ctx.moveTo(ls.x - px * (padW + 3), ls.y - py * (padW + 3));
        ctx.lineTo(barX - px * (padW + 3), barY - py * (padW + 3));
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Base plate (fixed wall mount)
        ctx.strokeStyle = style.mainColor;
        ctx.lineWidth   = padH + 3;
        ctx.lineCap     = 'butt';
        ctx.beginPath();
        ctx.moveTo(ls.x + px * (padW + 4), ls.y + py * (padW + 4));
        ctx.lineTo(ls.x - px * (padW + 4), ls.y - py * (padW + 4));
        ctx.stroke();

        // Coil: zigzag from base to pad leading edge
        // Offset pad centre by (radius - padH/2) in the launch direction so the
        // visible face of the pad aligns with the circleVsCircle collision boundary.
        const padCX    = ls.tipX + dx * (r - padH * 0.5);
        const padCY    = ls.tipY + dy * (r - padH * 0.5);
        const coilEndX = padCX - dx * padH * 0.5;
        const coilEndY = padCY - dy * padH * 0.5;
        const clx      = coilEndX - ls.x;
        const cly      = coilEndY - ls.y;
        ctx.strokeStyle = style.mainColor;
        ctx.lineWidth   = 2;
        ctx.lineCap     = 'round';
        ctx.beginPath();
        ctx.moveTo(ls.x, ls.y);
        const coilN = 8;
        for (let i = 0; i < coilN; i++) {
            const t    = (i + 1) / (coilN + 1);
            const side = i % 2 === 0 ? amp : -amp;
            ctx.lineTo(ls.x + clx * t + px * side, ls.y + cly * t + py * side);
        }
        ctx.lineTo(coilEndX, coilEndY);
        ctx.stroke();

        // Launch pad (moves with chargeRatio)
        ctx.lineWidth   = padH;
        ctx.lineCap     = 'butt';
        ctx.strokeStyle = style.padColor;
        ctx.shadowBlur  = style.padBlur;
        ctx.beginPath();
        ctx.moveTo(padCX + px * padW, padCY + py * padW);
        ctx.lineTo(padCX - px * padW, padCY - py * padW);
        ctx.stroke();

        ctx.restore();
    }

    /** Compute state-based colors and glow values for a LaunchSpring. @private */
    _launchSpringStyle(ls, p) {
        const pull       = ls.pullRatio;   // 0 = extended/idle, 1 = fully retracted
        const isLocked   = ls.state === LaunchSpring.STATE.LOCKED;
        const isCharging = ls.state === LaunchSpring.STATE.CHARGING;

        let glowIntens;
        if (isLocked)        { glowIntens = 1; }
        else if (isCharging) { glowIntens = pull * 0.8; }
        else                 { glowIntens = 0.1; }

        let mainColor;
        if (isLocked)      { mainColor = '#ffffff'; }
        else if (pull > 0) { mainColor = p.accent; }
        else               { mainColor = p.wall; }

        let padBlur;
        if (isLocked)      { padBlur = 28; }
        else if (pull > 0) { padBlur = 14; }
        else               { padBlur = 4; }

        return {
            glowIntens,
            mainColor,
            padColor:  mainColor,
            glowColor: isLocked ? p.accent : p.wallGlow,
            padBlur,
        };
    }

    /** Draw death-line hazard segments for a section. @private */
    _drawDeathLines(section) {
        if (!section.deathLines?.length) return;
        const ctx = this._ctx;
        for (const d of section.deathLines) {
            const mx = (d.ax + d.bx) / 2;
            const my = (d.ay + d.by) / 2;
            ctx.save();
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur  = 14;
            ctx.strokeStyle = '#ff2222';
            ctx.lineWidth   = 2.5;
            ctx.lineCap     = 'round';
            ctx.beginPath();
            ctx.moveTo(d.ax, d.ay);
            ctx.lineTo(d.bx, d.by);
            ctx.stroke();
            ctx.restore();
            this._drawSkull(ctx, mx, my);
        }
    }

    /** Draw a minimal skull icon centered at (cx, cy). @private */
    _drawSkull(ctx, cx, cy) {
        const r = 7;
        ctx.save();
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur  = 10;
        ctx.strokeStyle = '#ff2222';
        ctx.fillStyle   = '#ff2222';
        ctx.lineWidth   = 1.2;
        // Cranium
        ctx.beginPath();
        ctx.arc(cx, cy - 1, r, Math.PI, 0);
        ctx.lineTo(cx + r, cy + 4);
        ctx.lineTo(cx - r, cy + 4);
        ctx.closePath();
        ctx.stroke();
        // Jaw slots (3 teeth gaps)
        ctx.lineWidth = 1;
        for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.moveTo(cx + i * 4, cy + 4);
            ctx.lineTo(cx + i * 4, cy + 8);
            ctx.stroke();
        }
        // Eyes
        for (const ex of [cx - 3, cx + 3]) {
            ctx.beginPath();
            ctx.arc(ex, cy - 2, 1.8, 0, Math.PI * 2);
            ctx.fill();
        }
        // Nose
        ctx.beginPath();
        ctx.moveTo(cx - 1.5, cy + 1);
        ctx.lineTo(cx, cy + 3);
        ctx.lineTo(cx + 1.5, cy + 1);
        ctx.stroke();
        ctx.restore();
    }

    _drawGate(g, p) {
        const ctx = this._ctx;
        ctx.save();
        ctx.strokeStyle = g.flash > 0 ? p.accent : C.COLOR_DIM;
        ctx.setLineDash([4, 4]);
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(g.x1, g.y);
        ctx.lineTo(g.x2, g.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    _drawBoss(boss, p) {
        const ctx = this._ctx;
        if (boss.state === BOSS_SLEEP || boss.state === BOSS_DEFEATED) return;
        if (boss.drawType === 'dragon') { this._drawDragonBoss(boss, p); return; }
        if (boss.drawType === 'demon')  { this._drawDemonBoss(boss, p);  return; }
        if (boss.drawType === 'golem')  { this._drawGolemBoss(boss, p);  return; }
        if (boss.drawType === 'witch')  { this._drawWitchBoss(boss, p);  return; }
        const flash = boss.flash > 0;
        const r     = boss.radius;
        ctx.save();
        ctx.shadowColor = p.wallGlow;
        ctx.shadowBlur  = 22;
        const g = ctx.createRadialGradient(boss.x, boss.y - r * 0.3, r * 0.2, boss.x, boss.y, r);
        g.addColorStop(0, flash ? '#fff' : '#ffaaaa');
        g.addColorStop(1, p.wall);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(boss.x, boss.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur  = 0;
        this._drawBossHorns(ctx, boss, r, p);
        this._drawBossEyes(ctx, boss, r, p);
        this._drawBossMouth(ctx, boss, r);
        this._drawBossHpBar(ctx, boss, r, p);
        ctx.restore();
    }

    /** @private — dragon-specific renderer (serpentine body + fanged head). */
    _drawDragonBoss(boss, p) {
        const ctx    = this._ctx;
        const t      = boss._movT ?? 0;
        const flash  = boss.flash > 0;
        const r      = boss.radius;
        const FIRE   = flash ? '#ffffff' : '#ff6600';
        const DEEP   = flash ? '#ffaaaa' : '#881100';
        const GLOW   = flash ? '#ffffff' : '#ff3300';

        ctx.save();

        // ── Body segments tail→neck (drawn first so head sits on top) ──────
        for (let i = 5; i >= 1; i--) {
            const ph = t - i * 0.2;
            const sx = boss.cx + Math.sin(ph * 1.6) * boss.range * (1 - i * 0.07);
            const sy = boss.cy + Math.cos(ph * 0.9) * 20;
            const sr = r * Math.max(0.22, 0.72 - i * 0.08);
            ctx.shadowColor = GLOW;
            ctx.shadowBlur  = 12;
            const sg = ctx.createRadialGradient(sx, sy - sr * 0.3, sr * 0.1, sx, sy, sr);
            sg.addColorStop(0, flash ? '#fff' : '#ff8833');
            sg.addColorStop(1, DEEP);
            ctx.fillStyle = sg;
            ctx.beginPath();
            ctx.arc(sx, sy, sr, 0, Math.PI * 2);
            ctx.fill();
        }

        // ── Head ────────────────────────────────────────────────────────────
        const hx     = boss.x;
        const hy     = boss.y;
        const facing = Math.cos(t * 1.6) >= 0 ? 1 : -1;

        // Horns first so skull covers their base
        ctx.shadowColor = GLOW;
        ctx.shadowBlur  = 8;
        ctx.fillStyle   = flash ? '#fff' : '#ffcc55';
        ctx.beginPath();   // main horn curves backward
        ctx.moveTo(hx - facing * r * 0.1, hy - r * 0.6);
        ctx.lineTo(hx - facing * r * 0.55, hy - r * 1.58);
        ctx.lineTo(hx + facing * r * 0.18, hy - r * 0.65);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();   // side horn
        ctx.moveTo(hx - facing * r * 0.55, hy - r * 0.32);
        ctx.lineTo(hx - facing * r,         hy - r * 1.05);
        ctx.lineTo(hx - facing * r * 0.28, hy - r * 0.38);
        ctx.closePath();
        ctx.fill();

        // Skull
        ctx.shadowColor = GLOW;
        ctx.shadowBlur  = 22;
        const hg = ctx.createRadialGradient(hx, hy - r * 0.25, r * 0.1, hx, hy, r);
        hg.addColorStop(0, flash ? '#fff' : '#ff9944');
        hg.addColorStop(1, DEEP);
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.ellipse(hx, hy, r, r * 0.88, 0, 0, Math.PI * 2);
        ctx.fill();

        // Upper jaw / snout
        ctx.shadowBlur = 10;
        ctx.fillStyle  = flash ? '#ffbbaa' : '#cc4400';
        ctx.beginPath();
        ctx.moveTo(hx + facing * r * 0.35, hy - r * 0.22);
        ctx.lineTo(hx + facing * r * 1.45, hy + r * 0.05);
        ctx.lineTo(hx + facing * r * 0.35, hy + r * 0.38);
        ctx.closePath();
        ctx.fill();

        // Lower jaw (open)
        ctx.fillStyle = flash ? '#ffaaaa' : '#992200';
        ctx.beginPath();
        ctx.moveTo(hx + facing * r * 0.35, hy + r * 0.22);
        ctx.lineTo(hx + facing * r * 1.3,  hy + r * 0.38);
        ctx.lineTo(hx + facing * r * 0.35, hy + r * 0.54);
        ctx.closePath();
        ctx.fill();

        // Fang
        ctx.shadowColor = '#fff';
        ctx.shadowBlur  = 6;
        ctx.fillStyle   = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(hx + facing * r * 0.7,  hy + r * 0.2);
        ctx.lineTo(hx + facing * r * 0.85, hy + r * 0.46);
        ctx.lineTo(hx + facing * r,         hy + r * 0.2);
        ctx.closePath();
        ctx.fill();

        // Fire breath (flickers)
        const flick   = 0.78 + 0.22 * Math.sin(this._time * 15);
        const fx      = hx + facing * (r * 1.35 + r * 0.65);
        const fy      = hy + r * 0.22 + Math.sin(this._time * 11) * 3;
        ctx.globalAlpha = 0.72 * flick;
        const fg = ctx.createRadialGradient(fx - facing * r * 0.3, fy, 2, fx, fy, r * 0.85 * flick);
        fg.addColorStop(0,   '#ffff99');
        fg.addColorStop(0.4, FIRE);
        fg.addColorStop(1,   'rgba(255,50,0,0)');
        ctx.shadowColor = '#ff4400';
        ctx.shadowBlur  = 18;
        ctx.fillStyle   = fg;
        ctx.beginPath();
        ctx.ellipse(fx, fy, r * 0.82 * flick, r * 0.2 * flick, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Eye with vertical slit pupil
        const eyeX = hx + facing * r * 0.15;
        const eyeY = hy - r * 0.18;
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur  = 14;
        ctx.fillStyle   = '#ffee00';
        ctx.beginPath();
        ctx.ellipse(eyeX, eyeY, 5.5, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle  = '#000';
        ctx.beginPath();
        ctx.ellipse(eyeX + facing * 1.5, eyeY, 2, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // HP bar
        this._drawBossHpBar(ctx, boss, r, p);

        ctx.restore();
    }

    /** @private — demon boss: 3-phase Hell Lord with orbiting fire, curved horns, fire cracks. */
    _drawDemonBoss(boss, p) {
        const ctx   = this._ctx;
        const t     = this._time;
        const flash = boss.flash > 0;
        const ph    = boss.phase ?? 0;
        const r     = boss.radius;

        ctx.save();

        // ── Arena dashed ring ────────────────────────────────────────────────
        if (boss.arenaRadius) {
            const pulse = 0.3 + 0.12 * Math.sin(t * 1.8);
            ctx.globalAlpha = pulse;
            ctx.strokeStyle = '#cc0000';
            ctx.lineWidth   = 1.5;
            ctx.setLineDash([8, 12]);
            ctx.beginPath();
            ctx.arc(boss.cx, boss.cy, boss.arenaRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = 1;
        }

        this._drawDemonOrbits(ctx, boss, r, ph, flash, t);
        this._drawDemonHorns(ctx, boss, r, ph, flash);
        this._drawDemonBody(ctx, boss, r, ph, flash);
        this._drawDemonFace(ctx, boss, r, ph, flash, t);
        this._drawBossHpBar(ctx, boss, r, p);
        ctx.restore();
    }

    /** @private */
    _drawDemonOrbits(ctx, boss, r, ph, flash, t) {
        for (let i = 0; i < 3; i++) {
            const angle  = t * (0.95 + i * 0.38) + i * (Math.PI * 2 / 3);
            const orbitR = r * (1.8 + ph * 0.35);
            const sx = boss.x + Math.cos(angle) * orbitR;
            const sy = boss.y + Math.sin(angle) * orbitR * 0.7;
            const sr = 4 + ph * 1.5;
            ctx.shadowColor = '#ff4400';
            ctx.shadowBlur  = 10;
            ctx.fillStyle   = flash ? '#ffffff' : '#ff6600';
            ctx.beginPath();
            ctx.arc(sx, sy, sr, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /** @private */
    _drawDemonHorns(ctx, boss, r, ph, flash) {
        const hs = 1 + ph * 0.35;
        ctx.shadowColor = flash ? '#fff' : '#660000';
        ctx.shadowBlur  = 8;
        ctx.fillStyle   = flash ? '#ffffff' : '#1a0000';
        ctx.beginPath();
        ctx.moveTo(boss.x - r * 0.35, boss.y - r * 0.6);
        ctx.bezierCurveTo(
            boss.x - r * 0.9 * hs, boss.y - r * 1.4 * hs,
            boss.x - r * 1.1 * hs, boss.y - r * hs,
            boss.x - r * 0.55 * hs, boss.y - r * 0.42
        );
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(boss.x + r * 0.35, boss.y - r * 0.6);
        ctx.bezierCurveTo(
            boss.x + r * 0.9 * hs, boss.y - r * 1.4 * hs,
            boss.x + r * 1.1 * hs, boss.y - r * hs,
            boss.x + r * 0.55 * hs, boss.y - r * 0.42
        );
        ctx.closePath();
        ctx.fill();
    }

    /** @private */
    _drawDemonBody(ctx, boss, r, ph, flash) {
        ctx.shadowColor = flash ? '#ffffff' : '#ff0000';
        ctx.shadowBlur  = 28;
        const bg = ctx.createRadialGradient(boss.x, boss.y - r * 0.3, r * 0.15, boss.x, boss.y, r);
        const bodyColor = ph >= 2 ? '#ff4400' : '#cc2200';
        bg.addColorStop(0, flash ? '#ffffff' : bodyColor);
        bg.addColorStop(0.6, flash ? '#ffaaaa' : '#550000');
        bg.addColorStop(1, '#1a0000');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(boss.x, boss.y, r, 0, Math.PI * 2);
        ctx.fill();
        if (ph >= 2 && !flash) {
            ctx.strokeStyle = '#ff6600';
            ctx.lineWidth   = 1.2;
            ctx.shadowColor = '#ff3300';
            ctx.shadowBlur  = 8;
            const cracks = [[0.1,-0.5,0.4,-0.9],[-0.3,0.2,-0.7,0.6],[0.5,0.1,0.85,0.5],[-0.1,0.4,0.3,0.9]];
            for (const [x1,y1,x2,y2] of cracks) {
                ctx.beginPath();
                ctx.moveTo(boss.x + r * x1, boss.y + r * y1);
                ctx.lineTo(boss.x + r * x2, boss.y + r * y2);
                ctx.stroke();
            }
        }
    }

    /** @private */
    _drawDemonFace(ctx, boss, r, ph, flash, t) {
        const eyeSize = 5.5 + ph * 2;
        ctx.shadowColor = flash ? '#ffffff' : '#ff2200';
        ctx.shadowBlur  = 16;
        ctx.fillStyle   = flash ? '#ffffff' : '#ff2200';
        for (const ex of [boss.x - r * 0.32, boss.x + r * 0.32]) {
            ctx.beginPath();
            ctx.ellipse(ex, boss.y - r * 0.2, eyeSize, eyeSize * 0.75, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.fillStyle = '#000000';
        ctx.shadowBlur = 0;
        for (const ex of [boss.x - r * 0.32, boss.x + r * 0.32]) {
            ctx.beginPath();
            ctx.ellipse(ex, boss.y - r * 0.2, 2.5, eyeSize * 0.65, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        const mo    = boss.mouthOpen ?? 0.5;
        const mhMax = r * 0.28 * (0.2 + 0.8 * mo);
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(boss.x, boss.y + r * 0.36, r * 0.55, mhMax, 0, 0, Math.PI * 2);
        ctx.fill();
        if (mo > 0.4) {
            ctx.fillStyle = flash ? '#ffaaff' : '#dddddd';
            for (const fx of [boss.x - r * 0.28, boss.x + r * 0.28]) {
                ctx.beginPath();
                ctx.moveTo(fx - 4, boss.y + r * 0.3);
                ctx.lineTo(fx,     boss.y + r * 0.3 + mhMax * 1.4);
                ctx.lineTo(fx + 4, boss.y + r * 0.3);
                ctx.closePath();
                ctx.fill();
            }
        }
        void 0; // boss.mouthOpen drives mhMax via mo assignment above
    }

    // Note: _drawDemonFace t param is intentionally unused at this layer
    // (mouth animation is driven by boss.mouthOpen computed in stateUpdate).

    /** @private — golem boss: stone titan with angular body, orbiting rocks, crystal eyes, cracks. */
    _drawGolemBoss(boss, p) {
        const ctx      = this._ctx;
        const t        = this._time;
        const flash    = boss.flash > 0;
        const r        = boss.radius;
        const hpRatio  = boss.hp / boss.maxHp;

        ctx.save();

        // ── Arena dashed ring ────────────────────────────────────────────────
        if (boss.arenaRadius) {
            ctx.globalAlpha = 0.22;
            ctx.strokeStyle = '#778899';
            ctx.lineWidth   = 2;
            ctx.setLineDash([10, 8]);
            ctx.beginPath();
            ctx.arc(boss.cx, boss.cy, boss.arenaRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = 1;
        }

        this._drawGolemRocks(ctx, boss, r, flash, t);
        this._drawGolemBody(ctx, boss, r, flash, hpRatio);
        this._drawBossHpBar(ctx, boss, r, p);
        ctx.restore();
    }

    /** @private */
    _drawGolemRocks(ctx, boss, r, flash, t) {
        for (let i = 0; i < 3; i++) {
            const angle  = t * (0.6 - i * 0.15) + i * (Math.PI * 2 / 3);
            const orbitR = r * 1.9;
            const sx = boss.x + Math.cos(angle) * orbitR;
            const sy = boss.y + Math.sin(angle) * orbitR * 0.6;
            const cs = 8 + i * 3;
            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(angle * 2);
            ctx.shadowColor = '#aabbcc';
            ctx.shadowBlur  = 6;
            ctx.fillStyle   = flash ? '#ffffff' : '#556677';
            ctx.beginPath();
            ctx.moveTo(0, -cs);
            ctx.lineTo(cs * 0.7, -cs * 0.3);
            ctx.lineTo(cs * 0.9,  cs * 0.5);
            ctx.lineTo(0,          cs * 0.8);
            ctx.lineTo(-cs * 0.8,  cs * 0.4);
            ctx.lineTo(-cs * 0.6, -cs * 0.6);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }

    /** @private */
    _drawGolemBody(ctx, boss, r, flash, hpRatio) {
        ctx.shadowColor = flash ? '#ffffff' : '#445566';
        ctx.shadowBlur  = 20;
        const bg = ctx.createRadialGradient(boss.x - r * 0.2, boss.y - r * 0.3, r * 0.1, boss.x, boss.y, r);
        bg.addColorStop(0,   flash ? '#ffffff' : '#8899aa');
        bg.addColorStop(0.5, flash ? '#bbbbbb' : '#445566');
        bg.addColorStop(1,   '#1a2230');
        ctx.fillStyle = bg;
        ctx.beginPath();
        const vx = [0,-r, r*0.72,-r*0.72, r,0, r*0.72,r*0.72, 0,r*0.88, -r*0.72,r*0.72, -r,0, -r*0.72,-r*0.72];
        ctx.moveTo(boss.x + vx[0], boss.y + vx[1]);
        for (let i = 2; i < vx.length; i += 2) ctx.lineTo(boss.x + vx[i], boss.y + vx[i + 1]);
        ctx.closePath();
        ctx.fill();
        // Brow
        ctx.fillStyle = flash ? '#dddddd' : '#334455';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(boss.x - r * 0.8, boss.y - r * 0.2);
        ctx.lineTo(boss.x + r * 0.8, boss.y - r * 0.2);
        ctx.lineTo(boss.x + r * 0.7, boss.y - r * 0.02);
        ctx.lineTo(boss.x - r * 0.7, boss.y - r * 0.02);
        ctx.closePath();
        ctx.fill();
        // Crystal eyes
        const ep = 0.7 + 0.3 * Math.sin(this._time * 2.5);
        ctx.shadowColor = '#00bbff';
        ctx.shadowBlur  = 14;
        ctx.fillStyle   = flash ? '#ffffff' : `rgba(0,180,255,${ep})`;
        ctx.fillRect(boss.x - r * 0.52, boss.y - r * 0.16, r * 0.32, r * 0.22);
        ctx.fillRect(boss.x + r * 0.2,  boss.y - r * 0.16, r * 0.32, r * 0.22);
        // Mouth
        ctx.fillStyle  = '#000000';
        ctx.shadowBlur = 0;
        ctx.fillRect(boss.x - r * 0.45, boss.y + r * 0.3, r * 0.9, r * 0.14);
        ctx.fillStyle = flash ? '#ffeeee' : '#aabbcc';
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(boss.x - r * 0.38 + i * r * 0.24, boss.y + r * 0.3, r * 0.14, r * 0.12);
        }
        // Cracks (deepen as HP drops)
        if (!flash) {
            const crackCount = Math.floor((1 - hpRatio) * 6);
            ctx.strokeStyle  = '#223344';
            ctx.lineWidth    = 1;
            const allCracks  = [
                [[-0.2,-0.5],[0.1,-0.1],[-0.3,0.3]],  [[0.4,-0.3],[0.6,0.2]],
                [[-0.5,0.1],[-0.2,0.5]],              [[0.2,0.4],[0.5,0.7]],
                [[-0.4,-0.6],[-0.1,-0.9]],            [[0.3,-0.7],[0.6,-0.3],[0.8,0.1]],
            ];
            for (let ci = 0; ci < crackCount; ci++) {
                const crack = allCracks[ci];
                ctx.beginPath();
                ctx.moveTo(boss.x + crack[0][0] * r, boss.y + crack[0][1] * r);
                for (let k = 1; k < crack.length; k++) ctx.lineTo(boss.x + crack[k][0] * r, boss.y + crack[k][1] * r);
                ctx.stroke();
            }
        }
    }

    /** @private — witch boss: floating sorceress with orbital orbs, pointed hat, crescent grin, blink fade. */
    _drawWitchBoss(boss, p) {
        const ctx  = this._ctx;
        const t    = this._time;
        const flash = boss.flash > 0;
        const r    = boss.radius;
        const fade = boss.fade ?? 1;

        if (fade <= 0.02) return;
        ctx.save();
        ctx.globalAlpha = fade;

        // ── Arena: rotating dashed rune ring ───────────────────────────────
        if (boss.arenaRadius) {
            const pulse = 0.28 + 0.14 * Math.sin(t * 2.2);
            ctx.globalAlpha  = fade * pulse;
            ctx.strokeStyle  = '#cc00ff';
            ctx.lineWidth    = 1.5;
            ctx.setLineDash([6, 10]);
            ctx.lineDashOffset = -t * 38;
            ctx.beginPath();
            ctx.arc(boss.cx, boss.cy, boss.arenaRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.lineDashOffset = 0;
            ctx.globalAlpha  = fade;
        }

        this._drawWitchOrbs(ctx, boss, r, flash, t);
        this._drawWitchBody(ctx, boss, r, flash, t);
        this._drawBossHpBar(ctx, boss, r, p);
        ctx.restore();
    }

    /** @private */
    _drawWitchOrbs(ctx, boss, r, flash, t) {
        const COLORS = ['#ff44ff', '#8800ff', '#44aaff', '#ffff00'];
        for (let i = 0; i < 4; i++) {
            const dir    = i % 2 === 0 ? 1 : -1;
            const angle  = t * (0.7 + i * 0.25) * dir + i * (Math.PI / 2);
            const orbR   = r * (2 + i * 0.4);
            const ox     = boss.x + Math.cos(angle) * orbR;
            const oy     = boss.y + Math.sin(angle) * orbR * 0.55;
            const os     = 4.5 - i * 0.5;
            ctx.shadowColor = COLORS[i];
            ctx.shadowBlur  = 12;
            ctx.fillStyle   = flash ? '#ffffff' : COLORS[i];
            ctx.beginPath();
            ctx.arc(ox, oy, os, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /** @private */
    _drawWitchBody(ctx, boss, r, flash, t) {
        this._drawWitchRobesAndHat(ctx, boss, r, flash, t);
        this._drawWitchFace(ctx, boss, r, flash);
    }

    /** @private */
    _drawWitchRobesAndHat(ctx, boss, r, flash, t) {
        // Robes
        ctx.shadowColor = flash ? '#ffffff' : '#660099';
        ctx.shadowBlur  = 16;
        const rg = ctx.createLinearGradient(boss.x - r, boss.y, boss.x + r, boss.y + r * 2.2);
        rg.addColorStop(0, flash ? '#ffffff' : '#8800dd');
        rg.addColorStop(1, flash ? '#ddaaff' : '#220044');
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.moveTo(boss.x,           boss.y + r * 0.5);
        ctx.lineTo(boss.x - r * 1.2, boss.y + r * 2.5);
        ctx.lineTo(boss.x + r * 1.2, boss.y + r * 2.5);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = flash ? '#ffffff' : '#cc66ff';
        ctx.lineWidth   = 1;
        ctx.shadowBlur  = 4;
        ctx.stroke();
        // Hat brim
        const hg = ctx.createLinearGradient(boss.x, boss.y - r * 3.5, boss.x, boss.y - r * 0.5);
        hg.addColorStop(0, flash ? '#ffffff' : '#550077');
        hg.addColorStop(1, flash ? '#ddaaff' : '#1a0033');
        ctx.fillStyle   = hg;
        ctx.shadowColor = '#aa00ff';
        ctx.shadowBlur  = 14;
        ctx.beginPath();
        ctx.ellipse(boss.x, boss.y - r * 0.5, r * 1.45, r * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        // Hat cone
        ctx.beginPath();
        ctx.moveTo(boss.x - r * 1.1, boss.y - r * 0.5);
        ctx.lineTo(boss.x + r * 0.3, boss.y - r * 3.3);
        ctx.lineTo(boss.x + r * 1.1, boss.y - r * 0.5);
        ctx.closePath();
        ctx.fill();
        // Spinning star on hat
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur  = 10;
        ctx.fillStyle   = flash ? '#ffffff' : '#ffee00';
        const sx = boss.x + r * 0.15;
        const sy = boss.y - r * 2.2;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const a  = (i * 4 * Math.PI) / 5 - Math.PI / 2 + t * 1.5;
            const a2 = ((i * 4 + 2) * Math.PI) / 5 - Math.PI / 2 + t * 1.5;
            if (i === 0) ctx.moveTo(sx + Math.cos(a) * 5,  sy + Math.sin(a) * 5);
            else         ctx.lineTo(sx + Math.cos(a) * 5,  sy + Math.sin(a) * 5);
            ctx.lineTo(sx + Math.cos(a2) * 2, sy + Math.sin(a2) * 2);
        }
        ctx.closePath();
        ctx.fill();
    }

    /** @private */
    _drawWitchFace(ctx, boss, r, flash) {
        ctx.shadowColor = flash ? '#ffffff' : '#9900cc';
        ctx.shadowBlur  = 8;
        const fg = ctx.createRadialGradient(boss.x, boss.y - r * 0.1, 2, boss.x, boss.y, r);
        fg.addColorStop(0, flash ? '#ffffff' : '#ddbbee');
        fg.addColorStop(1, flash ? '#ffaaff' : '#772299');
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.arc(boss.x, boss.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur  = 12;
        ctx.fillStyle   = flash ? '#ffffff' : '#00ff88';
        ctx.beginPath();
        ctx.arc(boss.x - r * 0.35, boss.y - r * 0.15, 3.5, 0, Math.PI * 2);
        ctx.arc(boss.x + r * 0.35, boss.y - r * 0.15, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur  = 0;
        ctx.strokeStyle = flash ? '#ffffff' : '#1a0033';
        ctx.lineWidth   = 1.8;
        ctx.beginPath();
        ctx.arc(boss.x, boss.y + r * 0.2, r * 0.42, 0.2, Math.PI - 0.2);
        ctx.stroke();
    }

    /** @private */
    _drawBossHorns(ctx, boss, r) {
        ctx.fillStyle = '#1a0010';
        ctx.beginPath();
        ctx.moveTo(boss.x - r * 0.7, boss.y - r * 0.6);
        ctx.lineTo(boss.x - r * 0.4, boss.y - r * 1.15);
        ctx.lineTo(boss.x - r * 0.2, boss.y - r * 0.55);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(boss.x + r * 0.7, boss.y - r * 0.6);
        ctx.lineTo(boss.x + r * 0.4, boss.y - r * 1.15);
        ctx.lineTo(boss.x + r * 0.2, boss.y - r * 0.55);
        ctx.closePath();
        ctx.fill();
    }

    /** @private */
    _drawBossEyes(ctx, boss, r, p) {
        ctx.shadowColor = p.accent;
        ctx.shadowBlur  = 8;
        ctx.fillStyle   = p.accent;
        ctx.beginPath();
        ctx.arc(boss.x - r * 0.35, boss.y - r * 0.15, 4, 0, Math.PI * 2);
        ctx.arc(boss.x + r * 0.35, boss.y - r * 0.15, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    /** @private */
    _drawBossMouth(ctx, boss, r) {
        const mw = r * 0.7;
        const mh = r * 0.18 * (0.6 + 0.4 * Math.sin(this._time * 3));
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(boss.x, boss.y + r * 0.3, mw / 2, mh, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    /** @private */
    _drawBossHpBar(ctx, boss, r, p) {
        const w = r * 2;
        const x = boss.x - r;
        const y = boss.y - r - 14;
        ctx.fillStyle = '#000';
        ctx.fillRect(x, y, w, 5);
        ctx.fillStyle = p.accent;
        ctx.fillRect(x, y, w * (boss.hp / boss.maxHp), 5);
    }

    _drawFlipper(f, p) {
        const ctx = this._ctx;
        const ex  = f.pivot.x + Math.cos(f.angle) * f.length * f.side;
        const ey  = f.pivot.y + Math.sin(f.angle) * f.length;
        ctx.save();
        this._drawFlipperBody(f, ex, ey, p);
        if (f.active) this._drawFlipperChaseLights(f, ex, ey, p);
        this._drawFlipperPivotHub(f, p);
        ctx.restore();
    }

    /**
     * Tapered mechanical body: thick at pivot, narrow at tip.
     * Filled with metallic gradient + highlight stripe + ribs.
     * @private
     */
    _drawFlipperBody(f, ex, ey, p) {
        const ctx = this._ctx;
        const dx  = ex - f.pivot.x;
        const dy  = ey - f.pivot.y;

        const axisAngle = Math.atan2(dy, dx);
        const perpAngle = axisAngle - Math.PI / 2;
        const perpX     = Math.cos(perpAngle);
        const perpY     = Math.sin(perpAngle);

        const rBase = f.hitThickness * 0.72;
        const rTip  = f.hitThickness * 0.28;

        // Corner points for upper edge (highlight stripe)
        const p1x = f.pivot.x + perpX * rBase;  const p1y = f.pivot.y + perpY * rBase;
        const p4x = ex         + perpX * rTip;   const p4y = ey         + perpY * rTip;

        // Body gradient (pivot → tip)
        const grad = ctx.createLinearGradient(f.pivot.x, f.pivot.y, ex, ey);
        if (f.active) {
            const pulse = 0.8 + 0.2 * Math.sin(this._time * 9);
            grad.addColorStop(0,   '#1a0830');
            grad.addColorStop(0.3, p.wall);
            grad.addColorStop(0.7, p.accent);
            grad.addColorStop(1,   `rgba(255,255,255,${(0.7 * pulse).toFixed(2)})`);
        } else {
            grad.addColorStop(0, '#120625');
            grad.addColorStop(1, p.wall + 'cc');
        }

        ctx.save();
        ctx.shadowColor = f.active ? p.accent : p.wallGlow;
        ctx.shadowBlur  = f.active ? 32 * (0.85 + 0.15 * Math.sin(this._time * 8)) : 10;
        ctx.fillStyle   = grad;

        // Tapered polygon: upper edge → rounded tip cap → lower edge → rounded pivot cap
        ctx.beginPath();
        ctx.moveTo(p1x, p1y);
        ctx.lineTo(p4x, p4y);
        ctx.arc(ex, ey, rTip, perpAngle, perpAngle + Math.PI, false);
        ctx.arc(f.pivot.x, f.pivot.y, rBase, perpAngle + Math.PI, perpAngle, false);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;

        // Metallic highlight stripe along the upper edge
        const hiGrad = ctx.createLinearGradient(f.pivot.x, f.pivot.y, ex, ey);
        hiGrad.addColorStop(0,   'rgba(255,255,255,0.0)');
        hiGrad.addColorStop(0.3, `rgba(255,255,255,${f.active ? 0.65 : 0.22})`);
        hiGrad.addColorStop(0.8, `rgba(255,255,255,${f.active ? 0.45 : 0.12})`);
        hiGrad.addColorStop(1,   'rgba(255,255,255,0.0)');
        ctx.strokeStyle = hiGrad;
        ctx.lineWidth   = 1.5;
        ctx.lineCap     = 'round';
        ctx.beginPath();
        ctx.moveTo(p1x, p1y);
        ctx.lineTo(p4x, p4y);
        ctx.stroke();

        // Mechanical ribs (cross-grooves at even intervals)
        const ribCount  = Math.max(3, Math.floor(f.length / 13));
        ctx.strokeStyle = f.active ? p.accent + '55' : p.wallGlow + '66';
        ctx.lineWidth   = 0.9;
        ctx.globalAlpha = f.active ? 0.55 : 0.35;
        for (let i = 1; i < ribCount; i++) {
            const tt   = i / ribCount;
            const ribR = rBase + (rTip - rBase) * tt;
            const ribX = f.pivot.x + dx * tt;
            const ribY = f.pivot.y + dy * tt;
            ctx.beginPath();
            ctx.moveTo(ribX + perpX * ribR, ribY + perpY * ribR);
            ctx.lineTo(ribX - perpX * ribR, ribY - perpY * ribR);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    /** @private */
    _drawFlipperChaseLights(f, ex, ey, p) {
        const ctx   = this._ctx;
        const N     = 6;
        const phase = (this._time * 4.5) % 1;
        ctx.shadowBlur = 0;
        for (let i = 0; i < N; i++) {
            const t  = ((i / N) + phase) % 1;
            const lx = f.pivot.x + (ex - f.pivot.x) * t;
            const ly = f.pivot.y + (ey - f.pivot.y) * t;
            const a  = Math.sin(t * Math.PI) * 0.95;
            ctx.globalAlpha = a;
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur  = 6;
            ctx.fillStyle   = t > 0.7 ? '#ffffff' : p.accent;
            ctx.beginPath();
            ctx.arc(lx, ly, 2.8, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur  = 0;
        ctx.globalAlpha = 1;
    }

    /**
     * Gear-hub pivot: outer ring with rotating teeth, dark inner hub, hex bolt.
     * @private
     */
    _drawFlipperPivotHub(f, p) {
        const ctx    = this._ctx;
        const R      = f.hitThickness * 0.82;
        const rRoot  = R * 0.75;            // gear valley (root) radius
        const rInner = R * 0.44;            // axle-hole radius
        const rBolt  = rInner * 0.52;
        const rot    = this._time * (f.active ? 4.5 : 1.2);
        const teeth  = 8;

        const ringColor = f.active ? p.accent   : p.wall;
        const glowColor = f.active ? p.accent   : p.wallGlow;
        const gearAlpha = f.active ? 0.9        : 0.65;
        const gearBlur  = f.active ? 12         : 5;
        const hubRim    = f.active ? p.wallGlow : p.wall + '88';
        const boltAlpha = f.active ? 0.95       : 0.55;
        const boltBlur  = f.active ? 6          : 0;

        ctx.save();
        ctx.translate(f.pivot.x, f.pivot.y);

        // Solid gear shape: proper involute profile (valley arcs + straight flanks + tip arcs)
        ctx.shadowColor = glowColor;
        ctx.shadowBlur  = gearBlur;
        ctx.fillStyle   = ringColor;
        ctx.globalAlpha = gearAlpha;
        this._drawGearShape(ctx, teeth, rot, R, rRoot);
        ctx.fill();
        // Crisp mechanical outline (no glow)
        ctx.shadowBlur  = 0;
        ctx.strokeStyle = ringColor;
        ctx.lineWidth   = 0.8;
        ctx.globalAlpha = 0.55;
        ctx.stroke();

        // Dark axle-hole fill
        ctx.fillStyle   = '#06001a';
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(0, 0, rInner, 0, Math.PI * 2);
        ctx.fill();

        // Axle-hole rim
        ctx.strokeStyle = hubRim;
        ctx.lineWidth   = 1.2;
        ctx.beginPath();
        ctx.arc(0, 0, rInner, 0, Math.PI * 2);
        ctx.stroke();

        // Rotating hex bolt
        ctx.strokeStyle = ringColor;
        ctx.lineWidth   = 1.2;
        ctx.globalAlpha = boltAlpha;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur  = boltBlur;
        this._drawHexBolt(ctx, rot, rBolt);
        ctx.shadowBlur  = 0;
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    /**
     * Draws a proper mechanical gear profile as a single closed path.
     * Alternates between root-circle arcs (valleys) and tip-circle arcs (teeth)
     * connected by straight flanks. Caller must call fill() and/or stroke().
     * @private
     */
    _drawGearShape(ctx, n, rot, rTip, rRoot) {
        const step    = (Math.PI * 2) / n;
        const halfTip = step * 0.22;    // tooth tip angular half-width

        ctx.beginPath();
        for (let i = 0; i < n; i++) {
            const c = rot + i * step;
            ctx.arc(0, 0, rRoot, c - step + halfTip, c - halfTip); // valley arc
            ctx.lineTo(rTip * Math.cos(c - halfTip), rTip * Math.sin(c - halfTip)); // left flank
            ctx.arc(0, 0, rTip, c - halfTip, c + halfTip);          // tooth tip arc
            ctx.lineTo(rRoot * Math.cos(c + halfTip), rRoot * Math.sin(c + halfTip)); // right flank
        }
        ctx.closePath();
    }

    /** @private */
    _drawHexBolt(ctx, rot, rBolt) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a  = rot * 0.4 + (i / 6) * Math.PI * 2;
            const hx = rBolt * Math.cos(a);
            const hy = rBolt * Math.sin(a);
            if (i === 0) ctx.moveTo(hx, hy);
            else         ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.stroke();
    }

    _drawWarpHole(w) {
        const ctx = this._ctx;
        const ph  = w.phase;
        const pp  = w.phaseProgress;

        if (w.arrivalPending) {
            w.arrivalPending = false;
            this._particles.burst(w.exitX, w.exitY, '#cc44ff', 22, 380, 0.7);
            this._particles.burst(w.exitX, w.exitY, '#ffffff', 8,  260, 0.5);
        }

        ctx.save();
        ctx.translate(w.x, w.y);

        if (ph === 0)                      this._drawWarpSuckRings(w, pp);
        if (ph === 2)                      this._drawWarpArriveRings(w, pp);
        if (ph === -1 || ph === 1)         this._drawWarpIdleHole(w, w.isReady);

        ctx.shadowBlur  = 0;
        ctx.globalAlpha = ph === 2 ? 1 - pp * 0.7 : 1;
        const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, w.radius * 0.72);
        grad.addColorStop(0, w.isReady && ph === -1 ? '#1a0030' : '#0a0010');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, w.radius * 0.72, 0, Math.PI * 2);
        ctx.fill();

        if (ph === -1) {
            ctx.globalAlpha  = w.isReady ? 1 : 0.3;
            ctx.shadowColor  = '#cc44ff';
            ctx.shadowBlur   = w.isReady ? 8 : 0;
            ctx.fillStyle    = w.isReady ? '#dd99ff' : '#443';
            ctx.font         = 'bold 7px "Orbitron", monospace';
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('WARP', 0, 0);
        }
        ctx.restore();
    }

    /** @private */
    _drawWarpSuckRings(w, pp) {
        const ctx = this._ctx;
        for (let i = 0; i < 3; i++) {
            const frac = ((pp + i / 3) % 1);
            const r    = w.radius * 1.8 * (1 - frac);
            ctx.globalAlpha = 0.7 * frac;
            ctx.shadowColor = '#cc44ff';
            ctx.shadowBlur  = 14;
            ctx.strokeStyle = `hsl(${270 + i * 20}, 90%, 70%)`;
            ctx.lineWidth   = 2.5 - frac * 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, Math.max(1, r), 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }

    /** @private */
    _drawWarpArriveRings(w, pp) {
        const ctx = this._ctx;
        for (let i = 0; i < 3; i++) {
            const frac = ((pp + i / 3) % 1);
            const r    = w.radius * 2.5 * frac;
            ctx.globalAlpha = 0.85 * (1 - frac);
            ctx.shadowColor = '#ff88ff';
            ctx.shadowBlur  = 18;
            ctx.strokeStyle = `hsl(${280 + i * 15}, 95%, 78%)`;
            ctx.lineWidth   = 3 - frac * 2;
            ctx.beginPath();
            ctx.arc(0, 0, Math.max(1, r), 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }

    /** @private */
    _drawWarpIdleHole(w, ready) {
        const ctx   = this._ctx;
        const pulse = 0.7 + 0.3 * Math.sin(this._time * 5);
        ctx.globalAlpha = ready ? 1 : 0.3;
        ctx.shadowColor = ready ? '#cc44ff' : '#332244';
        ctx.shadowBlur  = ready ? 24 * pulse : 6;
        ctx.strokeStyle = ready ? '#aa22ee' : '#442255';
        ctx.lineWidth   = 3.5;
        ctx.beginPath();
        ctx.arc(0, 0, w.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur  = 0;
        ctx.strokeStyle = ready ? '#ff66ff' : '#332';
        ctx.globalAlpha = ready ? 0.35 : 0.1;
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.arc(0, 0, w.radius * 1.35, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = ready ? 1 : 0.3;
        for (let i = 0; i < 4; i++) {
            const ang = w.swirl + (i / 4) * Math.PI * 2;
            ctx.strokeStyle = ready ? `hsl(${270 + i * 22}, 85%, 68%)` : '#334';
            ctx.lineWidth   = 2;
            ctx.shadowColor = ready ? '#cc44ff' : 'transparent';
            ctx.shadowBlur  = ready ? 8 : 0;
            ctx.beginPath();
            ctx.arc(0, 0, w.radius * 0.52, ang, ang + Math.PI * 0.85);
            ctx.stroke();
        }
    }

    /** Build gear tooth silhouette path (in translated+rotated context). */
    _buildGearPath(radius, outerR, teethCount) {
        const ctx    = this._ctx;
        // Narrow tooth base (0.38 of full slot) → sharp, elongated teeth
        const halfTW = (Math.PI / teethCount) * 0.38;
        const step   = (Math.PI * 2) / teethCount;
        ctx.beginPath();
        ctx.moveTo(radius * Math.cos(-halfTW), radius * Math.sin(-halfTW));
        for (let i = 0; i < teethCount; i++) {
            const base      = i * step;
            const baseL     = base - halfTW;
            const baseR     = base + halfTW;
            const tip       = base;                   // pointed tip at tooth centre
            const nextAngle = (i < teethCount - 1)
                ? (i + 1) * step - halfTW
                : Math.PI * 2 - halfTW;
            // Rise left flank
            ctx.lineTo(outerR * Math.cos(baseL), outerR * Math.sin(baseL));
            // Sharp apex (single point)
            ctx.lineTo(outerR * Math.cos(tip),   outerR * Math.sin(tip));
            // Descend right flank
            ctx.lineTo(radius  * Math.cos(baseR), radius  * Math.sin(baseR));
            // Valley arc back to next tooth base
            ctx.arc(0, 0, radius, baseR, nextAngle, false);
        }
        ctx.closePath();
    }

    _drawGear(gear, p) {
        const ctx      = this._ctx;
        const outerR   = gear.outerRadius;
        const flashing = gear.flash > 0;
        const pulse    = 0.7 + 0.3 * Math.sin(this._time * 3.5);

        ctx.save();
        ctx.translate(gear.x, gear.y);

        const halo = ctx.createRadialGradient(0, 0, gear.radius * 0.4, 0, 0, outerR * 2);
        halo.addColorStop(0,   p.wallGlow + '22');
        halo.addColorStop(0.6, p.wallGlow + '0c');
        halo.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.globalAlpha = 0.8 + 0.2 * pulse;
        ctx.fillStyle   = halo;
        ctx.beginPath();
        ctx.arc(0, 0, outerR * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.rotate(gear.angle);
        ctx.shadowColor = flashing ? '#ffffff' : p.wallGlow;
        ctx.shadowBlur  = flashing ? 50 : 20 * pulse;

        this._buildGearPath(gear.radius, outerR, gear.teethCount);

        const metalGrd = ctx.createRadialGradient(
            -gear.radius * 0.22, -gear.radius * 0.22, gear.radius * 0.08,
            0, 0, outerR
        );
        if (flashing) {
            metalGrd.addColorStop(0,    '#ffffff');
            metalGrd.addColorStop(0.35, p.accent);
            metalGrd.addColorStop(1,    p.wall);
        } else {
            metalGrd.addColorStop(0,    p.accent2 + 'dd');
            metalGrd.addColorStop(0.3,  p.wall + 'cc');
            metalGrd.addColorStop(0.65, '#1a0808ee');
            metalGrd.addColorStop(1,    '#080404ff');
        }
        ctx.fillStyle = metalGrd;
        ctx.fill();

        ctx.shadowBlur  = 0;
        ctx.strokeStyle = flashing ? '#ffffff' : p.wall;
        ctx.lineWidth   = 2.5;
        ctx.stroke();

        ctx.globalAlpha = 0.45 + 0.35 * pulse;
        ctx.strokeStyle = flashing ? '#ffffff' : p.accent;
        ctx.lineWidth   = 1.5;
        ctx.shadowColor = p.accent;
        ctx.shadowBlur  = flashing ? 12 : 6;
        ctx.beginPath();
        ctx.arc(0, 0, gear.radius * 0.68, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = 0.65;
        ctx.strokeStyle = flashing ? '#ffffff' : p.wall;
        ctx.lineWidth   = 3;
        ctx.shadowBlur  = 0;
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(gear.radius * 0.16 * Math.cos(a), gear.radius * 0.16 * Math.sin(a));
            ctx.lineTo(gear.radius * 0.64 * Math.cos(a), gear.radius * 0.64 * Math.sin(a));
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
        const hubR    = gear.radius * 0.2;
        const hubGrd  = ctx.createRadialGradient(-hubR * 0.3, -hubR * 0.3, hubR * 0.1, 0, 0, hubR);
        hubGrd.addColorStop(0,   flashing ? '#ffffff' : '#fffacc');
        hubGrd.addColorStop(0.5, flashing ? p.accent  : p.accent2);
        hubGrd.addColorStop(1,   p.wall);
        ctx.shadowColor = p.accent;
        ctx.shadowBlur  = flashing ? 18 : 10;
        ctx.fillStyle   = hubGrd;
        ctx.beginPath();
        ctx.arc(0, 0, hubR, 0, Math.PI * 2);
        ctx.fill();

        if (flashing) {
            ctx.shadowBlur   = 0;
            ctx.globalAlpha  = Math.min(1, gear.flash / 0.08);
            ctx.fillStyle    = '#ffffff';
            ctx.font         = 'bold 12px "Orbitron", monospace';
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`+${gear.score}`, 0, -(outerR + 16));
        }
        ctx.restore();
    }

    _drawPendulum(pend, p) {
        const ctx      = this._ctx;
        const flashing = pend.flash > 0;
        const pulse    = 0.6 + 0.4 * Math.sin(this._time * 5 + pend.phase);
        const armAngle = Math.atan2(pend.tipY - pend.anchorY, pend.tipX - pend.anchorX);

        ctx.save();

        ctx.shadowColor = p.wallGlow;
        ctx.shadowBlur  = 8;
        ctx.fillStyle   = p.wall;
        ctx.fillRect(pend.anchorX - 9, pend.anchorY - 7, 18, 10);
        ctx.shadowBlur  = 0;
        ctx.strokeStyle = p.accent;
        ctx.lineWidth   = 1.5;
        ctx.strokeRect(pend.anchorX - 9 + 0.5, pend.anchorY - 7 + 0.5, 17, 9);

        const armGrd = ctx.createLinearGradient(
            pend.anchorX, pend.anchorY, pend.tipX, pend.tipY
        );
        armGrd.addColorStop(0,   p.wallGlow);
        armGrd.addColorStop(0.5, p.accent2);
        armGrd.addColorStop(1,   flashing ? '#ffffff' : p.accent);

        ctx.shadowColor = flashing ? '#ffffff' : p.wallGlow;
        ctx.shadowBlur  = flashing ? 28 : 10 * pulse;
        ctx.strokeStyle = armGrd;
        ctx.lineWidth   = flashing ? 7 : 5;
        ctx.lineCap     = 'round';
        ctx.beginPath();
        ctx.moveTo(pend.anchorX, pend.anchorY);
        ctx.lineTo(pend.tipX,    pend.tipY);
        ctx.stroke();

        const tipR   = pend.tipRadius;
        ctx.shadowColor = flashing ? '#ffffff' : p.accent;
        ctx.shadowBlur  = flashing ? 32 : 18 * pulse;
        const tipGrd = ctx.createRadialGradient(
            pend.tipX - 4, pend.tipY - 4, 2,
            pend.tipX,     pend.tipY,     tipR
        );
        tipGrd.addColorStop(0,   flashing ? '#ffffff' : p.accent);
        tipGrd.addColorStop(0.5, p.wall);
        tipGrd.addColorStop(1,   '#06020e');
        ctx.fillStyle = tipGrd;
        ctx.beginPath();
        ctx.arc(pend.tipX, pend.tipY, tipR, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowColor = p.accent;
        ctx.shadowBlur  = 6;
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = flashing ? '#ffffff' : p.accent;
        ctx.lineWidth   = 2.5;
        for (let i = -1; i <= 1; i++) {
            const sa  = armAngle + i * 0.52;
            const len = tipR * (1.5 + Math.abs(i) * 0.4);
            ctx.beginPath();
            ctx.moveTo(pend.tipX, pend.tipY);
            ctx.lineTo(pend.tipX + Math.cos(sa) * len, pend.tipY + Math.sin(sa) * len);
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
        ctx.shadowColor = p.wallGlow;
        ctx.shadowBlur  = 8;
        ctx.fillStyle   = p.wallGlow;
        ctx.beginPath();
        ctx.arc(pend.anchorX, pend.anchorY, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    _drawWarpExitPortal(x, y) {
        const ctx   = this._ctx;
        const pulse = 0.65 + 0.35 * Math.sin(this._time * 4.2);
        const r     = 16;
        ctx.save();
        ctx.translate(x, y);

        ctx.shadowColor = '#00ffcc';
        ctx.shadowBlur  = 18 * pulse;
        ctx.strokeStyle = '#00ddaa';
        ctx.lineWidth   = 2.5;
        ctx.globalAlpha = 0.55 + 0.3 * pulse;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.shadowBlur     = 0;
        ctx.setLineDash([4, 3]);
        ctx.lineDashOffset = -this._time * 60;
        ctx.strokeStyle    = '#88ffee';
        ctx.lineWidth      = 1.5;
        ctx.globalAlpha    = 0.7;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.65, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.globalAlpha  = 0.9;
        ctx.shadowColor  = '#00ffcc';
        ctx.shadowBlur   = 6;
        ctx.fillStyle    = '#ccffee';
        ctx.font         = 'bold 6px "Orbitron", monospace';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('EXIT', 0, 0);
        ctx.restore();
    }
}
