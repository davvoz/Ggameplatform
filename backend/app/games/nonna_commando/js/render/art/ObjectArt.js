import { C, PARTY } from '../../config/Palette.js';
import { ball, frame, paintMap } from './ArtKit.js';

/**
 * Everything that is not a person or a boss: drones and gulls, gun nests,
 * mortars, balloons, the grandkids, breakable props, pickups and every shot.
 */
export function bakeObjects(bank) {
    bakeDrone(bank);
    bakeGull(bank);
    bakeMortar(bank);
    bakeTurret(bank);
    bakeBalloons(bank);
    bakeHostages(bank);
    bakeProps(bank);
    bakePickups(bank);
    bakeShots(bank);
}

// ------------------------------------------------------------ flyers

function bakeDrone(bank) {
    for (let i = 0; i < 4; i++) {
        const state = i < 2 ? 'hover' : i === 2 ? 'lock' : 'dive';
        frame(bank, `drone_${i}`, 30, 18, 15, 16, (pc) => {
            // rotor blur alternates
            const blur = i % 2 === 0 ? [[3, 12], [18, 27]] : [[5, 10], [20, 25]];
            for (const [a, b] of blur) pc.rect(a, 2, b - a, 1, C.metalLight);
            pc.rect(7, 3, 2, 3, C.metalDark);
            pc.rect(21, 3, 2, 3, C.metalDark);
            pc.rect(6, 5, 18, 2, C.metal);
            pc.poly([[9, 7], [21, 7], [23, 12], [7, 12]], C.metal);
            pc.rect(9, 7, 12, 1, C.metalLight);
            // gift bow on top
            pc.rect(13, 5, 4, 2, C.pink);
            pc.px(12, 4, C.pink);
            pc.px(17, 4, C.pink);
            // camera eye
            pc.circle(15, 12, 2.5, C.metalDark);
            pc.circle(15, 12, 1.4, state === 'hover' ? C.cyan : C.enemyShot);
            if (state !== 'hover') pc.px(15, 12, C.white);
            pc.rect(9, 13, 2, 2, C.metalDark);
            pc.rect(19, 13, 2, 2, C.metalDark);
        });
    }
}

function bakeGull(bank) {
    const wings = [-5, -1, 3, -1];
    for (let i = 0; i < 4; i++) {
        frame(bank, `gull_${i}`, 26, 20, 13, 15, (pc) => gull(pc, wings[i], false));
    }
    frame(bank, 'gull_swoop', 26, 20, 13, 15, (pc) => gull(pc, -4, true));
}

function gull(pc, wing, swoop) {
    // facing left: they fly in from the right
    pc.ellipse(13, 11, 7, 3, C.white);
    pc.rect(14, 12, 6, 2, C.smokeLight);
    pc.poly([[18, 10], [24, 8], [23, 12]], C.smokeLight);
    pc.circle(7, 9, 3, C.white);
    pc.poly([[4, 9], [0, 10], [4, 11]], C.yellow);
    pc.px(1, 10, C.fireRed);
    // helmet and goggles
    pc.rect(5, 5, 5, 2, C.helmet);
    pc.px(4, 6, C.helmetShade);
    pc.rect(5, 8, 3, 2, C.ink);
    pc.px(6, 8, C.glass);
    // wing
    pc.poly([[10, 10], [18, 10], [14 + (swoop ? 4 : 0), 10 + wing - (swoop ? 0 : 1)], [11, 10 + wing]], C.smokeLight);
    pc.line(11, 10 + wing, 15, 10 + wing, C.white);
    if (!swoop) pc.rect(11, 14, 3, 2, C.yellowShade);
}

// ------------------------------------------------------------ emplacements

function sandbags(pc, x, y, w) {
    for (let i = 0; i < w; i += 7) {
        pc.ellipse(x + i + 3, y + 6, 4, 2.5, C.stone);
        pc.line(x + i + 1, y + 7, x + i + 5, y + 7, C.stoneShade);
    }
    for (let i = 3; i < w - 3; i += 7) {
        pc.ellipse(x + i + 3, y + 2, 4, 2.5, C.stone);
        pc.line(x + i + 1, y + 3, x + i + 5, y + 3, C.stoneShade);
    }
}

