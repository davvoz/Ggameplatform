import { C } from '../../config/Palette.js';
import { KEYS, frame, paintCells, paintMap, rotateMap } from './ArtKit.js';

/**
 * NONNA: black widow's dress, white apron, a bandolier across it, round
 * glasses, a silver bun under a red commando bandana whose tails flap when she
 * runs. Stocky, low, furious.
 *
 * Like the arcade classics she is drawn in two halves: legs (run cycle, jump,
 * crouch) and upper body (aim, recoil, slipper, throw) for each weapon. The
 * renderer stacks them, so every aim works with every leg pose.
 *
 *  lower frames: 32x24, anchor (16, 22) = feet
 *  upper frames: 48x48, anchor (20, 32) = hip, 12 px above the feet
 */

export const HIP = 12;
export const HIP_CROUCH = 3;
export const RUN_FRAMES = 8;
/** vertical bob of the upper body for each run frame */
export const RUN_BOB = [0, -1, -1, 0, 0, -1, -1, 0];

const LW = 32;
const LH = 24;
const LAX = 16;
const LAY = 22;
const UW = 48;
const UH = 48;
const UAX = 20;
const UAY = 32;

/** Guns, drawn pointing right. The pivot is where the front hand holds it. */
export const GUNS = {
    pistol: {
        pivot: [2, 2],
        rows: [
            '...lllllll.',
            '..mmmmmmmmd',
            '..dmbbd....',
            '..ww.......',
            '..wW.......',
        ],
    },
    heavy: {
        pivot: [5, 2],
        rows: [
            '.....llllllllllll..',
            '..dddmmmmmmmmmmmmmd',
            'wwdmmmmmddddddd.d..',
            'wWWmmm.bbb.........',
            '.......bbbb........',
            '........bb.........',
        ],
    },
    shotgun: {
        pivot: [5, 2],
        rows: [
            '......lllllllllll',
            'vvwwwwmmmmmmmmmmd',
            'wwwwWWdddddddddd.',
            'WW..ww...........',
            '.....W...........',
        ],
    },
    fireworks: {
        pivot: [5, 3],
        rows: [
            '..........yyy.',
            '.pppppppppppppy',
            'pPcccccccccccPy',
            'pPyyyyyyyyyyyPy',
            '.ppPPpppppPPpp.',
            '...ww..........',
            '...wW..........',
        ],
    },
    flamer: {
        pivot: [5, 2],
        rows: [
            '.............f.',
            '..ddmmmmmmmxxof',
            'bbbdmmmmmmmxxx.',
            'bbbW.d.....xx..',
            '.bb.........x..',
        ],
    },
};

const AIMS = {
    up: -Math.PI / 2,
    upDiag: -Math.PI / 4,
    fwd: 0,
    downDiag: Math.PI / 4,
    down: Math.PI / 2,
};

/** Where the front hand holds the gun for each aim, relative to the hip. */
const GRIP = {
    up: [6, -12],
    upDiag: [6, -10],
    fwd: [5, -6],
    downDiag: [6, -3],
    down: [2, -1],
};

/** @param {import('../SpriteBank.js').SpriteBank} bank */
export function bakeNonna(bank) {
    bakeLower(bank);
    for (const weapon of Object.keys(GUNS)) {
        for (const aim of Object.keys(AIMS)) {
            for (const recoil of [0, 1]) {
                frame(bank, `nonna_up_${weapon}_${aim}_${recoil}`, UW, UH, UAX, UAY,
                    (pc) => upper(pc, { weapon, aim, recoil, flap: recoil }));
            }
        }
        frame(bank, `nonna_up_${weapon}_fwd_run`, UW, UH, UAX, UAY, (pc) => upper(pc, { weapon, aim: 'fwd', recoil: 0, flap: 2 }));
    }
    for (let i = 0; i < 3; i++) frame(bank, `nonna_up_melee${i}`, UW, UH, UAX, UAY, (pc) => melee(pc, i));
    for (let i = 0; i < 2; i++) frame(bank, `nonna_up_throw${i}`, UW, UH, UAX, UAY, (pc) => throwing(pc, i));
    frame(bank, 'nonna_victory', UW, UH, UAX, UAY, (pc) => victory(pc));
    frame(bank, 'nonna_umbrella', 40, 24, 20, 23, (pc) => umbrella(pc));
    for (let i = 0; i < 2; i++) frame(bank, `nonna_dead${i}`, 48, 32, 24, 30, (pc) => dead(pc, i));
}

