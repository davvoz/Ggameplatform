import { C, PARTY } from '../../config/Palette.js';
import { ball, frame, hash2 } from './ArtKit.js';

/**
 * The bosses. Each is a painter with a few parameters (treads, legs, rotor,
 * damage), baked into every frame its states need. All drawn facing right.
 */
export function bakeBosses(bank) {
    bakePanzerpig(bank);
    bakeTorta(bank);
    bakeGelato(bank);
    bakePinata(bank);
    bakeBaffone(bank);
    bakeThrone(bank);
}

// ------------------------------------------------------------ PANZERPIG

function bakePanzerpig(bank) {
    const poses = {
        drive0: { tread: 0 }, drive1: { tread: 1 },
        aimHigh: { snout: -1 }, fireHigh: { snout: -1, fire: 'high' },
        aimLow: { snout: 1 }, fireLow: { snout: 1, fire: 'low' },
        snort: { tread: 1, smoke: true }, charge: { tread: 0, lean: 2 },
    };
    for (const [name, p] of Object.entries(poses)) {
        frame(bank, `panzerpig_${name}`, 84, 56, 42, 54, (pc) => panzerpig(pc, p));
    }
}

function panzerpig(pc, { tread = 0, snout = 0, fire = '', smoke = false, lean = 0 }) {
    const x = 42 + lean;
    const g = 53;
    // tracks
    pc.rect(12, g - 12, 60, 12, C.metalDark);
    pc.rect(12, g - 12, 60, 2, C.metal);
    for (let i = 0; i < 7; i++) {
        const wx = 17 + i * 8 + tread * 4;
        if (wx < 70) {
            pc.circle(wx, g - 6, 3, C.metal);
            pc.px(wx, g - 6, C.ink);
        }
    }
    for (let i = 0; i < 15; i++) pc.px(13 + i * 4 + tread * 2, g - 1, C.inkSoft);
    // the pig
    pc.ellipse(x - 2, g - 24, 30, 15, C.pink);
    pc.ellipse(x - 5, g - 20, 26, 10, C.pinkShade);
    pc.ellipse(x - 2, g - 27, 27, 11, C.pink);
    pc.ellipse(x - 8, g - 32, 14, 4, C.clownWhite);
    // rivets and rust
    for (let i = 0; i < 6; i++) pc.px(x - 22 + i * 7, g - 18, C.pinkShade);
    pc.rect(x - 18, g - 26, 3, 2, C.terracotta);
    pc.rect(x + 2, g - 15, 4, 2, C.terracotta);
    // curly tail antenna
    pc.line(x - 31, g - 28, x - 35, g - 32, C.pinkShade);
    pc.circle(x - 36, g - 34, 2, C.pink);
    // ear
    pc.poly([[x + 12, g - 36], [x + 20, g - 44], [x + 21, g - 34]], C.pink);
    pc.poly([[x + 14, g - 37], [x + 19, g - 42], [x + 19, g - 36]], C.pinkShade);
    // eye with an angry brow
    pc.circle(x + 18, g - 30, 3, C.white);
    pc.rect(x + 19, g - 31, 2, 2, C.ink);
    pc.line(x + 14, g - 35, x + 22, g - 32, C.ink);
    // turret with party hat
    pc.ellipse(x - 6, g - 39, 9, 5, C.metal);
    pc.rect(x - 15, g - 39, 18, 3, C.metalDark);
    pc.poly([[x - 11, g - 43], [x - 1, g - 43], [x - 6, g - 56]], C.yellow);
    pc.line(x - 9, g - 47, x - 3, g - 48, C.pink);
    pc.line(x - 8, g - 51, x - 4, g - 51, C.pink);
    pc.rect(x - 2, g - 41, 14, 2, C.metalDark);
    // snout cannon: the nostrils are the barrels
    const sy = g - 24 + snout * 3;
    pc.ellipse(x + 30, sy, 6, 7, C.pinkShade);
    pc.ellipse(x + 31, sy, 5, 6, C.pink);
    pc.circle(x + 31, sy - 2, 1.6, C.ink);
    pc.circle(x + 31, sy + 2, 1.6, C.ink);
    // low machinegun under the chin
    pc.rect(x + 22, g - 12, 12, 3, C.metalDark);
    pc.px(x + 34, g - 11, C.ink);
    if (fire === 'high') {
        pc.circle(x + 38, sy, 5, C.fireYellow);
        pc.circle(x + 38, sy, 2.5, C.fireWhite);
    }
    if (fire === 'low') pc.circle(x + 37, g - 11, 3, C.fireYellow);
    if (smoke) {
        pc.circle(x + 40, sy - 3, 3, C.smokeLight);
        pc.circle(x + 44, sy + 2, 2.5, C.smokeLight);
    }
}

