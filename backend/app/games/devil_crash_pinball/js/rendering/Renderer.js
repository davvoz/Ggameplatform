import { GameConfig as C } from '../config/GameConfig.js';
import { ParticlePool }    from '../effects/ParticlePool.js';
import { EntityRenderer }  from './EntityRenderer.js';
import { BackgroundRenderer } from './BackgroundRenderer.js';
import { PerformanceMode } from '../config/PerformanceMode.js';

/**
 * Install a `shadowBlur` setter override on the canvas context. When
 * `PerformanceMode.lowPerf` is on, every write to `ctx.shadowBlur` is
 * silently coerced to 0 — disabling all glow across the renderer in one
 * place (OCP: every existing call site keeps working unchanged).
 * Idempotent: safe to call once per canvas.
 * @param {CanvasRenderingContext2D} ctx
 */
function _installShadowBlurOverride(ctx) {
    if (ctx.__lowPerfPatched) return;
    const desc = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(ctx), 'shadowBlur'
    );
    if (!desc?.set || !desc.get) return; // unsupported — bail silently
    Object.defineProperty(ctx, 'shadowBlur', {
        configurable: true,
        get() { return desc.get.call(this); },
        set(v) { desc.set.call(this, PerformanceMode.lowPerf ? 0 : v); },
    });
    ctx.__lowPerfPatched = true;
}

/**
 * Procedural canvas renderer. Single section drawn per frame (the one the
 * camera is focused on) — no overdraw, no light bleed across floors.
 *
 * Per-floor palettes (section.palette) drive walls, lights, bumpers and
 * background colors. The Renderer never reads global colors except for the
 * ball, particles, and the HUD-ignored bezel.
 */