// ---------------------------------------------------------------- legs

function bakeLower(bank) {
    frame(bank, 'nonna_lo_stand', LW, LH, LAX, LAY, (pc) => {
        skirt(pc, 0, 0);
        leg(pc, -3, 0, 0);
        leg(pc, 2, 0, 0, true);
    });
    for (let i = 0; i < RUN_FRAMES; i++) {
        const a = (i / RUN_FRAMES) * Math.PI * 2;
        frame(bank, `nonna_lo_run${i}`, LW, LH, LAX, LAY, (pc) => {
            const sway = Math.round(Math.sin(a * 2) * 0.8);
            // back leg first, front leg over it
            const ax = Math.round(Math.cos(a) * 5);
            const al = Math.round(Math.max(0, Math.sin(a)) * 3);
            const bx = Math.round(Math.cos(a + Math.PI) * 5);
            const bl = Math.round(Math.max(0, Math.sin(a + Math.PI)) * 3);
            leg(pc, bx - 1, bl, 0, false, true);
            skirt(pc, sway, RUN_BOB[i]);
            leg(pc, ax, al, 0, true);
        });
    }
    frame(bank, 'nonna_lo_jump', LW, LH, LAX, LAY, (pc) => {
        leg(pc, -4, 4, 0, false, true);
        skirt(pc, -1, -2, true);
        leg(pc, 3, 5, 0, true);
    });
    frame(bank, 'nonna_lo_fall', LW, LH, LAX, LAY, (pc) => {
        leg(pc, -3, 0, 0, false, true);
        skirt(pc, 1, 0, true);
        leg(pc, 3, 1, 0, true);
    });
    for (let i = 0; i < 4; i++) {
        frame(bank, `nonna_lo_crouch${i}`, LW, LH, LAX, LAY, (pc) => crouchLegs(pc, i));
    }
}

/** The skirt, from the hip down to the knees, with the apron in front. */
function skirt(pc, sway, lift, flared = false) {
    const top = LAY - HIP + lift;
    const hem = LAY - 6 + lift - (flared ? 1 : 0);
    const flare = flared ? 2 : 1;
    pc.poly([[LAX - 6, top], [LAX + 6, top], [LAX + 6 + flare + sway, hem], [LAX - 6 - flare + sway, hem]], C.dress);
    pc.rect(LAX - 6 + sway - flare, hem - 1, 3, 1, C.dressShade);
    pc.line(LAX - 3, top + 1, LAX - 3 + sway - 1, hem - 1, C.dressShade);
    pc.line(LAX + 1, top + 2, LAX + 1 + sway, hem - 1, C.dressShade);
    // apron
    pc.poly([[LAX + 1, top], [LAX + 6, top], [LAX + 6 + sway, hem - 1], [LAX + 1 + sway, hem - 1]], C.apron);
    pc.line(LAX + 2 + sway, hem - 2, LAX + 5 + sway, hem - 2, C.apronShade);
    pc.px(LAX + 3, top + 2, C.apronShade);
}

/** One leg: stocking and boot. x is the foot offset, lift raises the foot. */
function leg(pc, x, lift, _unused, front = false, back = false) {
    const footY = LAY - 1 - lift;
    const kneeY = LAY - 6;
    const hipX = LAX + (front ? 1 : -2);
    const fx = LAX + x;
    pc.stroke(hipX, kneeY, fx, footY - 2, 2, back ? C.skinShade : C.stocking);
    pc.rect(fx - 1, footY - 1, 4, 2, back ? C.bootShade : C.boot);
    pc.px(fx + 2, footY, back ? C.bootShade : C.boot);
    pc.px(fx - 1, footY - 1, C.bootShade);
}