function bakeMortar(bank) {
    for (const [name, tube, crouch] of [['idle', -0.6, 0], ['load', -0.7, 1], ['recoil', -0.5, 0]]) {
        frame(bank, `mortar_${name}`, 40, 36, 20, 34, (pc) => {
            // the soldier behind
            pc.rect(18, 12 + crouch, 9, 9, C.uni);
            pc.circle(24, 9 + crouch, 3.5, C.skin);
            pc.poly([[20, 7 + crouch], [27, 7 + crouch], [24, -1 + crouch]], C.cyan);
            pc.circle(24, -1 + crouch, 1, C.yellow);
            pc.rect(20, 6 + crouch, 8, 2, C.helmet);
            pc.px(22, 9 + crouch, C.ink);
            pc.rect(21, 11 + crouch, 5, 1, C.inkSoft);
            // tube
            const len = 14;
            const ex = 14 + Math.cos(Math.PI + tube) * len * -0.5;
            pc.stroke(13, 22, Math.round(ex - 8), Math.round(22 + Math.sin(tube) * len), 4, C.metalDark);
            pc.stroke(13, 21, Math.round(ex - 8), Math.round(21 + Math.sin(tube) * len), 2, C.metal);
            if (name === 'recoil') pc.circle(Math.round(ex - 9), Math.round(20 + Math.sin(tube) * len), 3, C.smokeLight);
            sandbags(pc, 2, 22, 36);
        });
    }
}

function bakeTurret(bank) {
    frame(bank, 'turret_base', 30, 26, 15, 25, (pc) => {
        sandbags(pc, 0, 15, 30);
        pc.poly([[5, 16], [25, 16], [22, 4], [8, 4]], C.metalDark);
        pc.rect(8, 4, 14, 2, C.metal);
        pc.rect(9, 8, 12, 3, C.metal);
        // bunting
        for (let i = 0; i < 4; i++) pc.poly([[6 + i * 5, 12], [10 + i * 5, 12], [8 + i * 5, 15]], PARTY[i]);
    });
    for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        frame(bank, `turret_gun${i}`, 32, 32, 16, 16, (pc) => {
            const ex = 16 + Math.cos(a) * 13;
            const ey = 16 + Math.sin(a) * 13;
            pc.stroke(16, 16, ex, ey, 3, C.metalDark);
            pc.stroke(16, 16, 16 + Math.cos(a) * 12, 16 + Math.sin(a) * 12, 1, C.metalLight);
            pc.circle(16, 16, 4, C.metal);
            pc.px(15, 15, C.metalLight);
        });
    }
}

function bakeBalloons(bank) {
    PARTY.forEach((color, i) => {
        frame(bank, `balloon_${i}`, 12, 22, 6, 21, (pc) => {
            pc.ellipse(6, 6, 4.5, 5.5, color);
            pc.px(4, 3, C.white);
            pc.px(4, 4, C.white);
            pc.px(6, 12, color);
            pc.line(6, 13, 6, 21, C.white);
        });
    });
    frame(bank, 'balloon_pop', 16, 16, 8, 8, (pc) => {
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            pc.line(8 + Math.cos(a) * 3, 8 + Math.sin(a) * 3, 8 + Math.cos(a) * 6, 8 + Math.sin(a) * 6, C.white);
        }
    });
}

// ------------------------------------------------------------ the grandkids

const KIDS = [
    { shirt: C.cyan, shirtShade: C.cyanShade, hair: C.woodDark, extra: 'pigtails' },
    { shirt: C.lime, shirtShade: C.leafDark, hair: C.ink, extra: 'cap' },
    { shirt: C.orange, shirtShade: C.fireRed, hair: C.yellowShade, extra: 'curl' },
];

function bakeHostages(bank) {
    KIDS.forEach((kid, k) => {
        for (let i = 0; i < 2; i++) frame(bank, `kid${k}_tied${i}`, 26, 32, 13, 30, (pc) => tiedKid(pc, kid, i));
        frame(bank, `kid${k}_freed`, 26, 32, 13, 30, (pc) => standingKid(pc, kid, 'jump'));
        frame(bank, `kid${k}_thanks`, 26, 32, 13, 30, (pc) => standingKid(pc, kid, 'salute'));
        for (let i = 0; i < 4; i++) frame(bank, `kid${k}_run${i}`, 26, 32, 13, 30, (pc) => standingKid(pc, kid, `run${i}`));
    });
    frame(bank, 'chair_broken', 26, 32, 13, 30, (pc) => chair(pc, true));
}

