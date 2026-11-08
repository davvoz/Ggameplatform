import { C } from '../../config/Palette.js';
import { frame } from './ArtKit.js';

/**
 * The Supremo's foot soldiers. One body painter, many looks: purple and gold
 * uniforms, olive helmets with a party cone strapped on top (it's his
 * birthday, attendance is mandatory). Each type gets the same set of poses so
 * the renderer can map any state to a frame.
 *
 * frames: 36x46, anchor (16, 44) = feet
 */
const W = 36;
const H = 46;
const AX = 16;
const AY = 44;

/** Looks of each type. */
const LOOKS = {
    grunt: { coat: C.uni, coatShade: C.uniShade, coatLight: C.uniLight, hat: 'cone', hatColor: C.pink, hatShade: C.pinkShade, weapon: 'rifle', face: 'stubble' },
    grenadier: { coat: C.uni, coatShade: C.uniShade, coatLight: C.uniLight, hat: 'cone', hatColor: C.yellow, hatShade: C.yellowShade, weapon: 'grenade', face: 'mustache', bag: true },
    shield: { coat: C.uniShade, coatShade: C.inkSoft, coatLight: C.uni, hat: 'cone', hatColor: C.cyan, hatShade: C.cyanShade, weapon: 'tray', face: 'brute' },
    sniper: { coat: C.uni, coatShade: C.uniShade, coatLight: C.uniLight, hat: 'beret', weapon: 'long', face: 'shades' },
    guard: { coat: C.crimson, coatShade: C.crimsonShade, coatLight: C.crimsonLight, hat: 'plume', weapon: 'musket', face: 'mustache', armor: true, tall: 3 },
    bazooka: { coat: C.uni, coatShade: C.uniShade, coatLight: C.uniLight, hat: 'cone', hatColor: C.lime, hatShade: C.leafDark, weapon: 'tube', face: 'stubble' },
    balloon: { coat: C.uni, coatShade: C.uniShade, coatLight: C.uniLight, hat: 'cone', hatColor: C.orange, hatShade: C.fireRed, weapon: 'smg', face: 'stubble' },
    mortar: { coat: C.uni, coatShade: C.uniShade, coatLight: C.uniLight, hat: 'cone', hatColor: C.cyan, hatShade: C.cyanShade, weapon: 'none', face: 'mustache' },
    clown: { coat: C.yellow, coatShade: C.yellowShade, coatLight: C.white, hat: 'wig', weapon: 'dynamite', face: 'clown', dots: true, shoes: true },
};

/** Leg poses: [back foot x, back lift, front foot x, front lift, hip drop]. */
const LEGS = {
    stand: [-3, 0, 3, 0, 0],
    walk0: [-4, 0, 4, 0, 0],
    walk1: [-2, 1, 2, 0, 1],
    walk2: [3, 0, -3, 0, 0],
    walk3: [1, 0, -1, 1, 1],
    run0: [-6, 0, 6, 1, 0],
    run1: [-2, 3, 3, 0, 1],
    run2: [6, 1, -6, 0, 0],
    run3: [2, 0, -3, 3, 1],
    air: [-4, 4, 4, 2, -1],
    kneel: [-5, 0, 5, 0, 7],
    dance: [-5, 2, 4, 0, 0],
};

