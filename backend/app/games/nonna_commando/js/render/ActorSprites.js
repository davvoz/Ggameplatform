import { PlayerTuning } from '../config/Tuning.js';
import { HIP, HIP_CROUCH, RUN_BOB, RUN_FRAMES } from './art/NonnaArt.js';

/**
 * Turns simulation state into sprite names. Pure functions: they read an
 * entity and its age and return what to draw, nothing else.
 */

const HUMANOIDS = new Set(['grunt', 'grenadier', 'shield', 'sniper', 'guard', 'bazooka', 'balloon', 'clown']);

/** @returns {{name: string, flip: boolean}} */
export function enemySprite(e) {
    const t = e.age;
    const flip = e.facing < 0;
    if (HUMANOIDS.has(e.type)) return { name: humanoid(e, t), flip };
    switch (e.type) {
        case 'drone':
            if (e.dead) return { name: 'drone_3', flip };
            return { name: e.anim === 'lock' ? 'drone_2' : e.anim === 'dive' ? 'drone_3' : `drone_${(t >> 1) & 1}`, flip };
        case 'gull':
            // drawn facing left
            return { name: e.anim === 'swoop' || e.dead ? 'gull_swoop' : `gull_${(t >> 2) & 3}`, flip: e.facing > 0 };
        case 'mortar':
            if (e.dead) return { name: 'grunt_dead0', flip };
            return { name: `mortar_${e.anim === 'load' ? 'load' : e.anim === 'recoil' ? 'recoil' : 'idle'}`, flip };
        case 'panzerpig': {
            const a = e.anim;
            if (a === 'drive' || a === 'idle' || e.dead) return { name: `panzerpig_drive${(t >> 2) & 1}`, flip };
            if (a === 'charge') return { name: (t >> 1) & 1 ? 'panzerpig_charge' : 'panzerpig_drive1', flip };
            return { name: `panzerpig_${a}`, flip };
        }
        case 'torta': {
            const a = e.anim;
            const base = `torta${Math.max(1, e.tiers)}_`;
            if (a === 'walk' || a === 'idle') return { name: `${base}walk${(t >> 3) & 3}`, flip };
            if (a === 'run') return { name: `${base}run${(t >> 2) & 1}`, flip };
            return { name: base + a, flip };
        }
        case 'gelato': {
            const a = e.anim;
            if (a === 'drive' || a === 'idle') return { name: `gelato_drive${(t >> 2) & 1}`, flip };
            return { name: `gelato_${a}`, flip };
        }
        case 'pinata': {
            const kind = e.anim === 'gun' ? 'gun' : e.anim === 'hatch' ? 'hatch' : 'fly';
            return { name: `pinata${e.phase > 0 ? 1 : 0}_${kind}${t % 3}`, flip };
        }
        case 'baffone': {
            const a = e.anim;
            if (a === 'walk') return { name: `baffone_walk${(t >> 3) & 3}`, flip };
            if (a === 'spin') return { name: `baffone_spin${(t >> 1) & 1}`, flip };
            if (a === 'gatling') return { name: `baffone_gatling${(t >> 1) & 1}`, flip };
            return { name: `baffone_${a === 'idle' || !a ? 'idle' : a}`, flip };
        }
        case 'throne': {
            const a = e.anim;
            if (e.phase >= 2) return { name: `supremo_${a === 'jetCharge' ? 'jetCharge' : 'jet'}${(t >> 1) & 1}`, flip };
            if (a === 'walk') return { name: `throne_walk${(t >> 3) & 3}`, flip };
            return { name: `throne_${a || 'idle'}`, flip };
        }
        default:
            return { name: '', flip };
    }
}

function humanoid(e, t) {
    let type = e.type;
    if (type === 'shield' && e.tray <= 0) type = 'grunt';
    if (e.dead) {
        if (e.deathStyle === 'burnt') return `${type}_burnt`;
        return e.vy !== 0 || e.t < 12 ? `${type}_dead0` : `${type}_dead1`;
    }
    switch (e.anim) {
        case 'walk': return `${type}_walk${(t >> (type === 'clown' ? 2 : 3)) & 3}`;
        case 'run': return `${type}_walk${(t >> 2) & 3}`;
        case 'aim':
            if (type === 'bazooka') return 'bazooka_kneel';
            if (type === 'grenadier') return 'grenadier_throw0';
            return `${type}_aim`;
        case 'recoil':
            if (type === 'bazooka') return 'bazooka_kneelFire';
            if (type === 'grenadier') return 'grenadier_throw1';
            return `${type}_recoil`;
        case 'kneel': return `${type}_kneel`;
        case 'windup': return `${type}_windup`;
        case 'stab': return `${type}_stab`;
        case 'party': return `${type}_party${(t >> 4) & 1}`;
        case 'surprised':
        case 'lit': return `${type}_surprised`;
        case 'panic': return `${type}_panic${(t >> 2) & 3}`;
        case 'fall':
        case 'drop': return `${type}_fall`;
        case 'float': return `${type}_float`;
        default: return `${type}_idle${(t >> 5) & 1}`;
    }
}