export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        _installShadowBlurOverride(this.ctx);
        // Camera starts at 0; snapToBall() is called by Game after the board
        // is built and the ball is placed, so this value is never rendered.
        this.cameraY = 0;
        this.cameraTargetY = 0;
        // Section count: updated every draw() from board.sections.length so
        // _sectionTopFor() clamp never needs a hardcoded constant.
        this._sectionCount = 1;
        this.shake = 0;
        this.time = 0;
        this.particles = new ParticlePool();
        this._entityRenderer      = new EntityRenderer();
        this._backgroundRenderer = new BackgroundRenderer(this.ctx, C.VIEW_WIDTH);
        // Screen-space parallax stars: wrapped within the canvas, never
        // touched by world coords. Two layers for depth.
        this._stars = this._buildStars();
        // Floor-transition sweep animation state.
        // duration: total sweep time in seconds.
        // startY: camera position at the moment the transition was triggered.
        this._transition = { active: false, timer: 0, duration: 1.1, color: '#fff', accent: '#fff', goingUp: true, startY: 0 };
        // Flipper side-flash state (triggered on activation edge)
        this._flipFlash = { l: 0, r: 0 };
        this._flipPrev  = { l: false, r: false };
        // Drain animation overlay data (set each frame by Game, null when inactive)
        this._drainEffect = null;
    }

    _buildStars() {
        const stars = [];
        const W = C.VIEW_WIDTH;
        const H = C.VIEW_HEIGHT;
        // Fine-grain embers — reddish, dim
        const tinyColors = ['#6a2020', '#4a1a4a', '#2a1a10', '#5a3020', '#3a2050'];
        for (let i = 0; i < 70; i++) {
            stars.push({
                x: Math.random() * W, y: Math.random() * H,
                r: 0.4 + Math.random() * 0.6,
                tw: Math.random() * Math.PI * 2, layer: 0.28,
                color: tinyColors[i % tinyColors.length],
            });
        }
        // Mid-size sparks — purple, gold, blood-red
        const midColors = ['#cc44ff', '#ffd700', '#ff3030', '#5fc8ff', '#ff8030'];
        for (let i = 0; i < 32; i++) {
            stars.push({
                x: Math.random() * W, y: Math.random() * H,
                r: 0.9 + Math.random() * 1.3,
                tw: Math.random() * Math.PI * 2, layer: 0.7,
                color: midColors[i % midColors.length],
            });
        }
        return stars;
    }

    /** Trigger flipper side-flash (call on left/right activation edge). */
    triggerFlipFlash(isLeft) {
        if (isLeft) this._flipFlash.l = 1;
        else        this._flipFlash.r = 1;
    }

    /** Pass drain animation data from Game to be drawn this frame. Null = inactive. */
    setDrainEffect(data) { this._drainEffect = data; }

    /** Cancel any active floor-transition sweep (call when hard-snapping camera). */
    cancelTransition() { this._transition.active = false; }

    /** Snap camera target to the top of the section that owns world Y. */
    follow(ball, dt) {
        this.cameraTargetY = this._sectionTopFor(ball.pos.y);
        if (this._transition.active) {
            // Camera driven by the sweep timer — smooth-step over the cover phase.
            // Cover phase ends at TRANSITION_COVER_FRAC of the total duration.
            const coverEnd = this._transition.duration * C.TRANSITION_COVER_FRAC;
            const raw = Math.min(1, this._transition.timer / coverEnd);
            const t   = raw * raw * (3 - 2 * raw); // smooth-step (ease-in-out)
            this.cameraY = this._transition.startY + (this.cameraTargetY - this._transition.startY) * t;
        } else {
            const k = Math.min(1, dt * C.CAMERA_LERP);
            this.cameraY += (this.cameraTargetY - this.cameraY) * k;
        }
        if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 4);
        this.time += dt;
        // Decay flipper flash timers
        if (this._flipFlash.l > 0) this._flipFlash.l = Math.max(0, this._flipFlash.l - dt * 6);
        if (this._flipFlash.r > 0) this._flipFlash.r = Math.max(0, this._flipFlash.r - dt * 6);
        this.particles.update(dt);
        if (this._transition.active) {
            this._transition.timer += dt;
            if (this._transition.timer >= this._transition.duration) {
                this._transition.active = false;
            }
        }
    }

    /**
     * Trigger a palette-warp sweep when the ball crosses a floor boundary.
     * @param {object} newPalette  palette of the destination floor
     * @param {boolean} goingUp   true = ball moving upward
     */
    triggerFloorTransition(newPalette, goingUp) {
        this._transition.active       = true;
        this._transition.timer        = 0;
        this._transition.color        = newPalette.wall;
        this._transition.accent       = newPalette.wallGlow;
        this._transition.goingUp      = goingUp;
        this._transition._paletteName = newPalette.name;
        // Snapshot the current camera position so smooth-step can interpolate from here.
        this._transition.startY       = this.cameraY;
    }

    /** Snap camera instantly (used when (re)loading a ball). */
    snapToBall(ball) {
        this.cameraY = this._sectionTopFor(ball.pos.y);
        this.cameraTargetY = this.cameraY;
    }

    _sectionTopFor(y) {
        const idx = Math.floor(y / C.SECTION_HEIGHT);
        const clamped = Math.max(0, Math.min(this._sectionCount - 1, idx));
        return clamped * C.SECTION_HEIGHT;
    }

    addShake(amount) { this.shake = Math.min(1, this.shake + amount); }

    spawnHit(x, y, color, count = 10, speed = 240, gScale = 0.6) {
        this.particles.burst(x, y, color, count, speed, gScale);
    }

    spawnStreak(x, y, angle, color, count = 6, speed = 280) {
        this.particles.streak(x, y, angle, color, count, speed);
    }

    /**
     * Draw the active section (and a thin slice of its neighbour during
     * camera transitions). Two-section max per frame keeps overdraw bounded.
     */
    draw(board, ball) {
        const ctx = this.ctx;
        const W = C.VIEW_WIDTH;
        const H = C.VIEW_HEIGHT;
        const sx = (Math.random() - 0.5) * this.shake * 8;
        const sy = (Math.random() - 0.5) * this.shake * 8;

        this._sectionCount = board.sections.length;
        this._entityRenderer.setup(this.ctx, this.time, this.particles);

        // Clip everything to the playfield rect — the strip below is owned
        // exclusively by the HUD control bar and must not be polluted by
        // section / particle / overlay draws.
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, W, H);
        ctx.clip();

        // 1. Solid wipe (per-section bg gradient lives below)
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, H);

        // 2. Determine which sections intersect the viewport.
        const camTop = this.cameraY;
        const camBot = this.cameraY + H;
        const visible = board.sections.filter(
            s => s.top < camBot && s.bottom > camTop
        );

        // 3. Draw each visible section CLIPPED to its own band on screen.
        ctx.save();
        ctx.translate(sx, sy);
        for (const s of visible) this._drawSectionClipped(s, camTop);
        ctx.restore();

        // 3.5 Flipper ambient side-glow (world-space overlay)
        this._updateFlipperFlash(board);
        if (!PerformanceMode.lowPerf) this._drawFlipperAmbient(board, camTop);

        // 4. Warp transit beam — screen-space overlay during TRAVEL phase
        this._drawWarpBeam(board, sx, sy, camTop);

        // 4.5 Warp exit portals — world-space destination rings
        ctx.save();
        ctx.translate(sx, sy - camTop);
        this._drawAllWarpExits(board, camTop, camBot);
        ctx.restore();

        // 5. Particles & ball drawn in world->screen space, on top.
        ctx.save();
        ctx.translate(sx, sy - camTop);
        this.particles.draw(ctx);
        this._drawBall(ball);
        ctx.restore();

        // 6. Floor name banner (top-right) tied to active section.
        const active = visible[visible.length - 1];
        if (active) this._drawFloorBadge(active.palette);

        // 7. Light scanlines + vignette (subtle)
        if (!PerformanceMode.lowPerf) this._drawOverlay();

        // 8. Drain transition overlay — screen-space, topmost renderer layer
        if (this._drainEffect) this._drawDrainOverlay(this._drainEffect);

        ctx.restore();
    }

    // ── Drain overlay ─────────────────────────────────────────────────────────

    /**
     * Full-screen animated overlay for the drain → spawn sequence.
     * Three phases: IMPLODE (shockwave + flash), HOLD (dark veil + text), SPAWN (rings + text fade).
     * @param {object} d  drain effect data set by Game via setDrainEffect()
     */
    _drawDrainOverlay(d) {
        const IMPLODE_END = C.DRAIN_IMPLODE_END;
        const HOLD_END    = C.DRAIN_HOLD_END;
        const SPAWN_END   = C.DRAIN_SPAWN_END;
        const ctx    = this.ctx;
        const W      = C.VIEW_WIDTH;
        const H      = C.VIEW_HEIGHT;
        const t      = d.timer;
        const camTop = this.cameraY;
        if (t < IMPLODE_END)
            this._drawDrainImplodePhase(ctx, W, H, d.drainX, d.drainY - camTop, t / IMPLODE_END);
        // HOLD phase: on game over keep hold overlay visible beyond HOLD_END until animation ends
        if (t >= IMPLODE_END) {
            const a = (t < HOLD_END ? (t - IMPLODE_END) / (HOLD_END - IMPLODE_END) : -1);
            const ht = d.gameOver
                ? Math.min(1, (t - IMPLODE_END) / (HOLD_END - IMPLODE_END))
                : a;
            if (ht >= 0) this._drawDrainHoldPhase(d, ctx, W, H, ht);
        }
        // SPAWN phase: only runs when it is NOT a game over
        if (!d.gameOver && t >= HOLD_END && t < SPAWN_END)
            this._drawDrainSpawnPhase(d, ctx, W, H, d.spawnX, d.spawnY - camTop, (t - HOLD_END) / (SPAWN_END - HOLD_END));
    }

    /** Phase 1 — Implode (it = 0..1 normalised). Radial flash + shockwave rings at drain point. */
    _drawDrainImplodePhase(ctx, W, H, dsx, dsy, it) {
        const flashA = (1 - it) * (1 - it) * 0.55;
        if (flashA > 0.01) {
            ctx.save();
            const vg = ctx.createRadialGradient(dsx, dsy, 0, dsx, dsy, W * 0.95);
            vg.addColorStop(0,    `rgba(255,30,0,${(flashA * 0.72).toFixed(3)})`);
            vg.addColorStop(0.35, `rgba(180,0,0,${(flashA * 0.45).toFixed(3)})`);
            vg.addColorStop(1,    'rgba(0,0,0,0)');
            ctx.fillStyle = vg;
            ctx.fillRect(0, 0, W, H);
            ctx.restore();
        }
        const rr = it * 72;
        const ra = (1 - it * it) * 0.9;
        if (rr > 0 && ra > 0.01) {
            ctx.save();
            ctx.shadowColor = '#ff4400';
            ctx.shadowBlur  = 22;
            ctx.strokeStyle = `rgba(255,80,0,${ra.toFixed(3)})`;
            ctx.lineWidth   = 5 * (1 - it * 0.6);
            ctx.beginPath();
            ctx.arc(dsx, dsy, rr, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = `rgba(255,190,0,${(ra * 0.55).toFixed(3)})`;
            ctx.lineWidth   = 2;
            ctx.beginPath();
            ctx.arc(dsx, dsy, rr * 0.52, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    /** Phase 2 — Hold (ht = 0..1 normalised). Dark veil eases in, text fades in. */
    _drawDrainHoldPhase(d, ctx, W, H, ht) {
        // Linear ease-in so the veil is immediately visible (quadratic was too slow to start).
        const overlayA = Math.min(0.8, ht * 0.9);
        ctx.save();
        ctx.fillStyle = `rgba(0,0,0,${overlayA.toFixed(3)})`;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
        // Text fades in from the very start of Hold — no dead-time delay.
        const ta = Math.min(1, ht * 3);
        if (ta > 0.02) this._drawDrainText(d, W, H, ta * ta);
    }

    /** Phase 3 — Spawn (st = 0..1 normalised). Veil fades out, materialise rings + nebula at spawn. */
    _drawDrainSpawnPhase(d, ctx, W, H, ssx, ssy, st) {
        const overlayA = (1 - st) * 0.8;
        if (overlayA > 0.01) {
            ctx.save();
            ctx.fillStyle = `rgba(0,0,0,${overlayA.toFixed(3)})`;
            ctx.fillRect(0, 0, W, H);
            ctx.restore();
        }
        const ta = Math.max(0, 1 - st * 1.2);
        if (ta > 0.02) this._drawDrainText(d, W, H, ta);
        this._drawSpawnRings(d, ctx, ssx, ssy, st);
        this._drawSpawnNebula(d, ctx, ssx, ssy, st);
    }

    /** Expanding materialise rings at spawn point (phase 3 sub-draw). */
    _drawSpawnRings(d, ctx, ssx, ssy, st) {
        const sc = d.ballSaved ? '#ffd700' : '#cc44ff';
        const r1 = st * 55;
        const a1 = (1 - st) * 0.85;
        if (a1 <= 0.01 || r1 <= 0) return;
        ctx.save();
        ctx.shadowColor = sc;
        ctx.shadowBlur  = 20;
        const hex1 = Math.floor(a1 * 255).toString(16).padStart(2, '0');
        const hex2 = Math.floor(a1 * 0.5 * 255).toString(16).padStart(2, '0');
        ctx.strokeStyle = `${sc}${hex1}`;
        ctx.lineWidth   = 3;
        ctx.beginPath();
        ctx.arc(ssx, ssy, r1 + 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = `${sc}${hex2}`;
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.arc(ssx, ssy, r1 + 26, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    /** Nebula glow at spawn point that peaks at mid-phase then fades (phase 3 sub-draw). */
    _drawSpawnNebula(d, ctx, ssx, ssy, st) {
        const glowA = Math.sin(st * Math.PI) * 0.42;
        if (glowA <= 0.01) return;
        ctx.save();
        const ng = ctx.createRadialGradient(ssx, ssy, 0, ssx, ssy, 72);
        if (d.ballSaved) {
            ng.addColorStop(0,    `rgba(255,200,0,${(glowA * 0.9).toFixed(3)})`);
            ng.addColorStop(0.55, `rgba(180,100,0,${(glowA * 0.35).toFixed(3)})`);
        } else {
            ng.addColorStop(0,    `rgba(180,0,255,${(glowA * 0.9).toFixed(3)})`);
            ng.addColorStop(0.55, `rgba(100,0,200,${(glowA * 0.35).toFixed(3)})`);
        }
        ng.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = ng;
        ctx.fillRect(ssx - 85, ssy - 85, 170, 170);
        ctx.restore();
    }

    /**
     * Shared text layer for phases 2 & 3 of the drain overlay.
     * @param {object} d      drain effect data
     * @param {number} W      canvas width
     * @param {number} H      canvas height
     * @param {number} alpha  0..1 opacity
     */
    _drawDrainText(d, W, H, alpha) {
        const ctx = this.ctx;
        ctx.save();
        ctx.globalAlpha  = alpha;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        const cy = H * 0.4;

        if (d.ballSaved) {
            ctx.font        = 'bold 32px "Orbitron", monospace';
            ctx.fillStyle   = '#ffd700';
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur  = 28;
            ctx.fillText('★ BALL SAVE ★', W / 2, cy);
        } else {
            ctx.font        = 'bold 34px "Orbitron", monospace';
            ctx.fillStyle   = '#ff2222';
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur  = 26;
            ctx.fillText('☠ BALL LOST', W / 2, cy);
            ctx.shadowBlur  = 0;
            ctx.font        = 'bold 13px monospace';
            ctx.fillStyle   = '#cccccc';
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur  = 5;
        }

        ctx.restore();
    }

    // ── Section drawing ───────────────────────────────────────────────────────

    _drawSectionClipped(section, camTop) {
        const ctx = this.ctx;
        const H = this.canvas.height;
        const screenTop = section.top - camTop;
        const screenBot = section.bottom - camTop;
        const yA = Math.max(0, screenTop);
        const yB = Math.min(H, screenBot);
        const bandH = yB - yA;
        if (bandH <= 0) return;

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, yA, this.canvas.width, bandH);
        ctx.clip();

        // Background gradient (palette per floor)
        this._drawBackground(section, screenTop);
        // Stars wrapped in screen space (never bleed across sections)
        this._drawStars(yA, yB);

        // World-space content: translate so section top maps to its
        // projected screenTop.
        ctx.save();
        ctx.translate(0, -camTop);
        this._drawSectionContent(section);
        ctx.restore();

        ctx.restore();
    }

    _drawBackground(section, screenTop) {
        this._backgroundRenderer.draw(
            section.background,
            screenTop,
            section.height,
            this.time,
        );
    }

    _drawStars(yA, yB) {
        if (PerformanceMode.lowPerf) return;
        const ctx = this.ctx;
        ctx.save();
        for (const s of this._stars) {
            if (s.y < yA || s.y > yB) continue;
            const tw = 0.5 + 0.5 * Math.sin(this.time * 2.2 + s.tw);
            ctx.globalAlpha = 0.12 + 0.55 * tw * s.layer;
            ctx.fillStyle = s.color;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r * (0.85 + 0.3 * tw), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    _drawSectionContent(section) {
        this._entityRenderer.drawSection(section);
    }

    _drawWarpBeam(board, sx, sy, camTop) {
        // During TRAVEL phase: draw a vertical lightning bolt shooting upward
        // off the screen to sell the underground transit.
        for (const section of board.sections) {
            for (const w of section.warps) {
                if (w.phase !== 1) continue;
                const p    = w.phaseProgress;  // 0→1
                const ctx  = this.ctx;
                const srcX = w.entryX + sx;
                const srcY = w.entryY - camTop + sy;
                const dstX = w.exitX  + sx;
                const dstY = w.exitY  - camTop + sy;

                ctx.save();
                const alpha = 0.6 * Math.sin(p * Math.PI);
                ctx.globalAlpha = alpha;

                // Beam: bright purple-white line from entry to exit (screen)
                const grd = ctx.createLinearGradient(srcX, srcY, dstX, dstY);
                grd.addColorStop(0,    'rgba(180,0,255,0.9)');
                grd.addColorStop(0.4,  'rgba(255,255,255,0.95)');
                grd.addColorStop(0.7,  'rgba(150,50,255,0.85)');
                grd.addColorStop(1,    'rgba(80,0,180,0.6)');

                ctx.shadowColor = '#cc44ff';
                ctx.shadowBlur  = 28;
                ctx.strokeStyle = grd;
                ctx.lineWidth   = 3;
                ctx.lineCap     = 'round';
                ctx.setLineDash([8, 6]);
                ctx.lineDashOffset = -this.time * 180;
                ctx.beginPath();
                ctx.moveTo(srcX, srcY);
                ctx.lineTo(dstX, dstY);
                ctx.stroke();

                // Widened glow pass
                ctx.setLineDash([]);
                ctx.globalAlpha = alpha * 0.22;
                ctx.lineWidth   = 14;
                ctx.strokeStyle = '#bb33ff';
                ctx.beginPath();
                ctx.moveTo(srcX, srcY);
                ctx.lineTo(dstX, dstY);
                ctx.stroke();

                ctx.restore();
            }
        }
    }

    _drawAllWarpExits(board, camTop, camBot) {
        this._entityRenderer.drawAllWarpExits(board.sections, camTop, camBot);
    }

    _updateFlipperFlash(board) {
        let lNow = false;
        let rNow = false;
        for (const s of board.sections) {
            for (const fl of s.flippers) {
                if (fl.active && fl.side ===  1) lNow = true;
                if (fl.active && fl.side === -1) rNow = true;
            }
        }
        if (lNow && !this._flipPrev.l) this._flipFlash.l = 1;
        if (rNow && !this._flipPrev.r) this._flipFlash.r = 1;
        this._flipPrev.l = lNow;
        this._flipPrev.r = rNow;
    }
    _drawFlipperAmbient(board, camTop) {
        const ctx  = this.ctx;
        const W    = this.canvas.width;
        const H    = this.canvas.height;
        let palette = null;
        const mid   = camTop + H / 2;
        for (const s of board.sections) {
            if (s.top <= mid && s.bottom > mid) { palette = s.palette; break; }
        }
        if (!palette) return;
        this._drawFlipperSideWash(ctx, W, H, this._flipFlash.l, palette.accent, true);
        this._drawFlipperSideWash(ctx, W, H, this._flipFlash.r, palette.accent, false);
    }

    _drawFlipperSideWash(ctx, W, H, flash, accent, isLeft) {
        if (flash <= 0) return;
        ctx.save();
        const x0   = isLeft ? 0 : W;
        const x1   = isLeft ? W * 0.55 : W * 0.45;
        const grad = ctx.createLinearGradient(x0, 0, x1, 0);
        const hex  = Math.floor(flash * 55).toString(16).padStart(2, '0');
        grad.addColorStop(0,   `${accent}${hex}`);
        grad.addColorStop(0.6, `${accent}00`);
        ctx.globalAlpha = flash * 0.85;
        ctx.fillStyle   = grad;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
    }

    _drawBall(ball) {
        if (ball.warpScale <= 0) return;  // invisible during transit
        const ctx   = this.ctx;
        const s     = ball.warpScale;
        const R     = ball.radius * s;
        const bx    = ball.pos.x;
        const by    = ball.pos.y;
        const speed = Math.hypot(ball.vel.x, ball.vel.y);
        const hot   = Math.min(1, Math.max(0, (speed - 400) / 900)); // 0 normal, 1 white-hot

        ctx.save();
        if (s < 1) {
            ctx.translate(bx, by);
            ctx.scale(s, s);
            ctx.translate(-bx, -by);
        }

        // \u2500\u2500 Speed streaks \u2014 radial lines behind ball at high velocity \u2500\u2500\u2500\u2500\u2500\u2500
        if (hot > 0.05 && !PerformanceMode.lowPerf) this._drawBallSpeedStreaks(ctx, bx, by, ball, hot, s);

        // ── Trail ──
        if (!PerformanceMode.lowPerf) this._drawBallTrail(ctx, ball, hot, s);
        this._applyBallGlow(s, hot);

        // \u2500\u2500 Sphere gradient \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
        const grad = ctx.createRadialGradient(bx - 3.5, by - 3.5, 1, bx, by, R);
        if (s < 1) {
            grad.addColorStop(0,    '#ffffff');
            grad.addColorStop(0.35, `hsl(${280 + (1 - s) * 40}, 80%, 70%)`);
            grad.addColorStop(0.72, `hsl(${260 + (1 - s) * 30}, 70%, 35%)`);
            grad.addColorStop(1,    '#0d0020');
        } else if (hot > 0.4) {
            grad.addColorStop(0,    '#ffffff');
            grad.addColorStop(0.25, `hsl(${50 - hot * 50},100%,85%)`);
            grad.addColorStop(0.6,  `hsl(${30 - hot * 30},90%,55%)`);
            grad.addColorStop(1,    '#1a0400');
        } else {
            grad.addColorStop(0,    '#ffffff');
            grad.addColorStop(0.35, '#f0d880');
            grad.addColorStop(0.72, '#b07830');
            grad.addColorStop(1,    '#1a0c04');
        }
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(bx, by, R, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // \u2500\u2500 Specular highlight \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.beginPath();
        ctx.arc(bx - 3.5 * s, by - 3.5 * s, 2 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    /** Set ctx.shadowColor/shadowBlur for the ball based on warp-scale and speed-heat. */
    _applyBallGlow(s, hot) {
        const ctx = this.ctx;
        if (s < 1) {
            ctx.shadowColor = '#cc44ff';
            ctx.shadowBlur  = 22;
        } else if (hot > 0.5) {
            ctx.shadowColor = `hsl(${40 - hot * 40},100%,80%)`;
            ctx.shadowBlur  = 28 + hot * 22;
        } else {
            ctx.shadowColor = '#ffe060';
            ctx.shadowBlur  = 18;
        }
    }

    _drawBallSpeedStreaks(ctx, bx, by, ball, hot, s) {
        const angle  = Math.atan2(ball.vel.y, ball.vel.x);
        const count  = Math.round(4 + hot * 8);
        ctx.save();
        ctx.shadowBlur = 0;
        for (let i = 0; i < count; i++) {
            const spread = (Math.PI / 3) * (i / count - 0.5);
            const a      = angle + spread + Math.PI; // behind the ball
            const len    = (18 + hot * 45) * (0.4 + Math.random() * 0.6);
            const alpha  = hot * (0.12 + Math.random() * 0.18) * s;
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = hot > 0.7 ? `rgba(255,255,200,${alpha})` : `rgba(255,180,40,${alpha})`;
            ctx.lineWidth   = 1 + hot;
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(bx + Math.cos(a) * len, by + Math.sin(a) * len);
            ctx.stroke();
        }
        ctx.restore();
    }

    /** Draw the fading positional trail behind the ball. Skipped in low-perf mode. */
    _drawBallTrail(ctx, ball, hot, s) {
        for (let i = 0; i < ball.trail.length; i++) {
            const t   = ball.trail[(ball.trailIdx + i) % ball.trail.length];
            const pct = i / ball.trail.length;
            const a   = pct * (0.45 + hot * 0.3) * s;
            if (hot > 0.3) {
                ctx.fillStyle = `rgba(255,${Math.round(200 - hot * 160)},${Math.round(50 - hot * 40)},${a.toFixed(2)})`;
            } else {
                ctx.fillStyle = pct > 0.6 ? `rgba(255,200,50,${a.toFixed(2)})` : `rgba(200,100,20,${a.toFixed(2)})`;
            }
            ctx.globalAlpha = a;
            ctx.beginPath();
            ctx.arc(t.x, t.y, ball.radius * (0.35 + pct * 0.65), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }


    _drawFloorBadge(palette) {
        const ctx = this.ctx;
        const W = this.canvas.width;
        ctx.save();
        ctx.font = 'bold 10px "Orbitron", monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillStyle = palette.accent;
        ctx.shadowColor = palette.wallGlow;
        ctx.shadowBlur = 10;
        ctx.fillText(`▮ ${palette.name}`, W - 12, 42);
        ctx.restore();
    }

    _drawOverlay() {
        const ctx = this.ctx;
        const W = this.canvas.width;
        const H = this.canvas.height;
        ctx.save();
        // Scanlines
        ctx.globalAlpha = 0.055;
        ctx.fillStyle = '#000';
        for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
        // Vignette — strong edges keep focus on play area
        const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.78);
        v.addColorStop(0, 'rgba(0,0,0,0)');
        v.addColorStop(1, 'rgba(0,0,0,0.62)');
        ctx.globalAlpha = 1;
        ctx.fillStyle = v;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
    }

}
