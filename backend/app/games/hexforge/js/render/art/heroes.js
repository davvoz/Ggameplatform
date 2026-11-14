import { FORM_INFO } from '../../data/labels.js';
import { drawHeroFusionOver, drawHeroFusionUnder } from './fusionArt.js';
import { halo, withAlpha } from './primitives.js';
import { guardian } from './guardian.js';
import { blade } from './neonBlade.js';
import { mage } from './technomancer.js';
import { explorer } from './explorer.js';

/**
 * A hero on the canvas: placed and turned, dressed for its form and its
 * fusion, then painted by its class (guardian.js, neonBlade.js,
 * technomancer.js, explorer.js).
 */

/**
 * A hero standing on (x, y), drawn `s` times its natural size.
 * `pose` (all optional): facing (1 right, -1 left), walking, attack (-1..0
 * winding up, 0..1 following through), nova, leap (0..1 through a jump),
 * down (0..1 collapsing). Heroes are drawn in profile, facing right, in
 * unscaled units with the feet at the origin; facing left mirrors them.
 * An evolved hero (`hero.form`, `hero.tier` 2 or 3) carries its form's
 * gear in the form's accent colour; an ascended one is a little taller
 * and burns with an aura.
 */
export function drawHero(ctx, hero, { x, y, s, color, time, pose = {} }) {
    const p = heroLook(hero, color, time, pose);
    const fusion = heroFusion(hero, pose, p.accent);
    if (fusion) p.marks = fusion.marks;
    ctx.save();
    placeHero(ctx, hero, { x, y, s, pose });
    if (p.tier > 1) ctx.scale(1 + 0.05 * (p.tier - 1), 1 + 0.05 * (p.tier - 1));
    if (fusion) {
        ctx.scale(fusion.grow, fusion.grow);
        fusionUnder(ctx, hero, fusion, p.t);
    }
    if (p.tier === 3) halo(ctx, 0, -24, 34, p.accent, 0.4 + 0.12 * Math.sin(p.t * 3));
    paintHero(ctx, hero.cls, color, p);
    if (fusion) fusionOver(ctx, hero, fusion, p.t);
    ctx.restore();
}

/** What the class painters need: animation clocks, the pose, the evolved form and its accent. */
function heroLook(hero, color, time, pose) {
    const id = hero.id ?? 0;
    const tier = hero.form ? (hero.tier ?? 1) : 1;
    const evolved = tier > 1;
    return {
        t: time + id * 0.37,
        walk: pose.walking ? time * WALK_RATE[hero.cls] + id : null,
        attack: pose.attack ?? null,
        nova: Boolean(pose.nova),
        leap: pose.leap ?? null,
        form: evolved ? hero.form : null,
        tier,
        accent: evolved ? FORM_INFO[hero.form]?.accent ?? color : color,
        marks: [],
    };
}

/** Moves the canvas to the hero's feet, facing its way; a falling hero fades and topples backwards. */
function placeHero(ctx, hero, { x, y, s, pose }) {
    const facing = (pose.facing ?? hero.facing ?? 1) < 0 ? -1 : 1;
    ctx.translate(x, y);
    ctx.scale(facing * s, s);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (pose.down !== undefined && pose.down !== null) {
        ctx.globalAlpha *= Math.max(0, 1 - pose.down);
        ctx.rotate(-Math.min(1, pose.down * 3) * Math.PI / 2);
    }
}

/**
 * How a fused hero is dressed, or null (not fused, or falling). `style`
 * comes from the fusion gallery's switch: 'current', 'one' or 'forged'.
 */
function heroFusion(hero, pose, accent) {
    if (!hero.fusion?.length || pose.down != null) return null;
    const style = globalThis.__fusionStyle ?? 'current';
    const grade = hero.grade ?? 1;
    const donors = hero.fusion.slice(1).filter((part) => FORM_INFO[part.form]);
    const colors = donors.map((d) => FORM_INFO[d.form].accent);
    return {
        style,
        grade,
        tint: colors.length ? colors : [accent],
        pip: colors[0] ?? accent,
        marks: fusionMarks(style, donors),
        grow: style === 'current' ? 1.08 : 1.04 + 0.05 * Math.min(grade, 4),
    };
}