const STEP_AIM = ['up', 'up', 'upDiag', 'upDiag', 'fwd', 'downDiag', 'downDiag', 'down', 'down'];

/**
 * Nonna is two sprites: legs and upper body.
 * @returns {{lower: string, upper: string, hip: number, flip: boolean, whole?: string}}
 */
export function playerSprites(p) {
    const b = p.body;
    const flip = p.facing < 0;
    if (p.state === 'dying') return { whole: b.onGround ? 'nonna_dead1' : 'nonna_dead0', lower: '', upper: '', hip: 0, flip };

    let lower;
    let hip = HIP;
    if (p.crouching) {
        lower = Math.abs(b.vx) > 0.1 ? `nonna_lo_crouch${(Math.floor(p.stride / 5)) & 3}` : 'nonna_lo_crouch0';
        hip = HIP_CROUCH;
    } else if (!b.onGround) {
        lower = b.vy < 0 ? 'nonna_lo_jump' : 'nonna_lo_fall';
    } else if (Math.abs(b.vx) > 0.15) {
        const f = Math.floor(p.stride / 4) % RUN_FRAMES;
        lower = `nonna_lo_run${f}`;
        hip = HIP - RUN_BOB[f];
    } else {
        lower = 'nonna_lo_stand';
    }
    if (p.landTicks < 4 && !p.crouching) hip -= 1;

    let upper;
    if (p.meleeTicks > 0) {
        const k = PlayerTuning.meleeTicks - p.meleeTicks;
        upper = `nonna_up_melee${k < 5 ? 0 : k < 10 ? 1 : 2}`;
    } else if (p.throwTicks > 0) {
        upper = `nonna_up_throw${p.throwTicks > 8 ? 0 : 1}`;
    } else {
        const w = p.arsenal.weapon;
        const step = w.sweeps ? p.arsenal.step : p.aimStep;
        const aim = STEP_AIM[step + 4];
        const recoil = p.recoilTicks > 2 ? 1 : 0;
        const running = lower.startsWith('nonna_lo_run') && aim === 'fwd' && !recoil;
        upper = running ? `nonna_up_${w.id}_fwd_run` : `nonna_up_${w.id}_${aim}_${recoil}`;
    }
    return { lower, upper, hip, flip };
}

export function hostageSprite(h) {
    const k = `kid${h.look}_`;
    switch (h.state) {
        case 'tied': return { name: `${k}tied${(h.t >> 4) & 1}`, flip: false };
        case 'freed': return { name: `${k}freed`, flip: false };
        case 'thanks': return { name: `${k}thanks`, flip: false };
        default: return { name: `${k}run${(h.t >> 2) & 3}`, flip: true };
    }
}

/** Shot sprite and rotation. */
export function shotSprite(p) {
    const k = p.kind;
    const angle = Math.atan2(p.vy, p.vx);
    switch (k) {
        case 'bullet': return { name: Math.abs(p.vy) > Math.abs(p.vx) * 1.5 ? 'shot_bulletV' : 'shot_bullet', angle: Math.abs(p.vy) > 0.3 && Math.abs(p.vx) > 0.3 ? angle : 0 };
        case 'heavyBullet': return { name: 'shot_heavyBullet', angle };
        case 'rocket': return { name: `shot_rocket${(p.age >> 1) & 1}`, angle };
        case 'meatball': return { name: 'shot_meatball', angle: p.age * 0.3 };
        case 'flame':
        case 'eFlame': return { name: `fx_flame${Math.min(2, p.age >> 3)}`, angle: 0 };
        case 'eBullet': return { name: `shot_eBullet${(p.age >> 2) & 1}`, angle: 0 };
        case 'eFast': return { name: 'shot_eFast', angle };
        case 'eSprinkle': return { name: `shot_eSprinkle${(Math.floor(p.y) + Math.floor(p.vx * 10)) % 5 < 0 ? 0 : (Math.floor(p.y) + Math.floor(p.vx * 10)) % 5}`, angle: 0 };
        case 'eRocket': return { name: `shot_eRocket${(p.age >> 1) & 1}`, angle: angle + Math.PI };
        case 'eMissile': return { name: `shot_eMissile${(p.age >> 1) & 1}`, angle: angle + Math.PI };
        case 'wax': return { name: `shot_wax${(p.age >> 2) & 1}`, angle: 0 };
        case 'wave': return { name: `shot_wave${(p.age >> 2) & 1}`, angle: 0 };
        case 'blast': return { name: '', angle: 0 };
        default: return { name: `shot_${k}`, angle: k === 'eGrenade' || k === 'cherry' ? p.age * 0.2 : 0 };
    }
}
