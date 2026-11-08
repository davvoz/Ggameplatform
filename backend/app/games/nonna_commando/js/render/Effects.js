import { C, PARTY } from '../config/Palette.js';
import { Pool } from '../core/Pool.js';
import { Ev } from '../sim/Events.js';
import { EXPLOSION_FRAMES, SMALL_FRAMES } from './art/FxArt.js';

/**
 * Everything that is only for the eyes: particles, one-shot animations,
 * floating points, danger markers, shake and flash. It listens to simulation
 * events and never feeds anything back, so it can use plain Math.random.
 * All of it lives in pools: a big fight allocates nothing.
 */

class Particle {
    active = false;
    x = 0; y = 0; vx = 0; vy = 0;
    life = 0; age = 0;
    gravity = 0; drag = 1;
    color = '';
    w = 1; h = 1;
    /** confetti flutters, casing bounces, smoke is a sprite */
    kind = 'dot';
    sprite = '';
    ground = 999;
}

class Anim {
    active = false;
    x = 0; y = 0;
    prefix = '';
    frames = 1;
    frameTicks = 3;
    age = 0;
    flip = false;
    angle = 0;
}

class FloatText {
    active = false;
    x = 0; y = 0;
    text = '';
    color = '';
    age = 0;
    life = 60;
    big = false;
}

class Marker {
    active = false;
    x = 0; y = 0;
    kind = '';
    age = 0;
    life = 0;
    extra = 0;
}

const MATERIAL_DEBRIS = {
    flesh: [C.uni, C.uniShade, C.pink],
    metal: [C.metal, C.metalLight, C.metalDark],
    wood: [C.wood, C.woodLight, C.woodDark],
    tray: [C.metalLight, C.white],
    dirt: [C.stone, C.stoneShade],
    spark: [C.fireWhite, C.fireYellow],
};

export class Effects {
    particles = new Pool(() => new Particle(), 700);
    anims = new Pool(() => new Anim(), 160);
    texts = new Pool(() => new FloatText(), 40);
    markers = new Pool(() => new Marker(), 24);
    shake = 0;
    shakeTicks = 0;
    flash = 0;
    flashColor = C.white;
    /** banner text across the screen */
    banner = '';
    bannerAge = 0;
    /** boss name card */
    bossCard = '';
    bossCardAge = 0;
    goAge = 999;
    /** frames since the multiplier went up / was lost, for HUD pulses */
    chainPulse = 99;
    chainLost = 99;
    lastLost = 0;

    reset() {
        this.particles.clear();
        this.anims.clear();
        this.texts.clear();
        this.markers.clear();
        this.shake = 0;
        this.flash = 0;
        this.banner = '';
        this.bossCard = '';
        this.goAge = 999;
    }

    /** @param {import('../sim/Events.js').EventQueue} events */
    handle(events) {
        for (let i = 0; i < events.count; i++) this.#on(events.items[i]);
    }