/** @param {import('../SpriteBank.js').SpriteBank} bank */
export function bakeSoldiers(bank) {
    for (const [type, look] of Object.entries(LOOKS)) {
        const add = (name, legs, arms, face = 'normal', lean = 0) => {
            frame(bank, `${type}_${name}`, W, H, AX, AY, (pc) => soldier(pc, look, LEGS[legs], arms, face, lean));
        };
        add('idle0', 'stand', 'carry');
        add('idle1', 'stand', 'carry', 'normal', 0);
        for (let i = 0; i < 4; i++) add(`walk${i}`, `walk${i}`, 'carry');
        add('aim', 'stand', 'aim');
        add('recoil', 'stand', 'recoil', 'shout', -1);
        add('windup', 'stand', 'windup', 'shout', -1);
        add('stab', 'walk0', 'stab', 'shout', 1);
        add('party0', 'stand', 'party0', 'happy');
        add('party1', 'dance', 'party1', 'happy');
        add('surprised', 'air', 'flail', 'surprise');
        for (let i = 0; i < 4; i++) add(`panic${i}`, `run${i}`, i % 2 ? 'flail' : 'up', 'scream');
        add('fall', 'air', 'up', 'scream');
        add('kneel', 'kneel', 'aim');
        add('kneelFire', 'kneel', 'recoil', 'shout', -1);
        add('throw0', 'stand', 'throw0', 'shout', -1);
        add('throw1', 'walk0', 'throw1', 'shout', 1);
        add('float', 'air', 'strings', 'surprise');
        add('dead0', 'air', 'flail', 'dead', -2);
        frame(bank, `${type}_dead1`, W, H, AX, AY, (pc) => lying(pc, look));
        frame(bank, `${type}_burnt`, W, H, AX, AY, (pc) => {
            soldier(pc, look, LEGS.stand, 'up', 'dead', 0);
            burn(pc);
        });
    }
}

function soldier(pc, look, legs, arms, face, lean) {
    const [bx, bl, fx, fl, drop] = legs;
    const tall = look.tall ?? 0;
    const hip = AY - 11 + drop;
    const shoulder = hip - 11 - tall;
    const x = AX + lean;
    const headY = shoulder - 1;

    // legs: trousers and boots, back leg darker
    legPaint(pc, look, AX - 1, hip, AX + bx, AY - 1 - bl, true);
    if (look.bag) pc.rect(AX - 7 + lean, hip - 8, 4, 6, C.helmetShade);

    // torso
    pc.poly([[x - 5, shoulder], [x + 5, shoulder], [x + 6, hip + 1], [x - 5, hip + 1]], look.coat);
    pc.rect(x - 5, shoulder, 2, hip - shoulder + 1, look.coatShade);
    pc.rect(x + 3, shoulder + 1, 2, 3, look.coatLight);
    if (look.dots) {
        for (const [dx, dy] of [[-2, 3], [2, 5], [-1, 8], [3, 9], [0, 1]]) pc.px(x + dx, shoulder + dy, C.pink);
        pc.rect(x - 4, shoulder - 1, 9, 2, C.white);
        pc.px(x - 2, shoulder, C.pink);
        pc.px(x + 2, shoulder, C.cyan);
    } else if (look.armor) {
        pc.poly([[x - 4, shoulder + 1], [x + 5, shoulder + 1], [x + 5, hip - 3], [x, hip - 1], [x - 4, hip - 3]], C.gold);
        pc.line(x - 3, shoulder + 2, x + 4, shoulder + 2, C.goldLight);
        pc.line(x - 3, hip - 3, x + 4, hip - 3, C.goldShade);
        pc.px(x + 1, shoulder + 5, C.goldShade);
    } else {
        pc.rect(x + 1, shoulder + 2, 1, 1, C.gold);
        pc.rect(x + 1, shoulder + 5, 1, 1, C.gold);
        pc.rect(x + 1, shoulder + 8, 1, 1, C.gold);
        pc.rect(x - 5, hip - 2, 11, 2, C.woodDark);
        pc.px(x + 1, hip - 2, C.gold);
        pc.rect(x - 5, shoulder, 3, 1, C.gold);
    }

    legPaint(pc, look, AX + 1, hip, AX + fx, AY - 1 - fl, false);

    head(pc, look, x + 1, headY, face);
    armsPaint(pc, look, x, shoulder, arms);
}

function legPaint(pc, look, hx, hip, footX, footY, back) {
    const pants = back ? C.inkSoft : (look.dots ? C.yellowShade : C.uniShade);
    pc.stroke(hx, hip + 1, footX, footY - 2, 3, look.dots ? (back ? C.yellowShade : C.yellow) : pants);
    if (look.shoes) {
        pc.rect(footX - 2, footY - 1, 7, 3, back ? C.fireRed : C.clownRed);
        pc.px(footX + 3, footY - 2, C.white);
    } else {
        pc.rect(footX - 2, footY - 1, 5, 2, back ? C.black : C.bootShade);
        pc.px(footX + 3, footY, back ? C.black : C.bootShade);
    }
}