// ------------------------------------------------------------ TORTA MAXIMA

function bakeTorta(bank) {
    const poses = {
        walk0: { step: 0 }, walk1: { step: 1 }, walk2: { step: 2 }, walk3: { step: 3 },
        crouch: { crouch: 6 }, jump: { step: 4 }, land: { crouch: 8 },
        candles: { candles: 2 }, cherries: { mouth: 1 }, mouthOpen: { mouth: 2 }, frosting: { mouth: 3 },
        run0: { step: 0, lean: 2 }, run1: { step: 2, lean: 2 },
    };
    for (let tiers = 1; tiers <= 3; tiers++) {
        for (const [name, p] of Object.entries(poses)) {
            frame(bank, `torta${tiers}_${name}`, 92, 116, 46, 114, (pc) => torta(pc, { tiers, ...p }));
        }
    }
}

function torta(pc, { tiers, step = 0, crouch = 0, candles = 1, mouth = 0, lean = 0 }) {
    const g = 113;
    const x = 46 + lean;
    // chicken legs, yellow mechanical
    const legs = step === 4 ? [[-10, 4], [8, 6]] : [[[-12, 0], [10, 0]], [[-8, 3], [12, 0]], [[-4, 0], [6, 0]], [[-10, 0], [14, 3]]][step];
    const hip = g - 22 + crouch;
    for (const [i, [fx, lift]] of legs.entries()) {
        const kx = x + fx * 0.4 + (i ? 6 : -6);
        const ky = hip + 9;
        const color = i ? C.yellow : C.yellowShade;
        pc.stroke(x + (i ? 6 : -6), hip, kx + 4, ky, 4, color);
        pc.stroke(kx + 4, ky, x + fx, g - 3 - lift, 3, color);
        // three clawed toes
        pc.line(x + fx, g - 2 - lift, x + fx + 5, g - 1 - lift, C.fireOrange);
        pc.line(x + fx, g - 2 - lift, x + fx - 3, g - 1 - lift, C.fireOrange);
        pc.line(x + fx, g - 2 - lift, x + fx + 2, g - lift, C.fireOrange);
        pc.circle(kx + 4, ky, 2, C.metalDark);
    }
    // tiers from the bottom
    let top = hip;
    const widths = [68, 54, 40];
    const bodies = [[C.pink, C.pinkShade], [C.woodDark, C.inkSoft], [C.apron, C.apronShade]];
    for (let t = 0; t < tiers; t++) {
        const w = widths[t];
        const y = top - 24;
        const [body, shade] = bodies[t];
        pc.rect(x - w / 2, y, w, 24, body);
        pc.rect(x - w / 2, y + 18, w, 6, shade);
        pc.rect(x - w / 2, y, 4, 24, shade);
        // frosting with drips
        pc.rect(x - w / 2 - 1, y, w + 2, 4, C.white);
        for (let k = 0; k < w; k += 6) {
            const len = 2 + Math.floor(hash2(k, t) * 5);
            pc.rect(x - w / 2 + k + 2, y + 4, 2, len, C.white);
        }
        // decorations
        if (t === 1) {
            for (let k = 0; k < 5; k++) {
                ball(pc, x - w / 2 + 6 + k * 10, y - 1, 2.6, C.clownRed, C.contRedShade, C.white);
                pc.px(x - w / 2 + 7 + k * 10, y - 4, C.leafDark);
            }
            for (let k = 0; k < w; k += 5) pc.px(x - w / 2 + k + 3, y + 12, PARTY[k % 5]);
        }
        if (t === 2) {
            for (let k = 0; k < w; k += 4) pc.px(x - w / 2 + k + 2, y + 10, PARTY[(k / 4) % 5]);
            pc.rect(x - 8, y + 9, 16, 5, C.gold);
            pc.rect(x - 7, y + 10, 14, 3, C.goldLight);
        }
        top = y;
    }
    // candles on the top tier
    const tw = widths[tiers - 1];
    for (let k = 0; k < 5; k++) {
        const cx = x - tw / 2 + 5 + k * ((tw - 10) / 4);
        pc.rect(cx - 1, top - 9, 3, 9, PARTY[k]);
        pc.px(cx, top - 6, C.white);
        const fl = candles === 2 ? 5 : 3;
        pc.ellipse(cx, top - 10 - fl / 2, 1.5 + (candles === 2 ? 1 : 0), fl / 2 + 1, C.fireOrange);
        pc.px(cx, top - 11, C.fireWhite);
    }
    // the face on the bottom tier
    const fy = hip - 16;
    pc.rect(x + 8, fy - 3, 8, 6, C.white);
    pc.rect(x + 22, fy - 3, 8, 6, C.white);
    pc.rect(x + 12, fy - 2, 3, 4, C.ink);
    pc.rect(x + 26, fy - 2, 3, 4, C.ink);
    pc.line(x + 6, fy - 6, x + 16, fy - 3, C.ink);
    pc.line(x + 32, fy - 6, x + 22, fy - 3, C.ink);
    const mh = [2, 3, 6, 6][mouth];
    pc.rect(x + 12, fy + 6, 18, mh, C.ink);
    if (mouth >= 2) {
        pc.rect(x + 14, fy + 7, 14, mh - 2, C.crimson);
        for (let k = 0; k < 4; k++) pc.rect(x + 13 + k * 4, fy + 6, 2, 2, C.white);
    }
    if (mouth === 3) pc.circle(x + 34, fy + 9, 4, C.white);
}