function crouchLegs(pc, i) {
    const shuffle = [0, 1, 0, -1][i];
    const top = LAY - HIP_CROUCH - 5;
    // thighs forward, boots under
    pc.rect(LAX - 5, LAY - 4, 4, 2, C.boot);
    pc.rect(LAX + 3 + shuffle, LAY - 3, 5, 2, C.boot);
    pc.px(LAX + 7 + shuffle, LAY - 2, C.bootShade);
    pc.rect(LAX - 5, LAY - 2, 4, 1, C.bootShade);
    pc.poly([[LAX - 7, top], [LAX + 5, top], [LAX + 9 + shuffle, LAY - 3], [LAX - 7, LAY - 2]], C.dress);
    pc.poly([[LAX + 1, top], [LAX + 5, top], [LAX + 9 + shuffle, LAY - 4], [LAX + 3, LAY - 4]], C.apron);
    pc.line(LAX - 5, top + 2, LAX - 4, LAY - 3, C.dressShade);
    pc.line(LAX + 4, LAY - 5, LAX + 8 + shuffle, LAY - 5, C.apronShade);
}

// ---------------------------------------------------------------- upper body

/**
 * Torso and head. `flap` animates the bandana tails (0 still, 1-2 flying).
 */
function torsoAndHead(pc, { flap = 0, lean = 0, face = 'angry' } = {}) {
    const x = UAX + lean;
    const y = UAY;
    // bandana tails behind the head
    const tail = [[-7, -17, -10, -15], [-7, -18, -12, -18], [-7, -17, -12, -20]][flap];
    pc.stroke(x - 5, y - 18, x + tail[0], y + tail[1], 2, C.bandana);
    pc.stroke(x + tail[0], y + tail[1], x + tail[2], y + tail[3], 2, C.bandanaShade);
    pc.stroke(x - 5, y - 17, x + tail[0] + 1, y + tail[1] + 3, 1, C.bandanaShade);

    // torso: black dress
    pc.poly([[x - 5, y - 11], [x + 5, y - 11], [x + 6, y], [x - 6, y]], C.dress);
    pc.rect(x - 6, y - 4, 2, 4, C.dressShade);
    pc.line(x - 5, y - 10, x - 5, y - 1, C.dressShade);
    pc.rect(x + 1, y - 11, 3, 1, C.dressLight);
    // apron bib and body
    pc.rect(x + 1, y - 9, 4, 3, C.apron);
    pc.rect(x + 1, y - 6, 5, 6, C.apron);
    pc.px(x + 1, y - 9, C.apronShade);
    pc.line(x + 1, y - 2, x + 5, y - 2, C.apronShade);
    // bandolier: shoulder to hip, brass rounds
    pc.stroke(x - 4, y - 11, x + 4, y - 1, 2, C.strap);
    for (let i = 0; i < 4; i++) {
        const t = (i + 0.5) / 4;
        pc.px(Math.round(x - 4 + 8 * t), Math.round(y - 11 + 10 * t) - 1, C.brass);
    }
    pc.line(x - 3, y - 9, x + 3, y - 1, C.strapShade);

    // neck and head
    pc.rect(x - 1, y - 13, 4, 2, C.skinShade);
    pc.poly([[x - 2, y - 20], [x + 4, y - 20], [x + 5, y - 18], [x + 5, y - 13], [x + 3, y - 11], [x - 1, y - 11], [x - 3, y - 13], [x - 3, y - 18]], C.skin);
    // white hair: a curl at the back, a fringe on top, the bun
    pc.poly([[x - 5, y - 19], [x - 2, y - 19], [x - 2, y - 14], [x - 4, y - 13], [x - 5, y - 15]], C.hair);
    pc.rect(x - 3, y - 22, 7, 2, C.hair);
    pc.px(x - 4, y - 14, C.hairShade);
    pc.px(x - 5, y - 16, C.hairShade);
    pc.px(x - 2, y - 16, C.skinShade);
    pc.circle(x - 4, y - 23, 2.4, C.hair);
    pc.px(x - 5, y - 22, C.hairShade);
    pc.px(x - 3, y - 24, C.white);
    pc.line(x - 6, y - 24, x - 2, y - 22, C.gold);
    // bandana band
    pc.rect(x - 5, y - 20, 11, 2, C.bandana);
    pc.line(x - 5, y - 19, x + 5, y - 19, C.bandanaShade);
    pc.rect(x - 7, y - 20, 2, 3, C.bandanaShade);
    // face
    pc.px(x + 6, y - 16, C.skin);
    pc.px(x + 6, y - 15, C.skin);
    pc.px(x + 6, y - 14, C.skinShade);
    pc.px(x + 5, y - 13, C.skinShade);
    pc.px(x - 1, y - 15, C.skinShade);
    pc.px(x - 1, y - 14, C.skinShade);
    // glasses, round, both lenses in three quarters
    pc.rect(x, y - 17, 2, 2, C.glass);
    pc.rect(x + 3, y - 17, 2, 2, C.glass);
    pc.px(x + 2, y - 17, C.ink);
    pc.px(x + 1, y - 16, C.ink);
    pc.px(x + 4, y - 16, C.ink);
    if (face === 'angry') {
        pc.line(x, y - 18, x + 1, y - 18, C.ink);
        pc.line(x + 3, y - 18, x + 4, y - 18, C.ink);
    }
    // mouth
    if (face === 'shout') {
        pc.rect(x + 2, y - 14, 3, 2, C.ink);
        pc.px(x + 3, y - 14, C.bandana);
    } else {
        pc.line(x + 2, y - 13, x + 4, y - 13, C.skinDark);
        pc.px(x + 1, y - 12, C.skinDark);
    }
    pc.px(x, y - 14, C.skinShade);
}