function head(pc, look, x, y, face) {
    // y is the chin line
    const top = y - 8;
    pc.poly([[x - 3, top + 1], [x + 3, top], [x + 4, top + 2], [x + 4, y - 1], [x + 2, y], [x - 2, y], [x - 4, y - 2], [x - 4, top + 2]], look.face === 'clown' ? C.clownWhite : C.skin);
    // nose: big, it's that kind of army
    pc.rect(x + 4, top + 4, 2, 2, look.face === 'clown' ? C.clownRed : C.skin);
    pc.px(x + 5, top + 5, look.face === 'clown' ? C.clownRed : C.skinShade);
    pc.px(x - 3, top + 5, C.skinShade);
    // eye
    const eyeY = top + 3;
    if (look.face === 'shades') {
        pc.rect(x, eyeY, 5, 2, C.ink);
        pc.px(x + 1, eyeY, C.metalLight);
    } else if (face === 'dead') {
        pc.line(x + 1, eyeY - 1, x + 3, eyeY + 1, C.ink);
        pc.line(x + 1, eyeY + 1, x + 3, eyeY - 1, C.ink);
    } else if (face === 'surprise' || face === 'scream') {
        pc.rect(x + 1, eyeY - 1, 2, 3, C.white);
        pc.px(x + 2, eyeY, C.ink);
    } else if (face === 'happy') {
        pc.line(x + 1, eyeY, x + 3, eyeY, C.ink);
        pc.px(x + 2, eyeY - 1, C.ink);
    } else {
        pc.px(x + 2, eyeY, C.ink);
        pc.line(x + 1, eyeY - 1, x + 3, eyeY - 2, C.inkSoft);
    }
    if (look.face === 'clown') {
        pc.rect(x + 1, eyeY - 2, 3, 1, C.cyan);
        pc.rect(x, y - 2, 4, 1, C.clownRed);
    }
    // mouth
    if (face === 'scream' || face === 'shout' || face === 'surprise') {
        pc.rect(x + 1, y - 3, 3, 2, C.ink);
        pc.px(x + 2, y - 2, C.clownRed);
    } else if (face === 'happy') {
        pc.line(x + 1, y - 2, x + 3, y - 2, C.ink);
    }
    if (look.face === 'stubble') {
        pc.px(x - 1, y - 1, C.skinShade);
        pc.px(x + 1, y - 1, C.skinShade);
        pc.px(x + 3, y - 1, C.skinShade);
    }
    if (look.face === 'mustache' && face !== 'scream') {
        pc.rect(x + 1, y - 3, 5, 2, C.inkSoft);
        pc.px(x + 6, y - 2, C.inkSoft);
    }
    if (look.face === 'brute') {
        pc.rect(x - 1, y - 1, 5, 2, C.skinShade);
        pc.line(x, eyeY - 1, x + 3, eyeY - 1, C.ink);
    }

    // headgear
    switch (look.hat) {
        case 'cone': {
            pc.poly([[x - 5, top + 2], [x - 3, top - 2], [x + 3, top - 2], [x + 5, top + 2]], C.helmet);
            pc.rect(x - 5, top + 2, 11, 1, C.helmetShade);
            pc.px(x - 2, top - 1, C.helmetShade);
            // party cone, a little tilted, with a chin strap
            pc.poly([[x - 3, top - 2], [x + 3, top - 2], [x + 1, top - 11]], look.hatColor);
            pc.line(x - 2, top - 4, x + 2, top - 5, C.white);
            pc.line(x - 1, top - 7, x + 2, top - 8, C.white);
            pc.line(x + 3, top - 2, x + 1, top - 10, look.hatShade);
            pc.circle(x + 1, top - 12, 1.5, C.yellow);
            pc.line(x + 4, top + 2, x + 3, y, C.inkSoft);
            break;
        }
        case 'beret':
            pc.poly([[x - 5, top + 1], [x - 4, top - 2], [x + 3, top - 2], [x + 5, top]], C.uniShade);
            pc.px(x + 2, top - 1, C.gold);
            break;
        case 'plume':
            pc.poly([[x - 4, top + 2], [x - 3, top - 3], [x + 3, top - 3], [x + 4, top + 2]], C.gold);
            pc.rect(x - 5, top + 2, 10, 1, C.goldShade);
            pc.stroke(x, top - 3, x - 3, top - 9, 2, C.crimsonLight);
            pc.stroke(x - 3, top - 9, x - 7, top - 7, 2, C.crimson);
            pc.px(x + 1, top - 1, C.goldLight);
            break;
        case 'wig':
            pc.circle(x - 4, top + 1, 3, C.fireRed);
            pc.circle(x + 4, top + 1, 2.5, C.cyan);
            pc.circle(x, top - 1, 2.8, C.lime);
            pc.circle(x - 2, top - 2, 2, C.orange);
            pc.poly([[x - 1, top - 4], [x + 2, top - 4], [x + 1, top - 9]], C.pink);
            break;
        default:
            break;
    }
}