    #on(e) {
        switch (e.type) {
            case Ev.SHOT: return this.#shot(e);
            case Ev.ENEMY_SHOT:
                this.anim('fx_muzzle', e.x, e.y, 2, 2);
                return;
            case Ev.HIT: return this.#hit(e);
            case Ev.CLANG:
                this.anim('fx_clang', e.x, e.y, 1, 4);
                this.debris(e.x, e.y, 'tray', 4, -e.a);
                return;
            case Ev.KILL: return this.#kill(e);
            case Ev.BONUS_TEXT:
                if (e.s) this.text(e.s, e.x, e.y - 8, C.yellow, false, 50);
                else if (e.a > 0) this.text(`+${e.a}`, e.x, e.y, C.white);
                return;
            case Ev.EXPLODE: return this.#explode(e);
            case Ev.SHAKE:
                this.addShake(e.a, e.b);
                return;
            case Ev.JUMP:
                this.anim('fx_dust', e.x, e.y, 3, 3);
                return;
            case Ev.LAND:
                this.anim('fx_dust', e.x - 4, e.y, 3, 3);
                this.anim('fx_dust', e.x + 4, e.y, 3, 3, true);
                return;
            case Ev.MELEE:
                if (e.s !== 'enemy') this.anim('fx_hit', e.x, e.y, 1, 5);
                return;
            case Ev.PLAYER_HURT:
                this.flash = 6;
                this.flashColor = C.bandana;
                this.addShake(3, 10);
                return;
            case Ev.PLAYER_DIE:
                this.flash = 10;
                this.flashColor = C.bandana;
                this.addShake(5, 20);
                this.text('MANNAGGIA!', e.x, e.y - 30, C.white, true, 90);
                return;
            case Ev.PICKUP: return this.#pickup(e);
            case Ev.WEAPON:
                if (e.s !== 'pistol') this.text(WEAPON_TEXT[e.s] ?? '', e.x, e.y - 24, C.yellow, true, 70);
                else this.text('OUT OF AMMO', e.x, e.y - 30, C.white, false, 50);
                return;
            case Ev.RESCUE:
                this.text(e.s, e.x, e.y - 14, C.cyan, false, 80);
                this.confetti(e.x, e.y, 18);
                return;
            case Ev.CHAIN_UP:
                this.chainPulse = 0;
                return;
            case Ev.CHAIN_LOST:
                this.chainLost = 0;
                this.lastLost = e.a;
                return;
            case Ev.SWAT:
                this.anim('fx_pop', e.x, e.y, SMALL_FRAMES, 3);
                return;
            case Ev.PROP_BREAK: return this.#propBreak(e);
            case Ev.TELEGRAPH: return this.#telegraph(e);
            case Ev.BANNER:
                this.banner = e.s;
                this.bannerAge = 0;
                return;
            case Ev.GO:
                this.goAge = 0;
                return;
            case Ev.BOSS_INTRO:
                this.bossCard = e.s;
                this.bossCardAge = 0;
                this.addShake(2, 40);
                return;
            case Ev.BOSS_PHASE:
                this.confetti(e.x, e.y, 30);
                return;
            case Ev.BOSS_DEAD:
                this.flash = 14;
                this.flashColor = C.white;
                return;
            case Ev.POP:
                this.anim('balloon_pop', e.x, e.y, 1, 6);
                if (e.s === 'release') {
                    for (let k = 0; k < 3; k++) this.particle('sprite', e.x + k * 5 - 5, e.y, (Math.random() - 0.5) * 0.4, -0.8 - Math.random() * 0.3, 160, -0.002, `balloon_${k}`);
                }
                return;
            case Ev.EXTRA_LIFE:
                this.text('1UP!', e.x || 60, e.y || 40, C.lime, true, 90);
                return;
            case Ev.SHOCKWAVE:
                for (let k = 0; k < 10; k++) this.particle('dot', e.x + (Math.random() - 0.5) * 30, e.y - 2, (Math.random() - 0.5) * 3, -Math.random() * 2.5, 30, 0.15, '', C.stone, 2);
                return;
            case Ev.SPEECH:
                return;
            default:
                return;
        }
    }

    // ---- building blocks

    anim(prefix, x, y, frames, frameTicks, flip = false, angle = 0) {
        const a = this.anims.acquire();
        if (!a) return;
        a.prefix = prefix;
        a.x = x;
        a.y = y;
        a.frames = frames;
        a.frameTicks = frameTicks;
        a.age = 0;
        a.flip = flip;
        a.angle = angle;
    }

    particle(kind, x, y, vx, vy, life, gravity, sprite = '', color = C.white, w = 1, h = 1) {
        const p = this.particles.acquire();
        if (!p) return null;
        p.kind = kind;
        p.x = x;
        p.y = y;
        p.vx = vx;
        p.vy = vy;
        p.life = life;
        p.age = 0;
        p.gravity = gravity;
        p.drag = kind === 'confetti' ? 0.96 : kind === 'smoke' ? 0.97 : 0.99;
        p.sprite = sprite;
        p.color = color;
        p.w = w;
        p.h = h;
        p.ground = 999;
        return p;
    }

    text(text, x, y, color = C.white, big = false, life = 55) {
        const t = this.texts.acquire();
        if (!t) return;
        t.text = text;
        t.x = x;
        t.y = y;
        t.color = color;
        t.big = big;
        t.age = 0;
        t.life = life;
    }

    confetti(x, y, count) {
        for (let k = 0; k < count; k++) {
            const a = Math.random() * Math.PI * 2;
            const s = 1 + Math.random() * 2.6;
            this.particle('confetti', x, y, Math.cos(a) * s, Math.sin(a) * s - 1.6, 60 + Math.random() * 50, 0.06, '', PARTY[k % 5], 2, 1);
        }
    }

    debris(x, y, material, count, dir = 0) {
        const colors = MATERIAL_DEBRIS[material] ?? MATERIAL_DEBRIS.dirt;
        for (let k = 0; k < count; k++) {
            this.particle('dot', x, y, (Math.random() - 0.5) * 2.4 + dir * 1.2, -Math.random() * 2.4 - 0.5, 26 + Math.random() * 20, 0.16, '', colors[k % colors.length], 1 + (k % 2), 1 + ((k >> 1) % 2));
        }
    }

    smoke(x, y, count, spread = 6) {
        for (let k = 0; k < count; k++) {
            this.particle('smoke', x + (Math.random() - 0.5) * spread, y + (Math.random() - 0.5) * spread, (Math.random() - 0.5) * 0.4, -0.3 - Math.random() * 0.4, 40 + Math.random() * 30, -0.002, `fx_smoke${k % 3}`);
        }
    }

    addShake(strength, ticks) {
        this.shake = Math.max(this.shake, strength);
        this.shakeTicks = Math.max(this.shakeTicks, ticks);
    }

    // ---- reactions

    #shot(e) {
        const w = e.s;
        const flip = e.a < 0;
        if (w === 'shotgun') {
            const angle = Math.atan2(e.b, Math.abs(e.a)) * (flip ? -1 : 1);
            this.anim('fx_blast', e.x, e.y, 3, 2, flip, angle);
            this.smoke(e.x + e.a * 30, e.y + e.b * 30, 4, 20);
            this.addShake(2, 5);
        } else if (w !== 'flamer') {
            this.anim('fx_muzzle', e.x + e.a * 2, e.y + e.b * 2, 2, 2);
        }
        if (w === 'pistol' || w === 'heavy' || w === 'shotgun') {
            // brass casings
            const p = this.particle('casing', e.x - e.a * 10, e.y, -e.a * (0.6 + Math.random()) + (Math.random() - 0.5) * 0.4, -1.6 - Math.random(), 40, 0.18, '', C.brass, 1, 2);
            if (p) p.ground = e.y + 18;
        }
        if (w === 'fireworks') this.smoke(e.x, e.y, 2);
    }

    #hit(e) {
        const m = e.s;
        if (m === 'dirt') {
            this.anim('fx_dust', e.x, e.y, 3, 2);
            return;
        }
        if (m === 'spark') {
            this.anim('fx_hit', e.x, e.y, 1, 2);
            return;
        }
        this.anim('fx_hit', e.x, e.y, 1, 3);
        this.debris(e.x, e.y, m, m === 'metal' ? 3 : 2, e.a);
    }

    #kill(e) {
        const enemy = e.ref;
        const big = enemy?.isBoss;
        // the party never stops: confetti and a flying party hat
        this.confetti(e.x, e.y + 10, big ? 60 : 14);
        if (enemy && !big && enemy.type !== 'drone' && enemy.type !== 'turret' && enemy.type !== 'gull') {
            this.particle('hat', e.x, e.y, (Math.random() - 0.5) * 2, -3 - Math.random() * 1.5, 70, 0.14, '', PARTY[enemy.id % 5]);
        }
        if (e.a > 0) {
            const mult = e.b > 1 ? ` X${e.b}` : '';
            this.text(`${e.a}${mult}`, e.x, e.y - 4, e.b >= 6 ? C.pink : e.b >= 3 ? C.yellow : C.white, big, big ? 120 : 55);
        }
    }

    #explode(e) {
        const r = e.a;
        if (e.s === 'confetti') {
            this.anim('fx_pop', e.x, e.y, SMALL_FRAMES, 3);
            this.confetti(e.x, e.y, 40);
            return;
        }
        if (e.s === 'small' || r < 16) {
            this.anim('fx_pop', e.x, e.y, SMALL_FRAMES, 3);
            this.debris(e.x, e.y, 'metal', 4);
            return;
        }
        if (e.s === 'big') {
            for (let k = 0; k < 5; k++) {
                this.anim('fx_boom', e.x + (Math.random() - 0.5) * r, e.y + (Math.random() - 0.5) * r * 0.6, EXPLOSION_FRAMES, 4);
            }
            this.confetti(e.x, e.y, 80);
            this.smoke(e.x, e.y, 12, r);
            this.flash = 10;
            this.flashColor = C.fireWhite;
            return;
        }
        this.anim('fx_boom', e.x, e.y, EXPLOSION_FRAMES, 3);
        if (e.s === 'meatball') {
            this.debris(e.x, e.y, 'wood', 6);
            for (let k = 0; k < 6; k++) this.particle('dot', e.x, e.y, (Math.random() - 0.5) * 3, -Math.random() * 3, 30, 0.15, '', C.clownRed, 2, 2);
        }
        this.smoke(e.x, e.y - 4, 3, r * 0.6);
        for (let k = 0; k < 6; k++) this.particle('dot', e.x, e.y, (Math.random() - 0.5) * 4, -Math.random() * 4, 24, 0.12, '', C.fireYellow, 1, 1);
    }

    #pickup(e) {
        const t = e.s;
        this.anim('fx_hit', e.x, e.y, 1, 4);
        if (t === 'tooth' || t === 'life') this.confetti(e.x, e.y, 20);
        for (let k = 0; k < 6; k++) {
            const a = (k / 6) * Math.PI * 2;
            this.particle('dot', e.x, e.y, Math.cos(a) * 1.5, Math.sin(a) * 1.5, 16, 0, '', C.fireWhite, 1, 1);
        }
    }

    #propBreak(e) {
        const kind = e.s;
        if (kind === 'barrel') return;
        if (kind === 'tray') {
            this.debris(e.x, e.y, 'tray', 10);
            return;
        }
        if (kind === 'tier' || kind === 'mech') {
            this.debris(e.x, e.y, kind === 'mech' ? 'metal' : 'wood', 24);
            this.confetti(e.x, e.y, 30);
            return;
        }
        this.debris(e.x, e.y, kind === 'speaker' || kind === 'gate' ? 'metal' : 'wood', 12);
        this.anim('fx_pop', e.x, e.y, SMALL_FRAMES, 3);
        if (kind === 'cake' || kind === 'cutout') this.confetti(e.x, e.y, 16);
    }

    #telegraph(e) {
        const m = this.markers.acquire();
        if (!m) return;
        m.kind = e.s;
        m.x = e.x;
        m.y = e.y;
        m.age = 0;
        m.extra = e.a;
        m.life = e.s === 'target' || e.s === 'shadow' ? e.a : e.s === 'laser' ? 56 : e.s === 'duck' || e.s === 'jump' ? 50 : 30;
    }

    /** One tick of visual time (the renderer calls it once per simulation tick). */
    tick() {
        if (this.shakeTicks > 0) this.shakeTicks--;
        else this.shake *= 0.8;
        if (this.flash > 0) this.flash--;
        this.bannerAge++;
        this.bossCardAge++;
        this.goAge++;
        this.chainPulse++;
        this.chainLost++;
        for (const p of this.particles.items) {
            if (!p.active) continue;
            p.age++;
            if (p.age >= p.life) {
                p.active = false;
                continue;
            }
            p.vy += p.gravity;
            p.vx *= p.drag;
            p.vy *= p.kind === 'confetti' ? 0.97 : 1;
            if (p.kind === 'confetti') p.x += Math.sin((p.age + p.life) * 0.25) * 0.4;
            p.x += p.vx;
            p.y += p.vy;
            if (p.kind === 'casing' && p.y > p.ground) {
                p.y = p.ground;
                p.vy *= -0.4;
                p.vx *= 0.6;
            }
        }
        for (const a of this.anims.items) {
            if (!a.active) continue;
            a.age++;
            if (a.age >= a.frames * a.frameTicks) a.active = false;
        }
        for (const t of this.texts.items) {
            if (!t.active) continue;
            t.age++;
            if (t.age < 20) t.y -= 0.6;
            if (t.age >= t.life) t.active = false;
        }
        for (const m of this.markers.items) {
            if (!m.active) continue;
            m.age++;
            if (m.age >= m.life) m.active = false;
        }
    }
}

const WEAPON_TEXT = {
    heavy: 'HEAVY MACHINEGUN!',
    shotgun: 'LUPARA!',
    fireworks: 'FIREWORKS!',
    flamer: 'CANDLE FLAMER!',
};
