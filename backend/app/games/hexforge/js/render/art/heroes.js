import { FORM_INFO } from '../../data/labels.js';
import { drawHeroFusionOver, drawHeroFusionUnder } from './fusionArt.js';
import { halo } from './primitives.js';
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
    const fusion = heroFusion(hero, pose);
    if (fusion) p.marks = fusion.marks;
    ctx.save();
    placeHero(ctx, hero, { x, y, s, pose });
    if (p.tier > 1) ctx.scale(1 + 0.05 * (p.tier - 1), 1 + 0.05 * (p.tier - 1));
    if (fusion) {
        ctx.scale(fusion.grow, fusion.grow);
        drawHeroFusionUnder(ctx, hero.fusion, p.t);
    }
    if (p.tier === 3) halo(ctx, 0, -24, 34, p.accent, 0.4 + 0.12 * Math.sin(p.t * 3));
    paintHero(ctx, hero.cls, color, p);
    if (fusion) drawHeroFusionOver(ctx, hero.fusion, fusion.grade, p.t);
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

/** How a fused hero is dressed, or null (not fused, or falling): it wears its donors' marks and stands a little taller. */
function heroFusion(hero, pose) {
    if (!hero.fusion?.length || pose.down != null) return null;
    const donors = hero.fusion.slice(1).filter((part) => FORM_INFO[part.form]);
    return { grade: hero.grade ?? 1, marks: donors.map((d) => d.form), grow: 1.08 };
}

function paintHero(ctx, cls, color, p) {
    if (cls === 'guardian') guardian(ctx, color, p);
    else if (cls === 'neon_blade') blade(ctx, color, p);
    else if (cls === 'explorer') explorer(ctx, color, p);
    else mage(ctx, color, p);
}

const WALK_RATE = { guardian: 8, neon_blade: 15, technomancer: 4, explorer: 9 };