/** The donor marks the body carries: every donor, only the strongest, or none. */
function fusionMarks(style, donors) {
    if (style === 'current') return donors.map((d) => d.form);
    if (style === 'one' && donors.length) return [donors.reduce((a, b) => (b.power > a.power ? b : a)).form];
    return [];
}

function fusionUnder(ctx, hero, fusion, t) {
    if (fusion.style === 'current') {
        drawHeroFusionUnder(ctx, hero.fusion, t);
        return;
    }
    cleanRing(ctx, fusion.tint, t);
    if (fusion.style === 'forged') auraFlames(ctx, fusion.tint, t, fusion.grade);
}

function fusionOver(ctx, hero, fusion, t) {
    if (fusion.style === 'current') {
        drawHeroFusionOver(ctx, hero.fusion, fusion.grade, t);
        return;
    }
    if (fusion.style === 'forged') veins(ctx, fusion.tint, t);
    gradePips(ctx, fusion.grade, fusion.pip);
}

/** A thin glowing ring at the feet, half in each donor's colour. */
function cleanRing(ctx, colors, t) {
    ctx.save();
    ctx.lineWidth = 1.4;
    const n = colors.length;
    for (let i = 0; i < n; i++) {
        const from = t * 0.8 + (i / n) * Math.PI * 2;
        ctx.strokeStyle = colors[i];
        ctx.shadowColor = colors[i];
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.ellipse(0, 0, 14, 5, 0, from, from + (Math.PI * 2) / n);
        ctx.stroke();
    }
    ctx.restore();
}

/** Tongues of light rising behind the body, in the donors' colours: taller with the grade. */
function auraFlames(ctx, colors, t, grade) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const tall = 40 + 6 * Math.min(grade, 4);
    for (let i = 0; i < 5; i++) {
        const x = -10 + i * 5;
        const h = tall * (0.7 + 0.3 * Math.sin(t * 5 + i * 1.9)) * (i === 2 ? 1.1 : 0.85);
        const g = ctx.createLinearGradient(0, 0, 0, -h);
        const c = colors[i % colors.length];
        g.addColorStop(0, withAlpha(c, 0.45));
        g.addColorStop(1, withAlpha(c, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x - 5, -2);
        ctx.quadraticCurveTo(x - 3, -h * 0.55, x + Math.sin(t * 4 + i) * 2, -h);
        ctx.quadraticCurveTo(x + 3, -h * 0.55, x + 5, -2);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
}

/** Glowing seams across the body, like metal welded together: one per donor colour. */
function veins(ctx, colors, t) {
    const lines = [
        [[-6, -28], [-3, -24], [-6, -20], [-2, -16]],
        [[4, -29], [1, -25], [4, -21], [1, -17]],
    ];
    ctx.save();
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';
    lines.forEach((pts, i) => {
        const c = colors[i % colors.length];
        ctx.strokeStyle = withAlpha('#ffffff', 0.9);
        ctx.shadowColor = c;
        ctx.shadowBlur = 6 + 3 * Math.sin(t * 4 + i);
        ctx.beginPath();
        pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
        ctx.strokeStyle = c;
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.lineWidth = 1.3;
    });
    ctx.restore();
}

/** The grade as small diamonds in a row over the head. */
function gradePips(ctx, grade, color) {
    const n = Math.min(grade, 5);
    for (let i = 0; i < n; i++) {
        const x = (i - (n - 1) / 2) * 6;
        const y = -54;
        halo(ctx, x, y, 6, color, 0.7);
        ctx.fillStyle = '#fff6e0';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y - 3.2);
        ctx.lineTo(x + 2.2, y);
        ctx.lineTo(x, y + 2.4);
        ctx.lineTo(x - 2.2, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
}

function paintHero(ctx, cls, color, p) {
    if (cls === 'guardian') guardian(ctx, color, p);
    else if (cls === 'neon_blade') blade(ctx, color, p);
    else if (cls === 'explorer') explorer(ctx, color, p);
    else mage(ctx, color, p);
}

const WALK_RATE = { guardian: 8, neon_blade: 15, technomancer: 4, explorer: 9 };