function chair(pc, broken = false) {
    pc.rect(5, 12, 3, 18, C.woodDark);
    pc.rect(5, 12, 2, 18, C.wood);
    pc.rect(5, 21, 14, 3, C.wood);
    pc.rect(5, 23, 14, 1, C.woodDark);
    if (!broken) pc.rect(17, 23, 2, 7, C.woodDark);
    else pc.rect(17, 26, 2, 4, C.woodDark);
    pc.rect(7, 24, 2, 6, C.woodDark);
}

function kidHead(pc, kid, x, y, face) {
    pc.circle(x, y, 4.2, C.skin);
    pc.px(x + 4, y + 1, C.skin);
    pc.rect(x - 4, y - 4, 8, 3, kid.hair);
    pc.rect(x - 5, y - 3, 3, 5, kid.hair);
    if (kid.extra === 'pigtails') {
        pc.circle(x - 6, y + 1, 1.8, kid.hair);
        pc.px(x - 6, y - 1, C.pink);
    } else if (kid.extra === 'cap') {
        pc.rect(x - 4, y - 5, 8, 3, C.fireRed);
        pc.rect(x + 2, y - 3, 4, 1, C.fireRed);
    } else {
        pc.px(x + 1, y - 5, kid.hair);
        pc.px(x + 2, y - 6, kid.hair);
    }
    pc.px(x + 2, y, C.ink);
    if (face === 'gag') {
        // a party streamer over the mouth
        pc.rect(x - 3, y + 2, 8, 2, C.pink);
    } else if (face === 'happy') {
        pc.rect(x + 1, y + 2, 3, 1, C.ink);
        pc.px(x + 3, y + 1, C.ink);
    }
    pc.px(x + 3, y + 2, C.skinShade);
}

function tiedKid(pc, kid, wiggle) {
    chair(pc);
    const w = wiggle ? 1 : 0;
    pc.rect(9 + w, 13, 8, 9, kid.shirt);
    pc.rect(9 + w, 19, 8, 2, kid.shirtShade);
    pc.rect(11, 22, 7, 3, C.contBlue);
    pc.rect(16, 24, 3, 6, C.contBlue);
    pc.rect(16, 29, 4, 2, C.bootShade);
    kidHead(pc, kid, 13 + w, 8, 'gag');
    // streamers wrapped around
    pc.line(7, 14, 19, 17, C.yellow);
    pc.line(7, 18, 19, 21, C.cyan);
    pc.line(7, 16, 19, 14 + w, C.pink);
    pc.px(20, 13 + w * 2, C.yellow);
    pc.px(21, 14 + w * 2, C.yellow);
}

function standingKid(pc, kid, pose) {
    const jump = pose === 'jump' ? -3 : 0;
    const run = pose.startsWith('run') ? Number(pose.slice(3)) : -1;
    const legA = run >= 0 ? [[-3, 0], [0, 2], [3, 0], [0, 2]][run] : [-2, 0];
    const legB = run >= 0 ? [[3, 0], [0, 2], [-3, 0], [0, 2]][run] : [2, 0];
    pc.stroke(12, 22 + jump, 12 + legA[0], 28 - legA[1] + jump, 2, C.contBlue);
    pc.stroke(14, 22 + jump, 14 + legB[0], 28 - legB[1] + jump, 2, C.contBlueShade);
    pc.rect(9, 13 + jump, 8, 10, kid.shirt);
    pc.rect(9, 20 + jump, 8, 2, kid.shirtShade);
    kidHead(pc, kid, 13, 8 + jump, 'happy');
    if (pose === 'salute') {
        pc.stroke(15, 14, 18, 6, 2, kid.shirt);
        pc.rect(17, 4, 2, 2, C.skin);
    } else if (pose === 'jump') {
        pc.stroke(10, 14 + jump, 6, 6 + jump, 2, kid.shirt);
        pc.stroke(16, 14 + jump, 20, 6 + jump, 2, kid.shirt);
    } else {
        pc.stroke(15, 14, 18, 18 - (run % 2) * 3, 2, kid.shirt);
    }
}

// ------------------------------------------------------------ props

