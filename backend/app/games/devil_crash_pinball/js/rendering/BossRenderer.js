/**
 * BossRenderer — dedicated, high-fidelity renderer for boss entities.
 *
 * Single Responsibility: knows HOW to draw bosses (anatomy, telegraphs,
 * shockwaves, particles). Does NOT know game loop, sections, or camera.
 *
 * Public API:
 *   bossRenderer.setup(ctx, time);
 *   bossRenderer.draw(boss, palette);
 *
 * Each boss subclass exposes a small animation rig (read-only fields the
 * renderer reads). Visual identity is unique per boss; the rig fields
 * differ accordingly.
 */
const BOSS_SLEEP    = 0;
const BOSS_DEFEATED = 4;

export class BossRenderer {
    _ctx  = null;
    _time = 0;

    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} time elapsed seconds
     */
    setup(ctx, time) {
        this._ctx  = ctx;
        this._time = time;
    }

    /**
     * Draw a boss with all its rig animations applied.
     * @param {object} boss — instance of a Boss subclass
     * @param {object} palette — section palette (accent / wall / wallGlow / ...)
     */
    draw(boss, palette) {
        if (!this._ctx || !boss) return;
        if (boss.state === BOSS_SLEEP) return;
        if (boss.state === BOSS_DEFEATED && (boss.defeatAnim ?? 1) >= 1) return;

        const [sx, sy] = boss.getRenderScale ? boss.getRenderScale() : [1, 1];
        if (sx <= 0.001 || sy <= 0.001) return;

        const ctx = this._ctx;
        ctx.save();
        if ((boss.alpha ?? 1) < 1) ctx.globalAlpha *= boss.alpha;
        ctx.translate(boss.x + (boss.recoilX ?? 0), boss.y + (boss.recoilY ?? 0));
        if (boss.tilt) ctx.rotate(boss.tilt);
        ctx.scale(sx, sy);
        ctx.translate(-boss.x, -boss.y);

        this._drawDefeatHalo(boss);
        this._drawByType(boss, palette);
        this._drawHpBar(boss, palette);

        ctx.restore();
    }

    // ── Shared overlays ──────────────────────────────────────────────────────

    /** @private */
    _drawDefeatHalo(boss) {
        if (boss.state !== BOSS_DEFEATED || (boss.defeatAnim ?? 0) <= 0) return;
        const ctx = this._ctx;
        const t   = boss.defeatAnim;
        ctx.save();
        ctx.globalAlpha = (1 - t) * 0.7;
        ctx.strokeStyle = '#ffffff';
        ctx.shadowColor = '#ffeebb';
        ctx.shadowBlur  = 24;
        ctx.lineWidth   = 3 + t * 6;
        ctx.beginPath();
        ctx.arc(boss.x, boss.y, (boss.radius || 28) * (1 + t * 1.6), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    /** @private */
    _drawHpBar(boss, p) {
        const ctx = this._ctx;
        const r   = boss.radius || 28;
        const w   = r * 2;
        const x   = boss.x - r;
        const y   = boss.y - r - 16;
        const hpR = boss.maxHp ? boss.hp / boss.maxHp : 1;

        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(x - 1, y - 1, w + 2, 7);
        ctx.fillStyle = p.accent ?? '#ff3344';
        ctx.shadowColor = p.accent ?? '#ff3344';
        ctx.shadowBlur  = 6;
        ctx.fillRect(x, y, w * hpR, 5);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth   = 0.7;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, 4);
        ctx.restore();
    }

    /** @private */
    _drawByType(boss, p) {
        switch (boss.drawType) {
            case 'dragon': this._drawDragon(boss, p); break;
            case 'demon':  this._drawDemon(boss, p);  break;
            case 'golem':  this._drawGolem(boss, p);  break;
            case 'witch':  this._drawWitch(boss, p);  break;
            default:
                throw new Error(`[BossRenderer] Unknown drawType: '${boss.drawType}'`);
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // DRAGON — Serpent of Embers
    // ──────────────────────────────────────────────────────────────────────────

    /** @private */
    _drawDragon(boss, p) {
        const ctx   = this._ctx;
        const flash = boss.flash > 0;
        ctx.save();
        this._drawDragonTail(ctx, boss, flash);
        this._drawDragonBody(ctx, boss, flash);
        this._drawDragonWings(ctx, boss, flash);
        this._drawDragonHead(ctx, boss, flash, p);
        this._drawDragonBreath(ctx, boss, flash);
        ctx.restore();
    }

    /** @private — tail tip behind the body (drawn first). */
    _drawDragonTail(ctx, boss, flash) {
        const tail = boss.spine[boss.spine.length - 1];
        const prev = boss.spine[boss.spine.length - 2];
        const ang  = Math.atan2(tail.y - prev.y, tail.x - prev.x);
        ctx.save();
        ctx.translate(tail.x, tail.y);
        ctx.rotate(ang);
        ctx.fillStyle = flash ? '#ffeecc' : '#7a1d05';
        ctx.shadowColor = '#ff5500';
        ctx.shadowBlur  = 10;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-12,  4);
        ctx.lineTo(-12, -4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    /** @private — articulated spine with overlapping scale circles. */
    _drawDragonBody(ctx, boss, flash) {
        const spine = boss.spine;
        for (let i = spine.length - 1; i >= 1; i--) {
            const seg = spine[i];
            const prev = spine[i - 1];
            const ang  = Math.atan2(seg.y - prev.y, seg.x - prev.x);
            const t    = i / spine.length;
            const r    = 10 + (1 - t) * 9;
            const glow = flash ? '#ffd0a0' : '#ff5500';

            ctx.save();
            ctx.translate(seg.x, seg.y);
            ctx.rotate(ang);
            // Belly plate (lighter)
            ctx.fillStyle   = flash ? '#ffe0c0' : '#a02810';
            ctx.shadowColor = glow;
            ctx.shadowBlur  = 8;
            ctx.beginPath();
            ctx.ellipse(0, r * 0.2, r * 0.95, r * 0.55, 0, 0, Math.PI * 2);
            ctx.fill();
            // Back scales (darker)
            const grad = ctx.createLinearGradient(0, -r, 0, r);
            grad.addColorStop(0, flash ? '#ffffff' : '#3a0a02');
            grad.addColorStop(0.5, flash ? '#ffaa66' : '#7a1d05');
            grad.addColorStop(1, flash ? '#ffd0a0' : '#a02810');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(0, 0, r, r * 0.85, 0, Math.PI, Math.PI * 2);
            ctx.fill();
            // Spine ridge
            ctx.fillStyle = flash ? '#ffffff' : '#1a0500';
            ctx.beginPath();
            ctx.moveTo(-r * 0.6, -r * 0.6);
            ctx.lineTo(0,        -r * 0.95);
            ctx.lineTo( r * 0.6, -r * 0.6);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }

    /** @private — folded leathery wings on segment 2, flap with wingPhase. */
    _drawDragonWings(ctx, boss, flash) {
        const anchor = boss.spine[2];
        if (!anchor) return;
        const flap = Math.sin(boss.wingPhase) * 0.5;
        const span = 36;
        ctx.save();
        ctx.translate(anchor.x, anchor.y);
        ctx.shadowColor = flash ? '#ffaa66' : '#220000';
        ctx.shadowBlur  = 12;
        for (const dir of [-1, 1]) {
            ctx.save();
            ctx.scale(dir, 1);
            ctx.rotate(-0.4 + flap);
            const grad = ctx.createLinearGradient(0, 0, span, -span * 0.6);
            grad.addColorStop(0, flash ? '#ff6633' : '#3a0805');
            grad.addColorStop(1, flash ? '#ffaa66' : '#660d05');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(span * 0.4, -span * 0.6, span * 0.9, -span * 0.4, span, span * 0.1);
            ctx.bezierCurveTo(span * 0.7,  span * 0.1, span * 0.3,  span * 0.05, 0, 0);
            ctx.closePath();
            ctx.fill();
            // 3 ribs
            ctx.strokeStyle = flash ? '#ffffff' : '#1a0500';
            ctx.lineWidth   = 1;
            for (let k = 1; k <= 3; k++) {
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(span * (0.3 + k * 0.2), -span * (0.4 - k * 0.1));
                ctx.stroke();
            }
            ctx.restore();
        }
        ctx.restore();
    }

    /** @private — armoured head, horns, glowing eye, articulated jaw. */
    _drawDragonHead(ctx, boss, flash, p) {
        const hx     = boss.x;
        const hy     = boss.y;
        const r      = boss.radius;
        const dir    = boss.headDir || 1;
        const jaw    = boss.jawOpen ?? 0;

        ctx.save();
        ctx.translate(hx, hy);
        ctx.scale(dir, 1);
        this._drawDragonHorns(ctx, r, flash);
        this._drawDragonSkull(ctx, r, flash);
        this._drawDragonJaws(ctx, r, jaw, flash, boss.breathCharge ?? 0);
        this._drawDragonEye(ctx, r, flash, p);
        ctx.restore();
    }

    /** @private */
    _drawDragonHorns(ctx, r, flash) {
        ctx.fillStyle   = flash ? '#fff7e0' : '#1a0800';
        ctx.shadowColor = '#ffaa55';
        ctx.shadowBlur  = 6;
        // Main horn (curves back)
        ctx.beginPath();
        ctx.moveTo(-r * 0.1, -r * 0.55);
        ctx.bezierCurveTo(-r * 0.65, -r * 1.45, -r * 0.95, -r, -r * 0.4, -r * 0.35);
        ctx.closePath();
        ctx.fill();
        // Side horn (smaller)
        ctx.beginPath();
        ctx.moveTo(-r * 0.55, -r * 0.32);
        ctx.bezierCurveTo(-r * 1.05, -r * 0.95, -r * 0.85, -r * 0.55, -r * 0.3, -r * 0.18);
        ctx.closePath();
        ctx.fill();
    }

    /** @private — head silhouette with gradient + scale highlights. */
    _drawDragonSkull(ctx, r, flash) {
        const grad = ctx.createRadialGradient(r * 0.2, -r * 0.3, r * 0.1, 0, 0, r * 1.1);
        grad.addColorStop(0, flash ? '#ffffff' : '#ff8a3a');
        grad.addColorStop(0.5, flash ? '#ffcc99' : '#a82408');
        grad.addColorStop(1, '#2a0500');
        ctx.fillStyle   = grad;
        ctx.shadowColor = '#ff4400';
        ctx.shadowBlur  = 18;
        ctx.beginPath();
        ctx.moveTo(-r * 0.6, -r * 0.4);
        ctx.bezierCurveTo(-r * 0.4, -r * 1.05, r * 0.4, -r * 1.05, r * 0.6, -r * 0.4);
        ctx.bezierCurveTo(r * 1.15, 0, r * 0.5, r * 0.55, r * 0.1, r * 0.3);
        ctx.bezierCurveTo(-r * 0.3, r * 0.4, -r * 0.7, r * 0.05, -r * 0.6, -r * 0.4);
        ctx.closePath();
        ctx.fill();
        // cheek scale ridge
        ctx.shadowBlur = 0;
        ctx.strokeStyle = flash ? '#ffffff' : '#1a0500';
        ctx.lineWidth   = 1.2;
        ctx.beginPath();
        ctx.moveTo(-r * 0.45, -r * 0.05);
        ctx.lineTo( r * 0.05, -r * 0.18);
        ctx.lineTo( r * 0.55, -r * 0.05);
        ctx.stroke();
    }

    /** @private — articulated jaws: lower jaw rotates with jawOpen. */
    _drawDragonJaws(ctx, r, jaw, flash, charge) {
        // Throat glow when charging breath
        if (charge > 0.05) {
            ctx.save();
            ctx.shadowColor = '#ffee44';
            ctx.shadowBlur  = 14 * charge;
            ctx.fillStyle   = `rgba(255,210,80,${0.3 + 0.5 * charge})`;
            ctx.beginPath();
            ctx.ellipse(r * 0.55, r * 0.05, r * 0.35 * (0.6 + 0.5 * charge), r * 0.18, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        // Upper jaw (snout)
        ctx.fillStyle = flash ? '#ffd0a0' : '#882008';
        ctx.beginPath();
        ctx.moveTo( r * 0.35, -r * 0.18);
        ctx.lineTo( r * 1.4,  -r * 0.05);
        ctx.lineTo( r * 1.45,  r * 0.05);
        ctx.lineTo( r * 0.35,  r * 0.05);
        ctx.closePath();
        ctx.fill();
        // Upper teeth
        ctx.fillStyle = '#fff6e0';
        for (let i = 0; i < 4; i++) {
            const tx = r * (0.45 + i * 0.22);
            ctx.beginPath();
            ctx.moveTo(tx,           r * 0.05);
            ctx.lineTo(tx + r * 0.05, r * 0.2);
            ctx.lineTo(tx + r * 0.1,  r * 0.05);
            ctx.closePath();
            ctx.fill();
        }
        // Lower jaw — pivot at hinge, rotate by jawOpen
        const hingeX = r * 0.35;
        const hingeY = r * 0.05;
        ctx.save();
        ctx.translate(hingeX, hingeY);
        ctx.rotate(jaw * 0.55);
        ctx.fillStyle = flash ? '#ffaa66' : '#5a1004';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(r * 1.05, 0);
        ctx.lineTo(r,        r * 0.18);
        ctx.lineTo(0,        r * 0.32);
        ctx.closePath();
        ctx.fill();
        // Lower teeth
        ctx.fillStyle = '#fff6e0';
        for (let i = 0; i < 3; i++) {
            const tx = r * (0.18 + i * 0.28);
            ctx.beginPath();
            ctx.moveTo(tx,           0);
            ctx.lineTo(tx + r * 0.05, -r * 0.15);
            ctx.lineTo(tx + r * 0.1,  0);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }

    /** @private — glowing eye with vertical slit pupil. */
    _drawDragonEye(ctx, r, flash, p) {
        const ex = r * 0.05;
        const ey = -r * 0.32;
        ctx.shadowColor = flash ? '#ffffff' : (p.accent ?? '#ffee00');
        ctx.shadowBlur  = 14;
        ctx.fillStyle   = flash ? '#ffffff' : '#ffd700';
        ctx.beginPath();
        ctx.ellipse(ex, ey, 5.5, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle  = '#000';
        ctx.beginPath();
        ctx.ellipse(ex + 1.2, ey, 1.7, 4.6, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    /** @private — sustained fire breath rendered when breathCharge is high. */
    _drawDragonBreath(ctx, boss, flash) {
        const c = boss.breathCharge ?? 0;
        if (c < 0.3) return;
        const dir   = boss.headDir || 1;
        const r     = boss.radius;
        const len   = r * (3 + c * 4);
        const flick = 0.85 + 0.15 * Math.sin(this._time * 22);
        const ox    = boss.x + dir * r * 1.4;
        const oy    = boss.y + r * 0.05;
        ctx.save();
        ctx.globalAlpha = c * flick;
        const grad = ctx.createLinearGradient(ox, oy, ox + dir * len, oy);
        grad.addColorStop(0,    flash ? '#ffffff' : '#ffeb55');
        grad.addColorStop(0.35, '#ffa520');
        grad.addColorStop(0.75, 'rgba(255,80,0,0.5)');
        grad.addColorStop(1,    'rgba(255,40,0,0)');
        ctx.fillStyle   = grad;
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur  = 22;
        ctx.beginPath();
        ctx.moveTo(ox, oy - r * 0.18);
        ctx.quadraticCurveTo(ox + dir * len * 0.5, oy - r * 0.55 * flick, ox + dir * len, oy);
        ctx.quadraticCurveTo(ox + dir * len * 0.5, oy + r * 0.55 * flick, ox, oy + r * 0.18);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // DEMON — Hell Lord Baal
    // ──────────────────────────────────────────────────────────────────────────

    /** @private */
    _drawDemon(boss, p) {
        const ctx = this._ctx;
        ctx.save();
        this._drawDemonArena(ctx, boss);
        this._drawDemonShockwave(ctx, boss);
        this._drawDemonWindStreaks(ctx, boss);
        this._drawDemonWings(ctx, boss, p);
        this._drawDemonOrbits(ctx, boss);
        this._drawDemonBody(ctx, boss);
        this._drawDemonArms(ctx, boss);
        this._drawDemonHead(ctx, boss);
        this._drawDemonChargeFx(ctx, boss);
        ctx.restore();
    }

    /** @private */
    _drawDemonArena(ctx, boss) {
        if (!boss.arenaRadius) return;
        const t     = this._time;
        const pulse = 0.3 + 0.12 * Math.sin(t * 1.8);
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = '#ee0a00';
        ctx.lineWidth   = 1.5;
        ctx.setLineDash([8, 12]);
        ctx.lineDashOffset = -t * 18;
        ctx.beginPath();
        ctx.arc(boss.cx, boss.cy, boss.arenaRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    /** @private — expanding ground ring on smite impact. */
    _drawDemonShockwave(ctx, boss) {
        const a = boss.shockwaveAlpha ?? 0;
        if (a <= 0) return;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.strokeStyle = '#ee0000';
        ctx.shadowColor = '#ff1100';
        ctx.shadowBlur  = 18;
        ctx.lineWidth   = 4 * a + 1;
        ctx.beginPath();
        ctx.arc(boss.x, boss.y + boss.radius * 0.55, boss.shockwaveR, 0, Math.PI * 2);
        ctx.stroke();
        // inner echo — golden yellow
        ctx.lineWidth   = 1.5;
        ctx.globalAlpha = a * 0.5;
        ctx.strokeStyle = '#ffdd00';
        ctx.beginPath();
        ctx.arc(boss.x, boss.y + boss.radius * 0.55, boss.shockwaveR * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    /** @private — radial dust streaks blown outward from the smite impact. */
    _drawDemonWindStreaks(ctx, boss) {
        const w = boss.windStrength ?? 0;
        if (w <= 0.05) return;
        const ix    = boss._smiteX ?? boss.x;
        const iy    = boss._smiteY ?? boss.y;
        const reach = (boss.arenaRadius ?? 110) * 1.7;
        const inner = reach * (1 - w) * 0.6;          // streaks travel outward as wind decays
        const outer = reach * (1 - w * 0.4);
        const t     = this._time;
        const count = 14;

        ctx.save();
        ctx.globalAlpha = w * 0.85;
        ctx.lineCap     = 'round';
        ctx.shadowColor = '#ffdd00';
        ctx.shadowBlur  = 8;
        for (let i = 0; i < count; i++) {
            const a   = (i / count) * Math.PI * 2 + t * 0.6 + (i * 0.13);
            const cos = Math.cos(a);
            const sin = Math.sin(a);
            const r0  = inner + ((i * 17) % 30);
            const r1  = Math.min(outer, r0 + 22 + w * 28);
            const x0  = ix + cos * r0;
            const y0  = iy + sin * r0;
            const x1  = ix + cos * r1;
            const y1  = iy + sin * r1;
            ctx.strokeStyle = `rgba(255,200,30,${0.35 + 0.5 * w})`;
            ctx.lineWidth   = 1.4;
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.stroke();
            ctx.strokeStyle = `rgba(255,240,60,${0.25 + 0.55 * w})`;
            ctx.lineWidth   = 0.8;
            ctx.beginPath();
            ctx.moveTo(x0 + cos * 4, y0 + sin * 4);
            ctx.lineTo(x0 + cos * (4 + 10 * w), y0 + sin * (4 + 10 * w));
            ctx.stroke();
        }
        ctx.restore();
    }

    /** @private — leathery bat wings, flap rate based on phase + smiteCharge. */
    _drawDemonWings(ctx, boss, _p) {
        const r       = boss.radius;
        const spread  = boss.wingSpread ?? 0.5;        // 0..1
        const flap    = Math.sin(this._time * (3 + boss.phase)) * 0.14;
        const baseAng = -0.55 - spread * 0.7 + flap;
        const span    = r * (1.4 + spread * 1.1);

        for (const dir of [-1, 1]) {
            ctx.save();
            ctx.translate(boss.x, boss.y - r * 0.25);
            ctx.scale(dir, 1);
            ctx.rotate(baseAng);
            const grad = ctx.createLinearGradient(0, 0, span, span * 0.4);
            grad.addColorStop(0, '#700808');
            grad.addColorStop(1, '#150000');
            ctx.fillStyle = grad;
            ctx.shadowColor = '#330000';
            ctx.shadowBlur  = 10;
            // Membrane outline
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(span * 0.4, -span * 0.55, span * 0.95, -span * 0.25, span, span * 0.05);
            ctx.lineTo(span * 0.78, span * 0.18);
            ctx.lineTo(span * 0.55, span * 0.05);
            ctx.lineTo(span * 0.32, span * 0.22);
            ctx.lineTo(0, 0);
            ctx.closePath();
            ctx.fill();
            // Bony fingers
            ctx.strokeStyle = '#000';
            ctx.lineWidth   = 1.2;
            for (let k = 1; k <= 3; k++) {
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(span * (0.3 + k * 0.22), span * (0.05 - k * 0.08));
                ctx.stroke();
            }
            ctx.restore();
        }
    }

    /** @private — orbiting hellfire shards. */
    _drawDemonOrbits(ctx, boss) {
        const r = boss.radius;
        for (let i = 0; i < 3; i++) {
            const angle  = this._time * (0.95 + i * 0.38) + i * (Math.PI * 2 / 3);
            const orbitR = r * (1.8 + boss.phase * 0.35);
            const sx = boss.x + Math.cos(angle) * orbitR;
            const sy = boss.y + Math.sin(angle) * orbitR * 0.7;
            const sr = 4 + boss.phase * 1.5;
            ctx.save();
            ctx.shadowColor = '#ff1100';
            ctx.shadowBlur  = 10;
            const fg = ctx.createRadialGradient(sx, sy, 1, sx, sy, sr * 1.4);
            fg.addColorStop(0,   '#ffee00');
            fg.addColorStop(0.5, '#ff2200');
            fg.addColorStop(1,   'rgba(220,0,0,0)');
            ctx.fillStyle = fg;
            ctx.beginPath();
            ctx.arc(sx, sy, sr * 1.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    /** @private — gaunt tapered torso (no sphere). Head drawn separately above. */
    _drawDemonBody(ctx, boss) {
        const r     = boss.radius;
        const flash = boss.flash > 0;
        const cx    = boss.x;
        const cy    = boss.y;

        ctx.save();
        // Torso silhouette: shoulders → tapered point. Drawn as a closed bezier path.
        const shY    = cy - r * 0.1;        // shoulder line
        const shX    = r * 0.95;            // half shoulder width
        const waistY = cy + r * 0.55;
        const waistX = r * 0.55;
        const hipY   = cy + r * 1.05;       // tapered tail/loincloth tip

        ctx.shadowColor = flash ? '#ffffff' : '#330000';
        ctx.shadowBlur  = 18;
        const grad = ctx.createLinearGradient(cx, shY - r * 0.4, cx, hipY);
        grad.addColorStop(0,    flash ? '#ffdcdc' : '#980e0e');
        grad.addColorStop(0.55, flash ? '#ffaaaa' : '#420606');
        grad.addColorStop(1,    '#080000');
        ctx.fillStyle = grad;

        ctx.beginPath();
        // Left shoulder → left waist → tail tip → right waist → right shoulder → collar
        ctx.moveTo(cx - shX, shY);
        ctx.bezierCurveTo(cx - shX * 0.95, shY + r * 0.15,
                          cx - waistX,     waistY - r * 0.15,
                          cx - waistX,     waistY);
        ctx.bezierCurveTo(cx - waistX * 0.6, waistY + r * 0.35,
                          cx - r * 0.18,    hipY - r * 0.05,
                          cx,               hipY);
        ctx.bezierCurveTo(cx + r * 0.18,    hipY - r * 0.05,
                          cx + waistX * 0.6, waistY + r * 0.35,
                          cx + waistX,      waistY);
        ctx.bezierCurveTo(cx + waistX,      waistY - r * 0.15,
                          cx + shX * 0.95,  shY + r * 0.15,
                          cx + shX,         shY);
        // collar dip between shoulders
        ctx.bezierCurveTo(cx + shX * 0.45, shY - r * 0.05,
                          cx - shX * 0.45, shY - r * 0.05,
                          cx - shX,        shY);
        ctx.closePath();
        ctx.fill();

        // Sternum / chest core (small, contained)
        const pulse = 0.6 + 0.4 * Math.sin(boss.corePulse ?? 0);
        const coreR = r * 0.16 * (0.85 + 0.25 * pulse);
        ctx.shadowColor = '#ffcc00';
        ctx.shadowBlur  = 10 + 8 * pulse;
        const coreGrad = ctx.createRadialGradient(cx, cy + r * 0.1, 0, cx, cy + r * 0.1, coreR * 1.4);
        coreGrad.addColorStop(0,   `rgba(255,${Math.trunc(210 + 40 * pulse)},20,${0.9 + 0.1 * pulse})`);
        coreGrad.addColorStop(0.6, 'rgba(200,20,0,0.55)');
        coreGrad.addColorStop(1,   'rgba(100,0,0,0)');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(cx, cy + r * 0.1, coreR * 1.4, 0, Math.PI * 2);
        ctx.fill();

        // Magma cracks running down torso (phase ≥ 2 only)
        if (boss.phase >= 2 && !flash) {
            ctx.shadowColor = '#ff2200';
            ctx.shadowBlur  = 5;
            ctx.strokeStyle = '#ff8800';
            ctx.lineWidth   = 1;
            const cracks = [
                [cx - r * 0.2, cy + r * 0.25, cx - r * 0.45, cy + r * 0.85],
                [cx + r * 0.15, cy + r * 0.3,  cx + r * 0.35, cy + r * 0.95],
                [cx - r * 0.05, cy + r * 0.5,  cx + r * 0.05, cy + r * 0.95],
            ];
            for (const [x1, y1, x2, y2] of cracks) {
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    /** @private — claws raised with armRaise; idle hangs at sides. */
    _drawDemonArms(ctx, boss) {
        const r    = boss.radius;
        const lift = boss.armRaise ?? 0;     // 0 down, 1 overhead
        for (const dir of [-1, 1]) {
            const shx = boss.x + dir * r * 0.85;
            const shy = boss.y - r * 0.05;
            // angle goes from +0.7 (down/out) to -2.2 (overhead) as lift→1
            const ang = 0.7 + (-2.9) * lift;
            const len = r * 0.9;
            const fx  = shx + Math.cos(ang) * len * dir;
            const fy  = shy + Math.sin(ang) * len;
            // Arm
            ctx.save();
            ctx.strokeStyle = '#2a0000';
            ctx.lineWidth   = 5.5;
            ctx.lineCap     = 'round';
            ctx.shadowColor = '#110000';
            ctx.shadowBlur  = 4;
            ctx.beginPath();
            ctx.moveTo(shx, shy);
            ctx.lineTo(fx,  fy);
            ctx.stroke();
            // Fist
            ctx.fillStyle = '#300000';
            ctx.beginPath();
            ctx.arc(fx, fy, 4, 0, Math.PI * 2);
            ctx.fill();
            // Claws
            ctx.strokeStyle = '#e8dc80';
            ctx.lineWidth   = 1.1;
            for (let k = -1; k <= 1; k++) {
                ctx.beginPath();
                ctx.moveTo(fx, fy);
                ctx.lineTo(fx + dir * (3 + k * 1.2), fy + 5 + Math.abs(k) * 1.2);
                ctx.stroke();
            }
            ctx.restore();
        }
    }

    /** @private — elongated skull above the torso, with swept-back horns. */
    _drawDemonHead(ctx, boss) {
        const r     = boss.radius;
        const flash = boss.flash > 0;
        const hcx   = boss.x;
        const hcy   = boss.y - r * 0.85;     // head sits above shoulders
        const hw    = r * 0.55;              // half width
        const hh    = r * 0.7;               // half height (elongated)

        // Swept-back horns (drawn behind skull)
        ctx.save();
        ctx.shadowColor = flash ? '#fff' : '#110000';
        ctx.shadowBlur  = 6;
        ctx.fillStyle   = flash ? '#ffffff' : '#1a0000';
        // Left horn
        ctx.beginPath();
        ctx.moveTo(hcx - hw * 0.55, hcy - hh * 0.7);
        ctx.bezierCurveTo(hcx - hw * 1.7, hcy - hh * 1.55,
                          hcx - hw * 2.2, hcy - hh * 0.4,
                          hcx - hw * 0.85, hcy - hh * 0.45);
        ctx.bezierCurveTo(hcx - hw,        hcy - hh * 0.85,
                          hcx - hw * 0.7,  hcy - hh * 0.85,
                          hcx - hw * 0.55, hcy - hh * 0.7);
        ctx.closePath();
        ctx.fill();
        // Right horn (mirror)
        ctx.beginPath();
        ctx.moveTo(hcx + hw * 0.55, hcy - hh * 0.7);
        ctx.bezierCurveTo(hcx + hw * 1.7, hcy - hh * 1.55,
                          hcx + hw * 2.2, hcy - hh * 0.4,
                          hcx + hw * 0.85, hcy - hh * 0.45);
        ctx.bezierCurveTo(hcx + hw,        hcy - hh * 0.85,
                          hcx + hw * 0.7,  hcy - hh * 0.85,
                          hcx + hw * 0.55, hcy - hh * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Skull silhouette: tall hex/diamond with pointed chin
        ctx.save();
        ctx.shadowColor = flash ? '#ffffff' : '#2a0000';
        ctx.shadowBlur  = 14;
        const skullGrad = ctx.createLinearGradient(hcx, hcy - hh, hcx, hcy + hh);
        skullGrad.addColorStop(0,   flash ? '#ffe0e0' : '#750c0c');
        skullGrad.addColorStop(0.5, flash ? '#ffaaaa' : '#340404');
        skullGrad.addColorStop(1,   '#060000');
        ctx.fillStyle = skullGrad;
        ctx.beginPath();
        ctx.moveTo(hcx,            hcy - hh);             // crown
        ctx.bezierCurveTo(hcx + hw, hcy - hh * 0.85,
                          hcx + hw, hcy - hh * 0.1,
                          hcx + hw * 0.85, hcy + hh * 0.15); // right temple → cheek
        ctx.bezierCurveTo(hcx + hw * 0.6, hcy + hh * 0.55,
                          hcx + hw * 0.25, hcy + hh * 0.85,
                          hcx,             hcy + hh);     // pointed chin
        ctx.bezierCurveTo(hcx - hw * 0.25, hcy + hh * 0.85,
                          hcx - hw * 0.6,  hcy + hh * 0.55,
                          hcx - hw * 0.85, hcy + hh * 0.15);
        ctx.bezierCurveTo(hcx - hw, hcy - hh * 0.1,
                          hcx - hw, hcy - hh * 0.85,
                          hcx,      hcy - hh);
        ctx.closePath();
        ctx.fill();

        // Brow ridge (subtle dark band just above eyes)
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath();
        ctx.ellipse(hcx, hcy - hh * 0.18, hw * 0.85, hh * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Neck shadow connecting head to shoulders
        ctx.save();
        ctx.fillStyle = '#0c0000';
        ctx.beginPath();
        ctx.moveTo(hcx - hw * 0.35, hcy + hh * 0.85);
        ctx.lineTo(hcx + hw * 0.35, hcy + hh * 0.85);
        ctx.lineTo(hcx + hw * 0.55, boss.y - r * 0.15);
        ctx.lineTo(hcx - hw * 0.55, boss.y - r * 0.15);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        this._drawDemonFace(ctx, boss, hcx, hcy, hw, hh);
    }

    /** @private — sunken eye sockets with ember pupils, grim slit mouth. */
    _drawDemonFace(ctx, boss, hcx, hcy, hw, hh) {
        const flash  = boss.flash > 0;
        const phase  = boss.phase;
        const eyeOff = hw * 0.42;
        const eyeY   = hcy - hh * 0.05;

        ctx.save();
        // Recessed sockets — dark ovals carved into the skull
        ctx.fillStyle = '#000';
        for (const dx of [-eyeOff, eyeOff]) {
            ctx.beginPath();
            ctx.ellipse(hcx + dx, eyeY, hw * 0.32, hh * 0.22, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Ember pupils — tiny intense glow inside each socket
        const emberR = 1.6 + phase * 0.6;
        const emberC = flash ? '#ffffff' : '#ffcc00';
        ctx.shadowColor = emberC;
        ctx.shadowBlur  = 10 + phase * 3;
        ctx.fillStyle   = emberC;
        for (const dx of [-eyeOff, eyeOff]) {
            ctx.beginPath();
            ctx.arc(hcx + dx + 0.6, eyeY + 0.4, emberR, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
        // Pupil cores (white-hot pinpoint)
        ctx.fillStyle = '#fff4d8';
        for (const dx of [-eyeOff, eyeOff]) {
            ctx.beginPath();
            ctx.arc(hcx + dx + 0.6, eyeY + 0.4, Math.max(0.6, emberR * 0.35), 0, Math.PI * 2);
            ctx.fill();
        }

        // Mouth — grim horizontal slit; opens slightly with jawOpen, never cartoon-wide
        const jaw    = boss.jawOpen ?? 0;
        const mouthY = hcy + hh * 0.52;
        const mouthW = hw * 0.7;
        const mouthH = 0.8 + jaw * hh * 0.32;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(hcx, mouthY, mouthW, mouthH, 0, 0, Math.PI * 2);
        ctx.fill();

        // Inner glow when mouth is open (smite roar)
        if (jaw > 0.35) {
            ctx.shadowColor = '#ff1100';
            ctx.shadowBlur  = 8;
            ctx.fillStyle   = `rgba(255,20,0,${0.35 + 0.4 * jaw})`;
            ctx.beginPath();
            ctx.ellipse(hcx, mouthY, mouthW * 0.75, mouthH * 0.7, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // Fangs — thin, only visible when mouth is open
        if (jaw > 0.3) {
            ctx.fillStyle = flash ? '#fff' : '#e8e090';
            const fangH = mouthH * 0.85;
            for (const dx of [-mouthW * 0.55, -mouthW * 0.2, mouthW * 0.2, mouthW * 0.55]) {
                ctx.beginPath();
                ctx.moveTo(hcx + dx - 1.1, mouthY - mouthH * 0.4);
                ctx.lineTo(hcx + dx,        mouthY - mouthH * 0.4 + fangH);
                ctx.lineTo(hcx + dx + 1.1, mouthY - mouthH * 0.4);
                ctx.closePath();
                ctx.fill();
            }
        }
        ctx.restore();
    }

    /** @private — sky-glow telegraph above boss while charging smite. */
    _drawDemonChargeFx(ctx, boss) {
        const c = boss.smiteCharge ?? 0;
        if (c <= 0.05) return;
        const r = boss.radius;
        ctx.save();
        ctx.globalAlpha = c;
        const cx = boss.x;
        const cy = boss.y - r * 1.8;
        const rad = r * (0.4 + 1.4 * c);
        const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, rad);
        grad.addColorStop(0,   '#ffffff');
        grad.addColorStop(0.4, '#ffee00');
        grad.addColorStop(1,   'rgba(220,20,0,0)');
        ctx.fillStyle   = grad;
        ctx.shadowColor = '#ffdd00';
        ctx.shadowBlur  = 20;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.fill();
        // jagged inward bolts
        ctx.strokeStyle = '#ffee44';
        ctx.lineWidth   = 1.5;
        for (let i = 0; i < 6; i++) {
            const a = i * (Math.PI / 3) + this._time * 4;
            const x1 = cx + Math.cos(a) * rad * 0.3;
            const y1 = cy + Math.sin(a) * rad * 0.3;
            const x2 = cx + Math.cos(a) * rad * 0.95;
            const y2 = cy + Math.sin(a) * rad * 0.95;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo((x1 + x2) / 2 + Math.sin(a) * 4, (y1 + y2) / 2 - Math.cos(a) * 4);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
        ctx.restore();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GOLEM — Ancient Stone Sentinel
    // ──────────────────────────────────────────────────────────────────────────

    /** @private */
    _drawGolem(boss, p) {
        const ctx = this._ctx;
        ctx.save();
        this._drawGolemArena(ctx, boss);
        this._drawGolemShockwave(ctx, boss);
        this._drawGolemPauldrons(ctx, boss);
        this._drawGolemBody(ctx, boss);
        this._drawGolemArms(ctx, boss);
        this._drawGolemFace(ctx, boss, p);
        this._drawGolemChargeFx(ctx, boss);
        ctx.restore();
    }

    /** @private */
    _drawGolemArena(ctx, boss) {
        if (!boss.arenaRadius) return;
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.strokeStyle = '#778899';
        ctx.lineWidth   = 2;
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.arc(boss.cx, boss.cy, boss.arenaRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    /** @private */
    _drawGolemShockwave(ctx, boss) {
        const a = boss.slamWaveAlpha ?? 0;
        if (a <= 0) return;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.strokeStyle = '#ccddee';
        ctx.shadowColor = '#aabbcc';
        ctx.shadowBlur  = 16;
        ctx.lineWidth   = 4 * a + 1;
        ctx.beginPath();
        ctx.arc(boss.slamX, boss.slamY, boss.slamWaveR, 0, Math.PI * 2);
        ctx.stroke();
        // dust ring
        ctx.globalAlpha = a * 0.4;
        ctx.fillStyle   = '#7a8898';
        ctx.beginPath();
        ctx.ellipse(boss.slamX, boss.slamY, boss.slamWaveR * 1.05, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    /** @private — rotating hexagonal pauldrons on each shoulder. */
    _drawGolemPauldrons(ctx, boss) {
        const r = boss.radius;
        for (const dir of [-1, 1]) {
            const px = boss.x + dir * r * 0.95;
            const py = boss.y - r * 0.55;
            const ang = this._time * 0.5 * dir;
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(ang);
            ctx.shadowColor = '#aabbcc';
            ctx.shadowBlur  = 8;
            ctx.fillStyle   = boss.flash > 0 ? '#ffffff' : '#677788';
            ctx.beginPath();
            for (let k = 0; k < 6; k++) {
                const a = k / 6 * Math.PI * 2;
                const rr = 13;
                const x = Math.cos(a) * rr;
                const y = Math.sin(a) * rr;
                if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#22303a';
            ctx.lineWidth   = 1.5;
            ctx.stroke();
            // crystal stud centre
            ctx.shadowColor = '#00bbff';
            ctx.shadowBlur  = 6;
            ctx.fillStyle   = '#33ddff';
            ctx.beginPath();
            ctx.arc(0, 0, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    /** @private — angular stone torso; cracks deepen with damageStage. */
    _drawGolemBody(ctx, boss) {
        const r     = boss.radius;
        const flash = boss.flash > 0;
        ctx.save();
        ctx.shadowColor = flash ? '#ffffff' : '#445566';
        ctx.shadowBlur  = 20;
        const grad = ctx.createRadialGradient(boss.x - r * 0.2, boss.y - r * 0.3, r * 0.1,
                                              boss.x, boss.y, r);
        grad.addColorStop(0,   flash ? '#ffffff' : '#8899aa');
        grad.addColorStop(0.5, flash ? '#bbbbbb' : '#445566');
        grad.addColorStop(1,   '#1a2230');
        ctx.fillStyle = grad;
        ctx.beginPath();
        const v = [0,-r,  r*0.72,-r*0.72,  r,0,  r*0.72,r*0.72,  0,r*0.88,
                   -r*0.72,r*0.72, -r,0, -r*0.72,-r*0.72];
        ctx.moveTo(boss.x + v[0], boss.y + v[1]);
        for (let i = 2; i < v.length; i += 2) ctx.lineTo(boss.x + v[i], boss.y + v[i + 1]);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        if (boss.damageStage >= 1 && !flash) this._drawGolemCracks(ctx, boss);
        if (boss.damageStage >= 2 && !flash) this._drawGolemExposedCore(ctx, boss);
    }

    /** @private */
    _drawGolemCracks(ctx, boss) {
        const r = boss.radius;
        ctx.save();
        ctx.strokeStyle = '#0a1018';
        ctx.lineWidth   = 1.4;
        const cracks = [
            [[-0.25,-0.55],[0.05,-0.1],[-0.25,0.35]],
            [[0.4,-0.3],[0.65,0.25]],
            [[-0.5,0.1],[-0.18,0.5]],
            [[0.2,0.45],[0.5,0.78]],
        ];
        const limit = boss.damageStage >= 2 ? cracks.length : 2;
        for (let i = 0; i < limit; i++) {
            const c = cracks[i];
            ctx.beginPath();
            ctx.moveTo(boss.x + c[0][0] * r, boss.y + c[0][1] * r);
            for (let k = 1; k < c.length; k++) ctx.lineTo(boss.x + c[k][0] * r, boss.y + c[k][1] * r);
            ctx.stroke();
        }
        ctx.restore();
    }

    /** @private — magma core glowing through chest plate at stage 2. */
    _drawGolemExposedCore(ctx, boss) {
        const r = boss.radius;
        const pulse = 0.55 + 0.45 * Math.sin(this._time * 4);
        ctx.save();
        ctx.shadowColor = '#ff8800';
        ctx.shadowBlur  = 14 + 10 * pulse;
        ctx.fillStyle   = `rgba(255,${Math.trunc(120 + 80 * pulse)},20,${0.55 + 0.4 * pulse})`;
        ctx.beginPath();
        ctx.arc(boss.x, boss.y + r * 0.05, r * 0.22 * (0.9 + 0.15 * pulse), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    /** @private — both arms; the active slamArm rises with slamCharge. */
    _drawGolemArms(ctx, boss) {
        const r = boss.radius;
        for (const dir of [-1, 1]) {
            const isActive = (dir === boss.slamArm);
            const charge   = isActive ? (boss.slamCharge ?? 0) : 0;
            const shx = boss.x + dir * r * 0.95;
            const shy = boss.y - r * 0.05;
            // angle: hangs at 1 (down/out) → -1.6 (overhead) when fully charged
            const ang = 1 + (-2.6) * charge;
            const len = r * 1.1;
            const fx  = shx + Math.cos(ang) * len * dir;
            const fy  = shy + Math.sin(ang) * len;
            ctx.save();
            ctx.strokeStyle = '#3a4a5a';
            ctx.lineWidth   = 11;
            ctx.lineCap     = 'round';
            ctx.shadowColor = '#1a2230';
            ctx.shadowBlur  = 6;
            ctx.beginPath();
            ctx.moveTo(shx, shy);
            ctx.lineTo(fx,  fy);
            ctx.stroke();
            // Stone fist
            const fistGrad = ctx.createRadialGradient(fx - 2, fy - 2, 1, fx, fy, 9);
            fistGrad.addColorStop(0, '#8899aa');
            fistGrad.addColorStop(1, '#33414e');
            ctx.fillStyle = fistGrad;
            ctx.beginPath();
            ctx.arc(fx, fy, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    /** @private — heavy brow, crystal eyes, stone teeth grin. */
    _drawGolemFace(ctx, boss, _p) {
        const r     = boss.radius;
        const flash = boss.flash > 0;
        ctx.save();
        // Brow
        ctx.fillStyle = flash ? '#dddddd' : '#334455';
        ctx.beginPath();
        ctx.moveTo(boss.x - r * 0.8,  boss.y - r * 0.2);
        ctx.lineTo(boss.x + r * 0.8,  boss.y - r * 0.2);
        ctx.lineTo(boss.x + r * 0.7,  boss.y - r * 0.02);
        ctx.lineTo(boss.x - r * 0.7,  boss.y - r * 0.02);
        ctx.closePath();
        ctx.fill();
        // Crystal eyes — intensity per boss.eyeIntensity
        const eyeI = boss.eyeIntensity ?? 0.7;
        ctx.shadowColor = '#00bbff';
        ctx.shadowBlur  = 14;
        ctx.fillStyle   = flash ? '#ffffff' : `rgba(0,${Math.trunc(180 + 40 * eyeI)},255,${0.5 + 0.5 * eyeI})`;
        ctx.fillRect(boss.x - r * 0.52, boss.y - r * 0.16, r * 0.32, r * 0.22);
        ctx.fillRect(boss.x + r * 0.2,  boss.y - r * 0.16, r * 0.32, r * 0.22);
        // Mouth grid
        ctx.shadowBlur = 0;
        ctx.fillStyle  = '#000';
        ctx.fillRect(boss.x - r * 0.45, boss.y + r * 0.3, r * 0.9, r * 0.14);
        ctx.fillStyle  = flash ? '#ffeeee' : '#aabbcc';
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(boss.x - r * 0.38 + i * r * 0.24, boss.y + r * 0.3, r * 0.14, r * 0.12);
        }
        ctx.restore();
    }

    /** @private — bright orange charge halo on the active fist. */
    _drawGolemChargeFx(ctx, boss) {
        const c = boss.slamCharge ?? 0;
        if (c <= 0.05) return;
        const r = boss.radius;
        const dir = boss.slamArm;
        const shx = boss.x + dir * r * 0.95;
        const shy = boss.y - r * 0.05;
        const ang = 1 + (-2.6) * c;
        const len = r * 1.1;
        const fx  = shx + Math.cos(ang) * len * dir;
        const fy  = shy + Math.sin(ang) * len;
        const rad = 10 + 14 * c;
        ctx.save();
        ctx.globalAlpha = c;
        const grad = ctx.createRadialGradient(fx, fy, 1, fx, fy, rad);
        grad.addColorStop(0,   '#ffffff');
        grad.addColorStop(0.4, '#ffaa44');
        grad.addColorStop(1,   'rgba(255,80,0,0)');
        ctx.fillStyle   = grad;
        ctx.shadowColor = '#ffaa00';
        ctx.shadowBlur  = 16;
        ctx.beginPath();
        ctx.arc(fx, fy, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // WITCH — Shadow Hexenmeister
    // ──────────────────────────────────────────────────────────────────────────

    /** @private */
    _drawWitch(boss, p) {
        const ctx  = this._ctx;
        const fade = boss.fade ?? 1;
        if (fade <= 0.02) return;
        ctx.save();
        ctx.globalAlpha *= fade;
        this._drawWitchArena(ctx, boss, fade);
        this._drawWitchRuneRing(ctx, boss);
        this._drawWitchOrbs(ctx, boss);
        this._drawWitchCloak(ctx, boss);
        this._drawWitchBody(ctx, boss, p);
        this._drawWitchHat(ctx, boss);
        this._drawWitchFace(ctx, boss);
        this._drawWitchHands(ctx, boss);
        ctx.restore();
    }

    /** @private */
    _drawWitchArena(ctx, boss, fade) {
        if (!boss.arenaRadius) return;
        const t = this._time;
        const pulse = 0.28 + 0.14 * Math.sin(t * 2.2);
        ctx.save();
        ctx.globalAlpha = fade * pulse;
        ctx.strokeStyle = '#cc00ff';
        ctx.lineWidth   = 1.5;
        ctx.setLineDash([6, 10]);
        ctx.lineDashOffset = -t * 38;
        ctx.beginPath();
        ctx.arc(boss.cx, boss.cy, boss.arenaRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    /** @private — glowing rune ring beneath the witch during cast. */
    _drawWitchRuneRing(ctx, boss) {
        const k = boss.runeRing ?? 0;
        if (k <= 0.02) return;
        const r = boss.radius;
        const rad = r * (1.5 + 1.5 * k);
        ctx.save();
        ctx.translate(boss.x, boss.y + r * 1.1);
        ctx.rotate(this._time * 0.6);
        ctx.globalAlpha = k * 0.85;
        ctx.strokeStyle = '#dd55ff';
        ctx.shadowColor = '#aa00ff';
        ctx.shadowBlur  = 18;
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.arc(0, 0, rad,        0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, rad * 0.75, 0, Math.PI * 2);
        ctx.stroke();
        // 6 rune ticks
        ctx.strokeStyle = '#ffffff';
        for (let i = 0; i < 6; i++) {
            const a = i / 6 * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * rad * 0.78, Math.sin(a) * rad * 0.18);
            ctx.lineTo(Math.cos(a) * rad,        Math.sin(a) * rad * 0.22);
            ctx.stroke();
        }
        ctx.restore();
    }

    /** @private — 4 orbs orbiting; orbBurst expands them outward. */
    _drawWitchOrbs(ctx, boss) {
        const r = boss.radius;
        const COLORS = ['#ff44ff', '#8800ff', '#44aaff', '#ffff00'];
        const burst  = boss.orbBurst ?? 0;
        for (let i = 0; i < 4; i++) {
            const dir   = i % 2 === 0 ? 1 : -1;
            const angle = this._time * (0.7 + i * 0.25) * dir + i * (Math.PI / 2);
            const orbR  = r * (2 + i * 0.4) * (1 + burst * 1.4);
            const ox    = boss.x + Math.cos(angle) * orbR;
            const oy    = boss.y + Math.sin(angle) * orbR * 0.55;
            const os    = (4.5 - i * 0.5) * (1 + burst * 0.6);
            ctx.save();
            ctx.shadowColor = COLORS[i];
            ctx.shadowBlur  = 14;
            const grad = ctx.createRadialGradient(ox, oy, 1, ox, oy, os * 1.6);
            grad.addColorStop(0,   '#ffffff');
            grad.addColorStop(0.4, COLORS[i]);
            grad.addColorStop(1,   'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(ox, oy, os * 1.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    /** @private — flowing cloak with sine-wave hem. */
    _drawWitchCloak(ctx, boss) {
        const r     = boss.radius;
        const flash = boss.flash > 0;
        const wave  = boss.cloakPhase ?? 0;
        ctx.save();
        ctx.shadowColor = flash ? '#ffffff' : '#660099';
        ctx.shadowBlur  = 16;
        const grad = ctx.createLinearGradient(boss.x - r, boss.y, boss.x + r, boss.y + r * 2.4);
        grad.addColorStop(0, flash ? '#ffffff' : '#8800dd');
        grad.addColorStop(1, flash ? '#ddaaff' : '#220044');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(boss.x, boss.y + r * 0.4);
        const segs = 10;
        const baseY = boss.y + r * 2.5;
        ctx.lineTo(boss.x - r * 1.25, baseY);
        for (let i = 0; i <= segs; i++) {
            const t = i / segs;
            const px = boss.x - r * 1.25 + t * r * 2.5;
            const py = baseY + Math.sin(wave + t * 5) * 4;
            ctx.lineTo(px, py);
        }
        ctx.lineTo(boss.x + r * 1.25, baseY);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = flash ? '#ffffff' : '#cc66ff';
        ctx.lineWidth   = 1;
        ctx.stroke();
        ctx.restore();
    }

    /** @private — face oval base. */
    _drawWitchBody(ctx, boss, _p) {
        const r     = boss.radius;
        const flash = boss.flash > 0;
        ctx.save();
        ctx.shadowColor = flash ? '#ffffff' : '#9900cc';
        ctx.shadowBlur  = 8;
        const grad = ctx.createRadialGradient(boss.x, boss.y - r * 0.1, 2, boss.x, boss.y, r);
        grad.addColorStop(0, flash ? '#ffffff' : '#ddbbee');
        grad.addColorStop(1, flash ? '#ffaaff' : '#772299');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(boss.x, boss.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    /** @private — pointed hat with brim + spinning star. */
    _drawWitchHat(ctx, boss) {
        const r     = boss.radius;
        const flash = boss.flash > 0;
        // Brim
        const grad = ctx.createLinearGradient(boss.x, boss.y - r * 3.5, boss.x, boss.y - r * 0.5);
        grad.addColorStop(0, flash ? '#ffffff' : '#550077');
        grad.addColorStop(1, flash ? '#ddaaff' : '#1a0033');
        ctx.save();
        ctx.fillStyle   = grad;
        ctx.shadowColor = '#aa00ff';
        ctx.shadowBlur  = 14;
        ctx.beginPath();
        ctx.ellipse(boss.x, boss.y - r * 0.5, r * 1.45, r * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        // Cone (slight sway with cloakPhase for life)
        const sway = Math.sin((boss.cloakPhase ?? 0) * 0.5) * r * 0.18;
        ctx.beginPath();
        ctx.moveTo(boss.x - r * 1.1, boss.y - r * 0.5);
        ctx.lineTo(boss.x + sway,    boss.y - r * 3.3);
        ctx.lineTo(boss.x + r * 1.1, boss.y - r * 0.5);
        ctx.closePath();
        ctx.fill();
        // Star
        const sx = boss.x + sway * 0.55;
        const sy = boss.y - r * 2.2;
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur  = 10;
        ctx.fillStyle   = flash ? '#ffffff' : '#ffee00';
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const a  = (i * 4 * Math.PI) / 5 - Math.PI / 2 + this._time * 1.5;
            const a2 = ((i * 4 + 2) * Math.PI) / 5 - Math.PI / 2 + this._time * 1.5;
            if (i === 0) ctx.moveTo(sx + Math.cos(a) * 5,  sy + Math.sin(a) * 5);
            else         ctx.lineTo(sx + Math.cos(a) * 5,  sy + Math.sin(a) * 5);
            ctx.lineTo(sx + Math.cos(a2) * 2, sy + Math.sin(a2) * 2);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    /** @private — glowing eyes + crescent grin. */
    _drawWitchFace(ctx, boss) {
        const r     = boss.radius;
        const flash = boss.flash > 0;
        ctx.save();
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur  = 12;
        ctx.fillStyle   = flash ? '#ffffff' : '#00ff88';
        ctx.beginPath();
        ctx.arc(boss.x - r * 0.35, boss.y - r * 0.15, 3.5, 0, Math.PI * 2);
        ctx.arc(boss.x + r * 0.35, boss.y - r * 0.15, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = flash ? '#ffffff' : '#1a0033';
        ctx.lineWidth   = 1.8;
        ctx.beginPath();
        ctx.arc(boss.x, boss.y + r * 0.2, r * 0.42, 0.2, Math.PI - 0.2);
        ctx.stroke();
        ctx.restore();
    }

    /** @private — glowing hands; one rises during cast charge. */
    _drawWitchHands(ctx, boss) {
        const r       = boss.radius;
        const lift    = boss.handRaise ?? 0;
        const grimo   = boss.grimoireGlow ?? 0.4;
        // Two hands at sides of cloak (just under face)
        for (const dir of [-1, 1]) {
            const handLift = (dir > 0) ? lift : 0;     // right hand raises during cast
            const hx = boss.x + dir * r * 0.85;
            const hy = boss.y + r * 0.8 - handLift * r * 1.6;
            ctx.save();
            ctx.shadowColor = '#cc44ff';
            ctx.shadowBlur  = 6 + 10 * handLift;
            ctx.fillStyle   = `rgba(${Math.trunc(220 + 30 * handLift)},170,255,${0.7 + 0.3 * handLift})`;
            ctx.beginPath();
            ctx.arc(hx, hy, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        // Floating grimoire to the left
        const gx = boss.x - r;
        const gy = boss.y + r * 0.9;
        ctx.save();
        ctx.translate(gx, gy);
        ctx.rotate(Math.sin(this._time * 1.2) * 0.12);
        ctx.shadowColor = '#aa44ff';
        ctx.shadowBlur  = 6 + 14 * grimo;
        ctx.fillStyle   = '#1a0033';
        ctx.fillRect(-7, -5, 14, 10);
        ctx.fillStyle   = `rgba(255,180,255,${0.4 + 0.6 * grimo})`;
        ctx.fillRect(-5, -3, 10, 6);
        ctx.restore();
    }
}
