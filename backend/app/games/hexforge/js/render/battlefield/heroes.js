import { rotateVector } from '../../core/iso.js';
import { HERO_INFO } from '../../data/labels.js';
import { MAGE_ORB, drawHero, halo, withAlpha } from '../forgeArt.js';
import { HERO_SCALE } from './shared.js';

/** Heroes on the field: shadow, afterimages, hit flash, ward, mending, frost, the fall, and which way each one looks. */
export class HeroPainter {
    constructor(renderer) {
        this.renderer = renderer;
        this.facings = new Map();     // which way each hero last looked, so standing heroes do not flip
    }

    hero(hero, time) {
        const { ctx, camera } = this.renderer;
        const s = camera.scale * HERO_SCALE;
        const info = HERO_INFO[hero.cls];
        const foot = this.renderer.at(hero.x, hero.y);
        const lift = hero.leap === null ? 0 : Math.sin(Math.PI * hero.leap) * 34 * s;
        const facing = this.#facing(hero, foot);

        // shadow (smaller while in the air) and a ring in the class colour: whose hero this is
        const shrink = 1 - 0.45 * (lift / (34 * s || 1));
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.ellipse(foot.x, foot.y, 12 * s * shrink, 5.5 * s * shrink, 0, 0, Math.PI * 2);
        ctx.fill();
        if (lift === 0) {
            ctx.strokeStyle = withAlpha(info.color, 0.8);
            ctx.lineWidth = 1.6 * camera.scale;
            ctx.beginPath();
            ctx.ellipse(foot.x, foot.y, 12 * s, 5.5 * s, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        const pose = {
            facing,
            walking: hero.moving && hero.leap === null,
            attack: hero.attack?.phase ?? null,
            nova: hero.attack?.nova ?? false,
            leap: hero.leap,
        };
        if (hero.cls === 'neon_blade' && (hero.moving || lift > 0)) {
            // afterimages trailing the assassin: the bare silhouette, so a fused one stays sharp
            const back = this.#screenHeading(hero);
            const bare = { ...hero, fusion: null };
            for (const k of [2, 1]) {
                ctx.globalAlpha = 0.14 * k;
                drawHero(ctx, bare, {
                    x: foot.x - back.x * k * 6 * s, y: foot.y - lift - back.y * k * 6 * s,
                    s, color: info.color, time: time - k * 0.04, pose,
                });
            }
            ctx.globalAlpha = 1;
        }
        const look = { x: foot.x, y: foot.y - lift, s, color: info.color, time, pose };
        drawHero(ctx, hero, look);
        if (hero.hurt > 0) {
            // flash when hit
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = hero.hurt * 0.6;
            drawHero(ctx, hero, look);
            ctx.restore();
        }
        if (hero.shield > 0) {
            // a ward sigil: a bubble that fades as it soaks blows
            const k = 0.35 + 0.65 * (hero.shield / (hero.maxShield || 1));
            ctx.save();
            ctx.fillStyle = `rgba(111, 211, 255, ${0.12 * k})`;
            ctx.strokeStyle = `rgba(160, 230, 255, ${0.75 * k})`;
            ctx.lineWidth = 1.5 * camera.scale;
            ctx.beginPath();
            ctx.ellipse(foot.x, foot.y - lift - 22 * s, 17 * s, 27 * s, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
        if (hero.mending && hero.hp < hero.maxHp) {
            // a mending rune: green motes rising while it heals
            ctx.save();
            ctx.fillStyle = '#7dff9a';
            for (let i = 0; i < 3; i++) {
                const phase = (time * 0.9 + i / 3 + hero.id * 0.17) % 1;
                ctx.globalAlpha = 0.8 * (1 - phase);
                ctx.fillRect(foot.x + (i - 1) * 7 * s - 1.5 * s, foot.y - lift - (8 + 40 * phase) * s, 3 * s, 3 * s);
            }
            ctx.restore();
        }
        if (hero.slowed) {
            ctx.fillStyle = 'rgba(159, 227, 255, 0.28)';
            ctx.beginPath();
            ctx.ellipse(foot.x, foot.y - lift - 20 * s, 14 * s, 22 * s, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    fallen(hero, time, age) {
        const s = this.renderer.camera.scale * HERO_SCALE;
        const foot = this.renderer.at(hero.x, hero.y);
        drawHero(this.renderer.ctx, hero, {
            x: foot.x, y: foot.y, s, color: HERO_INFO[hero.cls].color, time,
            pose: { facing: this.facings.get(hero.id) ?? 1, down: age },
        });
    }

    /** Face the blow's target while fighting, the way of travel while walking; otherwise keep looking where it was. */
    #facing(hero, foot) {
        let dx = 0;
        if (hero.attack?.target) dx = this.renderer.at(hero.attack.target.x, hero.attack.target.y).x - foot.x;
        else if (hero.heading) {
            const h = rotateVector(hero.heading.dx, hero.heading.dy, this.renderer.rot);
            dx = h.dx - h.dy;
        }
        const facing = Math.abs(dx) > 0.01 ? Math.sign(dx) : (this.facings.get(hero.id) ?? 1);
        this.facings.set(hero.id, facing);
        return facing;
    }

    /** Unit screen vector of where the hero is heading. */
    #screenHeading(hero) {
        const h = rotateVector(hero.heading?.dx ?? 0, hero.heading?.dy ?? 0, this.renderer.rot);
        const x = h.dx - h.dy;
        const y = (h.dx + h.dy) / 2;
        const len = Math.hypot(x, y) || 1;
        return { x: x / len, y: y / len };
    }

    /** The Technomancer's bolt, flying from the orb to the target as the blow is wound up. */
    mageBolt(hero, time) {
        const k = (hero.attack.phase + 0.6) / 0.6;
        if (k <= 0 || hero.attack.building === null || !this.renderer.byId.has(hero.attack.building)) return;
        const { ctx } = this.renderer;
        const s = this.renderer.camera.scale * HERO_SCALE;
        const foot = this.renderer.at(hero.x, hero.y);
        const facing = this.facings.get(hero.id) ?? 1;
        const from = { x: foot.x + facing * MAGE_ORB.x * s, y: foot.y + MAGE_ORB.y * s };
        const to = this.renderer.effects.buildingPoint(hero.attack.building);
        const color = HERO_INFO[hero.cls].color;
        const at = (q) => ({ x: from.x + (to.x - from.x) * q, y: from.y + (to.y - from.y) * q - Math.sin(q * Math.PI) * 14 * s });
        for (let i = 4; i >= 1; i--) {
            const q = at(Math.max(0, k - i * 0.07));
            halo(ctx, q.x, q.y, (7 - i) * s, color, 0.7 - i * 0.12);
        }
        const p = at(k);
        halo(ctx, p.x, p.y, 14 * s, color, 1);
        ctx.fillStyle = '#f1eaff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3 * s + Math.sin(time * 40) * 0.5 * s, 0, Math.PI * 2);
        ctx.fill();
    }
}