function bakeProps(bank) {
    frame(bank, 'prop_barrel', 18, 22, 9, 21, (pc) => {
        pc.rect(2, 2, 14, 19, C.fireRed);
        pc.rect(2, 2, 3, 19, C.contRedShade);
        pc.rect(12, 2, 2, 19, C.clownRed);
        pc.rect(2, 6, 14, 1, C.contRedShade);
        pc.rect(2, 15, 14, 1, C.contRedShade);
        pc.rect(4, 8, 10, 6, C.yellow);
        pc.poly([[9, 8], [13, 13], [5, 13]], C.ink);
        pc.px(9, 10, C.yellow);
        pc.px(9, 12, C.yellow);
        pc.ellipse(9, 2, 7, 1.5, C.contRedShade);
    });
    frame(bank, 'prop_crate', 22, 20, 11, 19, (pc) => {
        pc.rect(2, 3, 18, 16, C.wood);
        pc.rect(2, 3, 18, 2, C.woodLight);
        pc.rect(2, 17, 18, 2, C.woodDark);
        pc.line(3, 5, 19, 17, C.woodDark);
        pc.line(3, 17, 19, 5, C.woodDark);
        pc.rect(8, 8, 6, 5, C.wood);
        paintMap(pc, ['.x.', 'xxx', '.x.'], 9, 9);
    });
    frame(bank, 'prop_cutout', 22, 40, 11, 39, (pc) => {
        // cardboard Supremo giving a thumbs up
        pc.rect(9, 30, 4, 9, C.plasterShade);
        pc.rect(4, 14, 14, 17, C.uni);
        pc.rect(4, 14, 14, 2, C.gold);
        for (let i = 0; i < 3; i++) pc.px(7 + i * 3, 18, C.gold);
        pc.circle(11, 8, 6, C.skin);
        pc.rect(5, 1, 12, 3, C.uniShade);
        pc.rect(4, 3, 14, 2, C.gold);
        pc.rect(7, 9, 9, 2, C.ink);
        pc.px(8, 9, C.metalLight);
        pc.rect(6, 12, 10, 1, C.ink);
        pc.rect(17, 12, 4, 5, C.skin);
        pc.rect(19, 9, 2, 3, C.skin);
        pc.rect(3, 32, 16, 1, C.plasterShade);
    });
    frame(bank, 'prop_cake', 22, 24, 11, 23, (pc) => {
        pc.rect(9, 17, 4, 6, C.metalLight);
        pc.rect(5, 21, 12, 2, C.metal);
        pc.rect(3, 9, 16, 8, C.pink);
        pc.rect(3, 9, 16, 2, C.white);
        for (let i = 0; i < 4; i++) pc.px(4 + i * 4, 11, C.white);
        pc.rect(3, 15, 16, 2, C.pinkShade);
        for (let i = 0; i < 3; i++) {
            pc.rect(6 + i * 4, 4, 1, 5, PARTY[i + 1]);
            pc.px(6 + i * 4, 3, C.fireYellow);
        }
    });
    frame(bank, 'prop_speaker', 22, 30, 11, 29, (pc) => {
        pc.rect(2, 2, 18, 27, C.inkSoft);
        pc.rect(2, 2, 18, 1, C.metal);
        for (const [cy, r] of [[9, 5], [22, 4]]) {
            pc.circle(11, cy, r, C.metalDark);
            pc.circle(11, cy, r - 2, C.black);
            pc.px(11, cy, C.metal);
        }
        pc.rect(3, 15, 16, 1, C.pink);
    });
    frame(bank, 'prop_barricade', 26, 46, 13, 45, (pc) => {
        pc.rect(3, 4, 4, 41, C.woodDark);
        pc.rect(19, 4, 4, 41, C.woodDark);
        for (let y = 6; y < 40; y += 8) pc.rect(1, y, 24, 5, C.wood);
        for (let y = 6; y < 40; y += 8) pc.rect(1, y, 24, 1, C.woodLight);
        sandbags(pc, 0, 34, 26);
        pc.rect(5, 18, 16, 6, C.white);
        pc.rect(5, 18, 16, 1, C.fireRed);
        pc.rect(5, 23, 16, 1, C.fireRed);
    });
    frame(bank, 'prop_gate', 28, 60, 14, 59, (pc) => {
        pc.rect(2, 2, 24, 3, C.gold);
        pc.rect(2, 55, 24, 4, C.goldShade);
        for (let x = 3; x < 26; x += 4) {
            pc.rect(x, 4, 2, 52, C.goldShade);
            pc.px(x, 4, C.goldLight);
            pc.poly([[x - 1, 3], [x + 2, 3], [x + 0.5, -1]], C.gold);
        }
        pc.rect(2, 28, 24, 2, C.gold);
        pc.circle(14, 29, 5, C.gold);
        pc.circle(14, 29, 3, C.crimson);
        pc.px(14, 29, C.gold);
    });
}