function armsPaint(pc, look, x, shoulder, arms) {
    const sx = x + 1;
    const sy = shoulder + 2;
    const sleeve = look.coat;
    const hand = look.face === 'clown' ? C.white : C.skin;
    const armTo = (hx, hy, back = false) => {
        pc.stroke(sx + (back ? -2 : 0), sy, hx, hy, 2, back ? look.coatShade : sleeve);
        pc.rect(hx - 1, hy - 1, 2, 2, back ? C.skinShade : hand);
    };
    const gunY = shoulder + 4;
    switch (arms) {
        case 'carry':
            weaponPaint(pc, look, x + 2, shoulder + 7, 'low');
            armTo(x + 6, shoulder + 7);
            break;
        case 'aim':
        case 'recoil': {
            const back = arms === 'recoil' ? -1 : 0;
            armTo(x + 3 + back, gunY + 1, true);
            weaponPaint(pc, look, x + 3 + back, gunY, 'aim');
            armTo(x + 8 + back, gunY);
            if (arms === 'recoil' && look.weapon !== 'tray' && look.weapon !== 'none') {
                pc.rect(x + 22 + back, gunY - 1, 2, 3, C.fireYellow);
            }
            break;
        }
        case 'windup':
            weaponPaint(pc, look, x - 2, gunY + 1, 'aim');
            armTo(x + 3, gunY + 1);
            break;
        case 'stab':
            weaponPaint(pc, look, x + 6, gunY + 1, 'aim');
            armTo(x + 11, gunY + 1);
            break;
        case 'party0':
            armTo(x + 7, shoulder - 6);
            pc.rect(x + 6, shoulder - 10, 3, 4, C.lemon);
            pc.px(x + 7, shoulder - 11, C.white);
            weaponPaint(pc, look, x, shoulder + 8, 'low');
            break;
        case 'party1':
            armTo(x + 5, shoulder - 8);
            armTo(x - 5, shoulder - 6, true);
            pc.rect(x + 4, shoulder - 12, 3, 4, C.lemon);
            break;
        case 'up':
            armTo(x - 3, shoulder - 8, true);
            armTo(x + 5, shoulder - 9);
            break;
        case 'flail':
            armTo(x - 7, shoulder - 3, true);
            armTo(x + 8, shoulder - 6);
            break;
        case 'throw0':
            armTo(x - 6, shoulder - 6);
            grenade(pc, x - 6, shoulder - 9, look);
            break;
        case 'throw1':
            armTo(x + 9, shoulder - 2);
            break;
        case 'strings':
            armTo(x + 1, shoulder - 9);
            pc.line(x + 1, shoulder - 10, x + 1, 0, C.white);
            weaponPaint(pc, look, x + 2, gunY + 2, 'low');
            break;
        default:
            break;
    }
}

function grenade(pc, x, y, look) {
    if (look.weapon === 'dynamite') {
        pc.rect(x - 2, y - 1, 5, 4, C.clownRed);
        pc.px(x, y - 2, C.fireYellow);
    } else {
        pc.circle(x, y, 2, C.lime);
        pc.px(x, y - 3, C.gold);
    }
}