/** Arms and gun for an aim. */
function upper(pc, { weapon, aim, recoil, flap }) {
    const back = recoil ? -1 : 0;
    torsoAndHead(pc, { flap, lean: back });
    const [gx, gy] = GRIP[aim];
    const hx = UAX + gx + back;
    const hy = UAY + gy;
    // back arm (sleeve) reaching under the gun
    pc.stroke(UAX - 2 + back, UAY - 10, hx - 3, hy + 1, 2, C.dressShade);
    pc.rect(hx - 4, hy, 2, 2, C.skinShade);
    // gun
    const gun = GUNS[weapon];
    const cells = rotateMap(gun.rows, gun.pivot[0], gun.pivot[1], AIMS[aim]);
    paintCells(pc, cells, hx, hy, KEYS);
    // front arm over it
    pc.stroke(UAX + 1 + back, UAY - 10, hx - 1, hy, 2, C.dress);
    pc.rect(hx - 1, hy - 1, 2, 2, C.skin);
    pc.px(hx, hy - 1, C.skinShade);
}

/** The slipper: wind up, smack, follow through. */
function melee(pc, i) {
    torsoAndHead(pc, { flap: 1, lean: i === 1 ? 1 : 0, face: 'shout' });
    const x = UAX;
    const y = UAY;
    // gun lowered in the back hand
    pc.rect(x - 7, y - 4, 7, 2, C.metal);
    pc.rect(x - 4, y - 3, 2, 3, C.wood);
    const poses = [
        { elbow: [x - 1, y - 18], hand: [x - 4, y - 24] },
        { elbow: [x + 6, y - 12], hand: [x + 13, y - 9] },
        { elbow: [x + 5, y - 7], hand: [x + 9, y - 2] },
    ];
    const { elbow, hand } = poses[i];
    pc.stroke(x + 1, y - 10, elbow[0], elbow[1], 2, C.dress);
    pc.stroke(elbow[0], elbow[1], hand[0], hand[1], 2, C.dress);
    pc.rect(hand[0] - 1, hand[1] - 1, 2, 2, C.skin);
    // the slipper: a fluffy pink ciabatta
    const sx = hand[0] + (i === 0 ? -2 : 1);
    const sy = hand[1] + (i === 0 ? -4 : -2);
    pc.rect(sx, sy, i === 0 ? 3 : 7, i === 0 ? 7 : 3, C.pink);
    pc.rect(sx + (i === 0 ? 0 : 1), sy + (i === 0 ? 1 : 0), i === 0 ? 3 : 4, i === 0 ? 3 : 2, C.white);
    if (i === 1) {
        // motion lines
        pc.line(x + 8, y - 22, x + 14, y - 16, C.white);
        pc.line(x + 12, y - 22, x + 17, y - 15, C.white);
    }
}