// ------------------------------------------------------------ pickups

function bakePickups(bank) {
    const crate = (letter, color) => (pc) => {
        pc.rect(1, 3, 16, 12, C.helmet);
        pc.rect(1, 3, 16, 2, C.helmetShade);
        pc.rect(1, 13, 16, 2, C.helmetShade);
        pc.rect(4, 5, 10, 8, color);
        const glyph = {
            H: ['x.x', 'x.x', 'xxx', 'x.x', 'x.x'],
            S: ['xxx', 'x..', 'xxx', '..x', 'xxx'],
            R: ['xx.', 'x.x', 'xx.', 'x.x', 'x.x'],
            F: ['xxx', 'x..', 'xx.', 'x..', 'x..'],
        }[letter];
        paintMap(pc, glyph, 8, 6, { x: C.ink });
    };
    frame(bank, 'pick_heavy', 18, 16, 9, 15, crate('H', C.yellow));
    frame(bank, 'pick_shotgun', 18, 16, 9, 15, crate('S', C.orange));
    frame(bank, 'pick_fireworks', 18, 16, 9, 15, crate('R', C.pink));
    frame(bank, 'pick_flamer', 18, 16, 9, 15, crate('F', C.fireYellow));
    frame(bank, 'pick_bombs', 18, 14, 9, 13, (pc) => {
        pc.ellipse(9, 10, 8, 2.5, C.white);
        for (const [x, y] of [[5, 7], [9, 6], [13, 7], [7, 4], [11, 4]]) ball(pc, x, y, 2.5, C.wood, C.woodDark, C.woodLight);
        pc.px(9, 3, C.clownRed);
        pc.px(6, 6, C.clownRed);
    });
    frame(bank, 'pick_espresso', 14, 14, 7, 13, (pc) => {
        pc.ellipse(7, 12, 6, 1.5, C.white);
        pc.rect(3, 6, 7, 6, C.white);
        pc.rect(3, 6, 7, 1, C.woodDark);
        pc.rect(10, 7, 2, 3, C.white);
        pc.line(5, 1, 6, 4, C.smokeLight);
        pc.line(8, 2, 7, 4, C.smokeLight);
    });
    frame(bank, 'pick_lasagna', 22, 14, 11, 13, (pc) => {
        pc.rect(1, 6, 20, 7, C.metalLight);
        pc.rect(3, 4, 16, 6, C.fireOrange);
        for (let x = 3; x < 19; x += 3) pc.px(x, 5, C.fireRed);
        pc.rect(3, 8, 16, 1, C.yellow);
        pc.rect(3, 4, 16, 1, C.yellow);
        pc.line(6, 0, 7, 2, C.smokeLight);
        pc.line(13, 0, 14, 2, C.smokeLight);
    });
    frame(bank, 'pick_coin', 10, 10, 5, 9, (pc) => {
        ball(pc, 5, 5, 4, C.gold, C.goldShade, C.goldLight);
        pc.rect(4, 3, 2, 4, C.goldShade);
    });
    frame(bank, 'pick_candy', 14, 10, 7, 9, (pc) => {
        pc.poly([[1, 2], [4, 5], [1, 8]], C.cyan);
        pc.poly([[13, 2], [10, 5], [13, 8]], C.cyan);
        ball(pc, 7, 5, 3.5, C.pink, C.pinkShade, C.white);
    });
    frame(bank, 'pick_cannolo', 18, 10, 9, 9, (pc) => {
        pc.rect(3, 2, 12, 6, C.woodLight);
        pc.line(5, 2, 4, 7, C.wood);
        pc.line(9, 2, 8, 7, C.wood);
        pc.line(13, 2, 12, 7, C.wood);
        pc.ellipse(2, 5, 2, 3, C.apron);
        pc.ellipse(16, 5, 2, 3, C.apron);
        pc.px(1, 4, C.lime);
        pc.px(16, 6, C.fireRed);
    });
    frame(bank, 'pick_gift', 16, 16, 8, 15, (pc) => {
        pc.rect(2, 5, 12, 10, C.cyan);
        pc.rect(2, 5, 12, 2, C.cyanShade);
        pc.rect(7, 5, 2, 10, C.pink);
        pc.ellipse(5, 3, 3, 2, C.pink);
        pc.ellipse(11, 3, 3, 2, C.pink);
    });
    frame(bank, 'pick_tooth', 12, 14, 6, 13, (pc) => {
        pc.poly([[2, 2], [10, 2], [10, 7], [8, 12], [7, 8], [5, 8], [4, 12], [2, 7]], C.gold);
        pc.rect(3, 3, 3, 2, C.goldLight);
        pc.line(9, 3, 9, 7, C.goldShade);
    });
    frame(bank, 'pick_life', 16, 16, 8, 15, (pc) => iconNonna(pc, 2, 2));
}