// ------------------------------------------------------------ GELATO VAN

function bakeGelato(bank) {
    const poses = {
        drive0: { wheel: 0 }, drive1: { wheel: 1 }, scoop: { cone: 1 }, jingle: { notes: true },
        spray: { spray: true }, rev: { wheel: 1, exhaust: true },
    };
    for (const [name, p] of Object.entries(poses)) frame(bank, `gelato_${name}`, 88, 64, 44, 62, (pc) => gelato(pc, p));
}

function gelato(pc, { wheel = 0, cone = 0, notes = false, spray = false, exhaust = false }) {
    const g = 61;
    // body
    pc.rect(6, g - 36, 74, 26, C.clownWhite);
    pc.rect(6, g - 14, 74, 4, C.metalDark);
    pc.rect(6, g - 36, 74, 3, C.cyan);
    pc.rect(6, g - 24, 74, 3, C.pink);
    // cab at the front (right)
    pc.poly([[62, g - 36], [74, g - 36], [82, g - 24], [82, g - 12], [62, g - 12]], C.clownWhite);
    pc.poly([[64, g - 34], [73, g - 34], [79, g - 25], [64, g - 25]], C.glass);
    pc.circle(70, g - 29, 3, C.skin);
    pc.rect(67, g - 33, 6, 2, C.helmet);
    pc.px(72, g - 29, C.ink);
    // armour plates and rivets
    for (let k = 0; k < 4; k++) {
        pc.rect(10 + k * 13, g - 21, 11, 6, C.metal);
        pc.px(11 + k * 13, g - 20, C.metalLight);
    }
    // serving hatch
    pc.rect(16, g - 33, 30, 8, C.windowDark);
    pc.rect(16, g - 33, 30, 2, C.yellow);
    for (let k = 0; k < 5; k++) pc.rect(18 + k * 6, g - 33, 3, 2, C.pink);
    // the cone on the roof: a launcher
    const tilt = cone ? -3 : 0;
    pc.poly([[34, g - 37], [42, g - 37], [38 + tilt, g - 48]], C.woodLight);
    pc.line(35, g - 40, 41, g - 40, C.wood);
    ball(pc, 38 + tilt, g - 51, 6, C.pink, C.pinkShade, C.white);
    for (const [dx, dy, c] of [[-3, -2, C.cyan], [2, -4, C.yellow], [1, 1, C.lime]]) pc.px(38 + tilt + dx, g - 51 + dy, c);
    // speaker horn
    pc.poly([[52, g - 40], [60, g - 44], [60, g - 36]], C.metalLight);
    pc.rect(50, g - 40, 3, 4, C.metalDark);
    if (notes) {
        pc.rect(63, g - 50, 2, 6, C.ink);
        pc.rect(63, g - 50, 4, 2, C.ink);
        pc.rect(70, g - 54, 2, 6, C.ink);
    }
    // sprinkle nozzle
    pc.rect(20, g - 42, 4, 6, C.metalDark);
    if (spray) pc.circle(22, g - 45, 3, C.yellow);
    // wheels
    for (const wx of [20, 66]) {
        pc.circle(wx, g - 6, 6, C.ink);
        pc.circle(wx, g - 6, 3, C.metal);
        pc.px(wx + (wheel ? 2 : -2), g - 6, C.metalLight);
    }
    if (exhaust) {
        pc.circle(3, g - 10, 3, C.smokeLight);
        pc.circle(1, g - 15, 2, C.smokeLight);
    }
}