/** Lobbing a meatball. */
function throwing(pc, i) {
    torsoAndHead(pc, { flap: 1, face: 'shout' });
    const x = UAX;
    const y = UAY;
    pc.rect(x + 2, y - 6, 9, 2, C.metal);
    const hand = i === 0 ? [x - 5, y - 21] : [x + 9, y - 19];
    pc.stroke(x - 1, y - 10, hand[0], hand[1], 2, C.dress);
    pc.rect(hand[0] - 1, hand[1] - 1, 2, 2, C.skin);
    if (i === 0) {
        pc.circle(hand[0], hand[1] - 2, 2.2, C.woodDark);
        pc.px(hand[0] - 1, hand[1] - 3, C.woodLight);
    }
}

function victory(pc) {
    torsoAndHead(pc, { flap: 2, face: 'shout' });
    const x = UAX;
    const y = UAY;
    pc.stroke(x + 1, y - 10, x + 5, y - 20, 2, C.dress);
    pc.rect(x + 4, y - 23, 3, 3, C.skin);
    paintMap(pc, GUNS.pistol.rows, x - 9, y - 6, KEYS);
}

/** Her black umbrella, for floating back down. */
function umbrella(pc) {
    pc.ellipse(20, 11, 17, 9, C.dress);
    pc.clear(0, 12, 40, 12);
    pc.rect(3, 11, 34, 1, C.dressShade);
    for (let i = 0; i < 5; i++) {
        const sx = 4 + i * 8;
        pc.ellipse(sx, 12, 4, 1.5, C.dressShade);
        pc.px(sx, 13, C.apron);
    }
    pc.line(20, 3, 20, 23, C.woodDark);
    pc.rect(19, 1, 3, 2, C.gold);
    pc.line(9, 5, 14, 3, C.dressLight);
}

function dead(pc, i) {
    if (i === 0) {
        // thrown back, arms up, glasses flying
        pc.poly([[14, 12], [28, 12], [32, 26], [12, 26]], C.dress);
        pc.rect(20, 14, 6, 10, C.apron);
        pc.stroke(16, 14, 9, 6, 2, C.dress);
        pc.stroke(27, 14, 33, 6, 2, C.dress);
        pc.circle(22, 7, 5, C.skin);
        pc.rect(17, 2, 10, 3, C.hair);
        pc.rect(17, 4, 11, 2, C.bandana);
        pc.rect(19, 7, 2, 1, C.ink);
        pc.rect(24, 7, 2, 1, C.ink);
        pc.rect(21, 10, 3, 2, C.ink);
        pc.stroke(14, 26, 10, 29, 2, C.stocking);
        pc.stroke(28, 26, 34, 28, 2, C.stocking);
        pc.rect(36, 2, 2, 2, C.glass);
        pc.rect(39, 2, 2, 2, C.glass);
    } else {
        // flat on her back, boots up
        pc.rect(10, 22, 22, 6, C.dress);
        pc.rect(16, 21, 10, 5, C.apron);
        pc.circle(7, 24, 4.5, C.skin);
        pc.rect(3, 20, 3, 8, C.hair);
        pc.rect(5, 19, 2, 10, C.bandana);
        pc.rect(7, 23, 2, 1, C.ink);
        pc.rect(7, 25, 2, 1, C.ink);
        pc.stroke(31, 24, 37, 16, 2, C.stocking);
        pc.stroke(31, 26, 40, 20, 2, C.stocking);
        pc.rect(36, 13, 3, 4, C.boot);
        pc.rect(39, 17, 3, 4, C.boot);
        pc.rect(16, 28, 3, 1, C.metal);
    }
}