export function iconNonna(pc, x, y) {
    pc.circle(x + 6, y + 6, 5, C.skin);
    pc.rect(x + 1, y, 10, 4, C.hair);
    pc.rect(x, y + 3, 12, 2, C.bandana);
    pc.rect(x + 3, y + 6, 2, 2, C.glass);
    pc.rect(x + 7, y + 6, 2, 2, C.glass);
    pc.rect(x + 4, y + 9, 4, 1, C.skinDark);
}

// ------------------------------------------------------------ shots

function bakeShots(bank) {
    frame(bank, 'shot_bullet', 10, 6, 5, 3, (pc) => {
        pc.rect(1, 2, 8, 2, C.shotGlow);
        pc.rect(4, 2, 5, 2, C.shotCore);
    }, { outline: null });
    frame(bank, 'shot_bulletV', 6, 10, 3, 5, (pc) => {
        pc.rect(2, 1, 2, 8, C.shotGlow);
        pc.rect(2, 1, 2, 5, C.shotCore);
    }, { outline: null });
    frame(bank, 'shot_heavyBullet', 14, 6, 7, 3, (pc) => {
        pc.rect(1, 2, 12, 2, C.fireOrange);
        pc.rect(5, 1, 8, 4, C.shotGlow);
        pc.rect(7, 2, 6, 2, C.shotCore);
    }, { outline: null });
    frame(bank, 'shot_meatball', 10, 10, 5, 5, (pc) => {
        ball(pc, 5, 5, 3.5, C.wood, C.woodDark, C.woodLight);
        pc.px(4, 3, C.clownRed);
        pc.px(6, 6, C.clownRed);
        pc.px(3, 6, C.leaf);
    });
    for (let i = 0; i < 2; i++) {
        frame(bank, `shot_rocket${i}`, 18, 10, 9, 5, (pc) => {
            pc.rect(4, 3, 10, 4, C.pink);
            pc.rect(6, 3, 2, 4, C.white);
            pc.rect(10, 3, 2, 4, C.white);
            pc.poly([[14, 3], [17, 5], [14, 7]], C.yellow);
            pc.rect(2, 2, 2, 6, C.cyan);
            pc.rect(0, 4 - i, 2, 2 + i * 2, C.fireYellow);
        });
    }
    for (let i = 0; i < 2; i++) {
        frame(bank, `shot_eBullet${i}`, 10, 10, 5, 5, (pc) => {
            pc.circle(5, 5, i ? 3.6 : 3.2, C.enemyShot);
            pc.circle(5, 5, 1.6, C.enemyShotCore);
        }, { outline: C.ink });
    }
    frame(bank, 'shot_eFast', 14, 6, 7, 3, (pc) => {
        pc.rect(1, 2, 12, 2, C.enemyShot);
        pc.rect(7, 2, 6, 2, C.enemyShotCore);
    });
    PARTY.forEach((c, i) => frame(bank, `shot_eSprinkle${i}`, 6, 6, 3, 3, (pc) => {
        pc.rect(1, 2, 4, 2, c);
        pc.px(2, 2, C.white);
    }));
    for (let i = 0; i < 2; i++) {
        frame(bank, `shot_eRocket${i}`, 20, 10, 10, 5, (pc) => {
            // a big bottle rocket with a red danger glow: shoot it
            pc.rect(5, 3, 10, 4, C.cyan);
            pc.rect(8, 3, 2, 4, C.white);
            pc.poly([[5, 3], [1, 5], [5, 7]], C.fireRed);
            pc.rect(15, 2, 2, 6, C.metalDark);
            pc.rect(17, 4 - i, 3, 2 + i * 2, C.fireYellow);
            pc.px(3, 5, C.white);
        });
    }
    for (let i = 0; i < 2; i++) {
        frame(bank, `shot_eMissile${i}`, 16, 10, 8, 5, (pc) => {
            pc.rect(4, 3, 8, 4, C.gold);
            pc.rect(4, 3, 8, 1, C.goldLight);
            pc.poly([[4, 3], [1, 5], [4, 7]], C.crimson);
            pc.rect(12, 2, 2, 6, C.goldShade);
            pc.rect(14, 4 - i, 2, 2 + i * 2, C.fireYellow);
        });
    }
    frame(bank, 'shot_eGrenade', 10, 10, 5, 5, (pc) => {
        ball(pc, 5, 5, 3, C.lime, C.leafDark, C.white);
        pc.rect(4, 1, 2, 2, C.gold);
    });
    frame(bank, 'shot_eShell', 12, 12, 6, 6, (pc) => {
        ball(pc, 6, 6, 4, C.metalDark, C.ink, C.metal);
        pc.rect(3, 5, 7, 2, C.fireRed);
    });
    frame(bank, 'shot_cherry', 14, 16, 7, 9, (pc) => {
        ball(pc, 7, 10, 4.5, C.clownRed, C.contRedShade, C.white);
        pc.line(7, 5, 9, 1, C.leafDark);
        pc.rect(9, 0, 3, 2, C.leaf);
    });
    frame(bank, 'shot_scoop', 14, 14, 7, 7, (pc) => {
        ball(pc, 7, 7, 5, C.pink, C.pinkShade, C.white);
        for (const [x, y, c] of [[5, 5, C.cyan], [9, 6, C.yellow], [6, 9, C.lime], [9, 9, C.white]]) pc.px(x, y, c);
    });
    frame(bank, 'shot_candyBomb', 16, 12, 8, 6, (pc) => {
        pc.poly([[1, 2], [4, 6], [1, 10]], C.yellow);
        pc.poly([[15, 2], [12, 6], [15, 10]], C.yellow);
        ball(pc, 8, 6, 4.5, C.cyan, C.cyanShade, C.white);
        pc.line(6, 3, 10, 9, C.pink);
    });
    frame(bank, 'shot_coinBomb', 12, 12, 6, 6, (pc) => {
        ball(pc, 6, 6, 4.5, C.gold, C.goldShade, C.goldLight);
        pc.px(6, 6, C.goldShade);
        pc.px(6, 1, C.fireYellow);
    });
    for (let i = 0; i < 2; i++) {
        frame(bank, `shot_wax${i}`, 10, 14, 5, 7, (pc) => {
            pc.ellipse(5, 9, 3, 3.5, C.fireOrange);
            pc.poly([[3, 8], [7, 8], [5, 2 + i]], C.fireYellow);
            pc.px(5, 9, C.fireWhite);
        });
    }
    frame(bank, 'shot_glob', 18, 14, 9, 7, (pc) => {
        pc.ellipse(9, 7, 7, 5, C.white);
        pc.ellipse(11, 8, 4, 3, C.pink);
        pc.px(6, 5, C.cyan);
        pc.px(12, 4, C.yellow);
    });
    for (let i = 0; i < 2; i++) {
        frame(bank, `shot_wave${i}`, 20, 16, 10, 14, (pc) => {
            pc.ellipse(10, 12, 9, 4 + i, C.stone);
            pc.ellipse(10, 13, 7, 2.5, C.stoneShade);
            pc.rect(2, 7 - i, 2, 2, C.stone);
            pc.rect(16, 6 + i, 2, 2, C.stone);
        });
    }
    for (let i = 0; i < 3; i++) {
        const r = 3 + i * 2;
        frame(bank, `fx_flame${i}`, 18, 18, 9, 9, (pc) => {
            pc.circle(9, 9, r, C.fireOrange);
            pc.circle(9, 9, r - 1.5, C.fireYellow);
            if (i < 2) pc.circle(9, 9, r - 3, C.fireWhite);
        }, { outline: null });
    }
}