// ------------------------------------------------------------ PINATA CHOPPER

function bakePinata(bank) {
    for (const cracked of [0, 1]) {
        for (let r = 0; r < 3; r++) {
            frame(bank, `pinata${cracked}_fly${r}`, 104, 70, 52, 56, (pc) => pinata(pc, { rotor: r, cracked }));
            frame(bank, `pinata${cracked}_gun${r}`, 104, 70, 52, 56, (pc) => pinata(pc, { rotor: r, cracked, gun: true }));
            frame(bank, `pinata${cracked}_hatch${r}`, 104, 70, 52, 56, (pc) => pinata(pc, { rotor: r, cracked, hatch: true }));
        }
    }
}

function pinata(pc, { rotor, cracked, gun = false, hatch = false }) {
    const cy = 36;
    // rotor
    const blades = [[8, 96], [24, 80], [40, 64]][rotor];
    pc.rect(blades[0], 3, blades[1] - blades[0], 2, C.metalLight);
    pc.rect(50, 4, 4, 8, C.metalDark);
    // tail boom with tail rotor and a paper tail
    pc.rect(4, cy - 6, 24, 4, C.pinkShade);
    pc.circle(5, cy - 8, 5, C.metalLight);
    pc.circle(5, cy - 8, 2, C.metalDark);
    for (let k = 0; k < 4; k++) pc.line(10 + k * 3, cy - 2, 8 + k * 3, cy + 6, PARTY[k]);
    // body: fringed paper stripes
    pc.ellipse(52, cy, 28, 15, C.pink);
    const stripes = [C.yellow, C.cyan, C.pink, C.orange, C.lime];
    for (let s = 0; s < 5; s++) {
        const y = cy - 12 + s * 5;
        for (let k = 26; k < 79; k += 2) {
            const inside = ((k - 52) / 28) ** 2 + ((y - cy) / 15) ** 2 < 1;
            if (inside && !(cracked && hash2(k, s) < 0.18)) pc.rect(k, y, 2, 3, stripes[s]);
        }
    }
    if (cracked) {
        pc.line(40, cy - 10, 48, cy, C.ink);
        pc.line(48, cy, 44, cy + 8, C.ink);
        pc.line(60, cy - 12, 64, cy - 2, C.ink);
        pc.rect(50, cy + 2, 4, 3, C.inkSoft);
    }
    // cockpit
    pc.ellipse(64, cy - 6, 8, 5, C.glass);
    pc.circle(64, cy - 6, 2.5, C.skin);
    pc.rect(61, cy - 10, 6, 2, C.helmet);
    // donkey head and ears at the front
    pc.ellipse(84, cy - 4, 9, 7, C.pink);
    pc.rect(86, cy - 2, 9, 7, C.yellow);
    pc.px(93, cy, C.ink);
    pc.poly([[78, cy - 9], [80, cy - 22], [84, cy - 10]], C.cyan);
    pc.poly([[84, cy - 9], [88, cy - 21], [90, cy - 9]], C.yellow);
    pc.circle(85, cy - 6, 2, C.white);
    pc.px(86, cy - 6, C.ink);
    // dangling legs and skids
    for (const lx of [38, 46, 58, 66]) pc.rect(lx, cy + 12, 3, 7, PARTY[lx % 5]);
    pc.rect(32, cy + 19, 40, 2, C.metalDark);
    // gun pod
    pc.rect(70, cy + 10, 10, 4, C.metalDark);
    pc.rect(80, cy + 11, 6, 2, C.metal);
    if (gun) pc.circle(88, cy + 12, 3, C.fireYellow);
    if (hatch) {
        pc.rect(44, cy + 10, 14, 6, C.ink);
        pc.rect(46, cy + 11, 10, 4, C.windowDark);
    }
}