/** Weapons by look, `pose` low (carried) or aim (shouldered). */
function weaponPaint(pc, look, x, y, pose) {
    const aim = pose === 'aim';
    switch (look.weapon) {
        case 'rifle':
        case 'smg':
        case 'musket':
        case 'long': {
            const len = look.weapon === 'long' ? 20 : look.weapon === 'smg' ? 11 : 15;
            if (aim) {
                pc.rect(x - 4, y, 6, 2, C.wood);
                pc.rect(x + 2, y, len - 4, 2, C.metal);
                pc.line(x + 2, y, x + len - 3, y, C.metalLight);
                pc.px(x - 4, y + 2, C.woodDark);
                if (look.weapon === 'musket') pc.line(x + len - 2, y, x + len + 3, y, C.metalLight);
                if (look.weapon === 'long') pc.rect(x + 3, y - 2, 4, 2, C.metalDark);
            } else {
                pc.stroke(x - 3, y + 3, x + len - 6, y - 4, 2, C.metal);
                pc.stroke(x - 4, y + 4, x, y + 1, 2, C.wood);
            }
            break;
        }
        case 'grenade':
            grenade(pc, x + 4, y + 1, look);
            break;
        case 'tray':
            // the great silver serving tray, held in front
            pc.ellipse(x + 7, y, 3, 11, C.metalLight);
            pc.ellipse(x + 7, y, 2, 9, C.white);
            pc.line(x + 8, y - 9, x + 8, y + 9, C.metal);
            pc.px(x + 6, y - 5, C.white);
            break;
        case 'tube':
            pc.rect(x - 6, y - 2, 20, 5, C.cyan);
            for (let i = 0; i < 4; i++) pc.rect(x - 4 + i * 5, y - 2, 2, 5, C.white);
            pc.rect(x + 14, y - 3, 2, 7, C.metalDark);
            pc.rect(x - 7, y - 2, 1, 5, C.metalDark);
            break;
        case 'dynamite':
            pc.rect(x + 3, y - 3, 6, 6, C.clownRed);
            pc.line(x + 3, y - 1, x + 8, y - 1, C.fireRed);
            pc.line(x + 3, y + 1, x + 8, y + 1, C.fireRed);
            pc.line(x + 6, y - 4, x + 7, y - 7, C.white);
            pc.px(x + 7, y - 8, C.fireYellow);
            break;
        default:
            break;
    }
}

function lying(pc, look) {
    const y = AY - 3;
    pc.rect(6, y - 3, 16, 5, look.coat);
    pc.rect(6, y - 3, 16, 1, look.coatLight);
    pc.rect(22, y - 2, 7, 3, look.dots ? C.yellow : C.uniShade);
    pc.rect(29, y - 3, 3, 4, C.bootShade);
    pc.circle(4, y - 2, 3.5, look.face === 'clown' ? C.clownWhite : C.skin);
    pc.line(3, y - 3, 5, y - 1, C.ink);
    pc.line(3, y - 1, 5, y - 3, C.ink);
    if (look.hat === 'cone') {
        pc.poly([[8, y - 9], [12, y - 9], [16, y - 14]], look.hatColor);
    }
}

/** Charred: the shape stays, everything goes dark except the eyes. */
function burn(pc) {
    const dark = [0xff1e1416, 0xff2b2126];
    for (let i = 0; i < pc.data.length; i++) {
        const x = i % pc.w;
        const y = Math.floor(i / pc.w);
        if (pc.data[i]) pc.data[i] = dark[(x + y) % 4 === 0 ? 1 : 0];
    }
    // find the head row and give it two white eyes
    for (let y = 0; y < pc.h; y++) {
        for (let x = 0; x < pc.w; x++) {
            if (pc.data[y * pc.w + x] && y > 12 && y < 20 && x > AX && x < AX + 4) {
                pc.px(x + 1, y + 2, C.white);
                pc.px(x + 3, y + 2, C.white);
                return;
            }
        }
    }
}