// ------------------------------------------------------------ CAPITANO BAFFONE

function bakeBaffone(bank) {
    const poses = {
        idle: {}, walk0: { step: 0 }, walk1: { step: 1 }, walk2: { step: 2 }, walk3: { step: 3 },
        spin0: { spin: 0 }, spin1: { spin: 1 }, gatling0: { spin: 0, fire: true }, gatling1: { spin: 1, fire: true },
        crouch: { crouch: 6 }, jump: { step: 4 }, land: { crouch: 8 }, throw: { throw: true },
    };
    for (const [name, p] of Object.entries(poses)) frame(bank, `baffone_${name}`, 64, 72, 30, 70, (pc) => baffone(pc, p));
}

function baffone(pc, { step = -1, spin = 0, fire = false, crouch = 0, throw: throwing = false }) {
    const g = 69;
    const x = 30;
    const hip = g - 20 + crouch;
    const legs = step === 4 ? [[-5, 5], [6, 3]] : step < 0 ? [[-5, 0], [5, 0]] : [[[-7, 0], [7, 0]], [[-3, 2], [4, 0]], [[6, 0], [-6, 0]], [[3, 0], [-2, 2]]][step];
    for (const [i, [fx, lift]] of legs.entries()) {
        pc.stroke(x + (i ? 3 : -3), hip, x + fx, g - 4 - lift, 6, i ? C.crimsonShade : C.inkSoft);
        pc.rect(x + fx - 4, g - 4 - lift, 9, 4, C.black);
        pc.rect(x + fx - 4, g - 4 - lift, 9, 1, C.metalDark);
    }
    const sh = hip - 22;
    // coat and breastplate
    pc.poly([[x - 11, sh], [x + 11, sh], [x + 13, hip + 2], [x - 12, hip + 2]], C.crimson);
    pc.rect(x - 12, sh, 4, hip - sh + 2, C.crimsonShade);
    pc.poly([[x - 8, sh + 2], [x + 10, sh + 2], [x + 10, hip - 6], [x + 1, hip - 2], [x - 8, hip - 6]], C.gold);
    pc.line(x - 7, sh + 3, x + 9, sh + 3, C.goldLight);
    for (let k = 0; k < 3; k++) pc.circle(x + 1, sh + 7 + k * 5, 1.2, C.goldShade);
    // ammo belt
    pc.stroke(x - 10, sh + 1, x + 10, hip - 1, 3, C.woodDark);
    for (let k = 0; k < 6; k++) pc.px(x - 9 + k * 4, sh + 2 + k * 3, C.brass);
    // epaulettes
    pc.rect(x - 14, sh - 1, 7, 3, C.gold);
    pc.rect(x + 7, sh - 1, 7, 3, C.gold);
    for (let k = 0; k < 7; k += 2) {
        pc.px(x - 14 + k, sh + 2, C.goldShade);
        pc.px(x + 7 + k, sh + 2, C.goldShade);
    }
    // head and the moustache
    const hy = sh - 2;
    pc.rect(x - 5, hy - 10, 12, 11, C.skin);
    pc.rect(x - 5, hy - 2, 3, 3, C.skinShade);
    pc.px(x + 4, hy - 6, C.ink);
    pc.line(x + 2, hy - 8, x + 6, hy - 7, C.ink);
    pc.rect(x + 6, hy - 6, 3, 3, C.skin);
    pc.poly([[x - 2, hy - 3], [x + 9, hy - 4], [x + 18, hy - 8], [x + 17, hy - 3], [x + 9, hy - 1], [x - 1, hy - 1]], C.ink);
    pc.poly([[x - 2, hy - 3], [x - 8, hy - 7], [x - 7, hy - 2]], C.ink);
    pc.px(x + 15, hy - 6, C.inkSoft);
    // the tall busby with a plume
    pc.rect(x - 6, hy - 26, 14, 17, C.black);
    pc.rect(x - 6, hy - 26, 3, 17, C.inkSoft);
    pc.rect(x - 7, hy - 11, 16, 2, C.gold);
    pc.stroke(x - 6, hy - 22, x - 9, hy - 31, 3, C.white);
    pc.stroke(x - 9, hy - 31, x - 5, hy - 33, 2, C.crimsonLight);
    // arms and the gatling
    if (throwing) {
        pc.stroke(x + 8, sh + 2, x + 10, sh - 12, 4, C.crimson);
        ball(pc, x + 10, sh - 15, 3, C.lime, C.leafDark, C.white);
    }
    const gy = hip - 6;
    pc.stroke(x + 6, sh + 3, x + 10, gy, 4, C.crimson);
    pc.rect(x + 2, gy - 4, 12, 9, C.metalDark);
    pc.rect(x + 3, gy - 3, 10, 2, C.metal);
    for (let k = 0; k < 3; k++) {
        const off = (k + spin) % 3;
        pc.rect(x + 14, gy - 3 + off * 3, 16, 2, off === 0 ? C.metalLight : C.metal);
    }
    pc.rect(x + 28, gy - 4, 3, 9, C.metalDark);
    if (fire) {
        pc.circle(x + 34, gy, 4, C.fireYellow);
        pc.circle(x + 34, gy, 2, C.fireWhite);
    }
    pc.rect(x + 9, gy - 1, 3, 3, C.skin);
}

// ------------------------------------------------------------ THE SUPREMO

function bakeThrone(bank) {
    const poses = {
        idle: {}, walk0: { step: 0 }, walk1: { step: 1 }, walk2: { step: 2 }, walk3: { step: 3 },
        cannons: { cannon: true }, door: { door: true }, crouch: { crouch: 8 }, jump: { step: 4 }, land: { crouch: 10 },
        chargeLaser: { core: 1 }, laser: { core: 2 }, missiles: { pods: true },
    };
    for (const [name, p] of Object.entries(poses)) frame(bank, `throne_${name}`, 100, 124, 50, 122, (pc) => throne(pc, p));
    for (let i = 0; i < 2; i++) {
        frame(bank, `supremo_jet${i}`, 52, 74, 26, 58, (pc) => jet(pc, i, false));
        frame(bank, `supremo_jetCharge${i}`, 52, 74, 26, 58, (pc) => jet(pc, i, true));
    }
}

function supremo(pc, x, y, { shout = false } = {}) {
    // the birthday boy: bald, huge moustache, tiny sunglasses, medals
    pc.poly([[x - 10, y], [x + 10, y], [x + 12, y + 20], [x - 12, y + 20]], C.uni);
    pc.stroke(x - 8, y + 1, x + 9, y + 18, 3, C.crimson);
    for (let k = 0; k < 4; k++) {
        pc.rect(x + 2 + (k % 2) * 4, y + 4 + Math.floor(k / 2) * 4, 3, 3, PARTY[k]);
        pc.px(x + 3 + (k % 2) * 4, y + 3 + Math.floor(k / 2) * 4, C.gold);
    }
    pc.rect(x - 12, y - 1, 6, 3, C.gold);
    pc.rect(x + 7, y - 1, 6, 3, C.gold);
    pc.ellipse(x + 1, y - 9, 9, 9, C.skin);
    pc.ellipse(x - 2, y - 13, 4, 2, C.white);
    pc.rect(x - 1, y - 11, 10, 3, C.ink);
    pc.px(x + 1, y - 11, C.metalLight);
    pc.rect(x + 8, y - 8, 3, 3, C.skinShade);
    pc.poly([[x - 6, y - 5], [x + 4, y - 7], [x + 14, y - 10], [x + 13, y - 4], [x + 4, y - 3], [x - 5, y - 3]], C.inkSoft);
    if (shout) pc.rect(x + 2, y - 3, 6, 3, C.crimsonShade);
    // a tiny gold crown, it's his day
    pc.poly([[x - 5, y - 17], [x + 7, y - 17], [x + 7, y - 22], [x + 4, y - 19], [x + 1, y - 23], [x - 2, y - 19], [x - 5, y - 22]], C.gold);
}

function throne(pc, { step = -1, cannon = false, door = false, crouch = 0, core = 0, pods = false }) {
    const g = 121;
    const x = 50;
    const hip = g - 30 + crouch;
    // robot legs
    const legs = step === 4 ? [[-14, 6], [12, 4]] : step < 0 ? [[-14, 0], [14, 0]] : [[[-18, 0], [12, 0]], [[-12, 3], [16, 0]], [[-10, 0], [18, 0]], [[-16, 0], [10, 3]]][step];
    for (const [i, [fx, lift]] of legs.entries()) {
        const kx = x + (i ? 10 : -10);
        pc.stroke(kx, hip, kx + fx * 0.3, hip + 14, 7, i ? C.goldShade : C.metalDark);
        pc.stroke(kx + fx * 0.3, hip + 14, x + fx, g - 5 - lift, 6, i ? C.gold : C.metal);
        pc.circle(kx + fx * 0.3, hip + 14, 4, C.metalDark);
        pc.rect(x + fx - 8, g - 5 - lift, 16, 5, C.metalDark);
        pc.rect(x + fx - 8, g - 5 - lift, 16, 1, C.metal);
    }
    // the throne: gold base, crimson cushion, tall back
    const seat = hip - 22;
    pc.rect(x - 28, seat, 56, 24, C.gold);
    pc.rect(x - 28, seat + 18, 56, 6, C.goldShade);
    pc.rect(x - 28, seat, 56, 2, C.goldLight);
    // the chest: door for clowns, laser core
    pc.rect(x - 10, seat + 4, 20, 16, door ? C.ink : C.goldShade);
    if (door) {
        pc.rect(x - 8, seat + 6, 16, 14, C.windowDark);
        pc.circle(x, seat + 12, 3, C.clownWhite);
        pc.px(x + 1, seat + 12, C.clownRed);
    } else {
        pc.circle(x, seat + 12, 6, C.metalDark);
        pc.circle(x, seat + 12, 4, core === 2 ? C.white : core === 1 ? C.enemyShot : C.crimsonShade);
        if (core === 2) pc.circle(x, seat + 12, 2, C.enemyShotCore);
    }
    // back of the throne behind him, with a gold sunburst
    pc.rect(x - 30, seat - 52, 10, 54, C.gold);
    pc.rect(x - 30, seat - 52, 3, 54, C.goldShade);
    pc.circle(x - 25, seat - 54, 6, C.gold);
    pc.circle(x - 25, seat - 54, 3, C.crimson);
    pc.rect(x - 22, seat - 44, 8, 40, C.crimson);
    pc.rect(x - 24, seat - 4, 52, 6, C.crimson);
    pc.rect(x - 24, seat - 4, 52, 2, C.crimsonLight);
    // armrests with cannons
    for (const ax of [x - 34, x + 22]) {
        pc.rect(ax, seat - 12, 12, 10, C.goldShade);
        pc.rect(ax, seat - 12, 12, 2, C.gold);
        pc.rect(ax + 8, seat - 18, 6, 6, C.metalDark);
        pc.rect(ax + 12, seat - 17, 6, 4, C.metal);
        if (cannon) pc.circle(ax + 20, seat - 15, 3, C.fireYellow);
    }
    if (pods) {
        pc.rect(x - 34, seat - 62, 12, 8, C.metalDark);
        for (let k = 0; k < 3; k++) pc.rect(x - 33 + k * 4, seat - 61, 2, 6, C.crimson);
    }
    supremo(pc, x + 2, seat - 24, { shout: cannon || door });
}

function jet(pc, i, charge) {
    const x = 26;
    const y = 50;
    // small flying throne
    pc.rect(x - 14, y - 2, 28, 10, C.gold);
    pc.rect(x - 14, y + 6, 28, 2, C.goldShade);
    pc.rect(x - 16, y - 22, 6, 22, C.gold);
    pc.rect(x - 12, y - 6, 26, 4, C.crimson);
    // rockets
    for (const rx of [x - 10, x + 6]) {
        pc.rect(rx, y + 8, 6, 5, C.metalDark);
        pc.ellipse(rx + 3, y + 16 + i, 2.5, 3 + i, C.fireOrange);
        pc.ellipse(rx + 3, y + 15, 1.5, 2, C.fireYellow);
    }
    supremo(pc, x + 2, y - 26, { shout: true });
    // shaking fist
    pc.stroke(x + 12, y - 22, x + 18, y - 30, 3, C.uni);
    pc.rect(x + 17, y - 34, 4, 4, C.skin);
    if (charge) pc.circle(x, y + 4, 4, C.enemyShot);
}
