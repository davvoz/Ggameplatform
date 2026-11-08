import { C } from '../../config/Palette.js';
import { GUNS } from './NonnaArt.js';
import { ball, frame, hash2, paintMap } from './ArtKit.js';
import { iconNonna } from './ObjectArt.js';

/**
 * Explosions, flashes, smoke, markers and HUD icons. Explosions are hand-timed
 * frames: a white pop, a fireball, a smoky ring. No glow and no blur: hard
 * pixels and the dark outline, like the rest of the game.
 */
export const EXPLOSION_FRAMES = 7;
export const SMALL_FRAMES = 5;

export function bakeFx(bank) {
    for (let i = 0; i < EXPLOSION_FRAMES; i++) frame(bank, `fx_boom${i}`, 56, 56, 28, 28, (pc) => boom(pc, 28, i, 1), { outline: i < 5 ? C.ink : null });
    for (let i = 0; i < SMALL_FRAMES; i++) frame(bank, `fx_pop${i}`, 28, 28, 14, 14, (pc) => boom(pc, 14, i + 1, 0.5), { outline: i < 4 ? C.ink : null });
    for (let i = 0; i < 2; i++) {
        frame(bank, `fx_muzzle${i}`, 16, 16, 8, 8, (pc) => star(pc, 8, 8, i ? 6 : 4.5, C.fireYellow, C.fireWhite), { outline: null });
    }
    for (let i = 0; i < 3; i++) {
        frame(bank, `fx_blast${i}`, 72, 40, 4, 20, (pc) => blast(pc, i), { outline: null });
    }
    for (let i = 0; i < 3; i++) {
        frame(bank, `fx_smoke${i}`, 16, 16, 8, 8, (pc) => {
            const r = 2.5 + i * 2;
            ball(pc, 8, 8, r, C.smokeLight, C.smoke, C.white);
        }, { outline: null });
    }
    for (let i = 0; i < 3; i++) {
        frame(bank, `fx_dust${i}`, 16, 10, 8, 9, (pc) => {
            pc.ellipse(8, 7, 2 + i * 2, 1.5 + i * 0.6, C.stone);
            pc.ellipse(8, 8, 1 + i * 1.5, 1, C.stoneShade);
        }, { outline: null });
    }
    frame(bank, 'fx_spark', 5, 5, 2, 2, (pc) => {
        pc.rect(2, 0, 1, 5, C.fireWhite);
        pc.rect(0, 2, 5, 1, C.fireWhite);
    }, { outline: null });
    frame(bank, 'fx_hit', 12, 12, 6, 6, (pc) => star(pc, 6, 6, 4.5, C.white, C.fireWhite), { outline: null });
    frame(bank, 'fx_clang', 14, 14, 7, 7, (pc) => star(pc, 7, 7, 5.5, C.metalLight, C.white), { outline: null });
    for (let i = 0; i < 2; i++) {
        frame(bank, `fx_target${i}`, 22, 10, 11, 5, (pc) => {
            const c = i ? C.enemyShot : C.fireRed;
            pc.ellipse(11, 5, 9, 3.5, c);
            clearEllipse(pc, 11, 5, 7, 2);
            pc.line(11, 0, 11, 9, c);
            pc.line(3, 5, 19, 5, c);
        }, { outline: null });
    }
    frame(bank, 'fx_shadow', 20, 6, 10, 3, (pc) => {
        pc.ellipse(10, 3, 9, 2, C.ink);
    }, { outline: null });
    frame(bank, 'fx_bang', 10, 14, 5, 13, (pc) => {
        pc.rect(1, 0, 8, 11, C.white);
        pc.rect(4, 2, 2, 5, C.fireRed);
        pc.rect(4, 8, 2, 2, C.fireRed);
        pc.px(3, 11, C.white);
        pc.px(2, 12, C.white);
    });
    frame(bank, 'fx_star', 7, 7, 3, 3, (pc) => star(pc, 3, 3, 3, C.yellow, C.white));
    frame(bank, 'fx_go', 34, 18, 17, 9, (pc) => {
        paintMap(pc, [
            '.yyyy..yyy..y....',
            'y.....y...y.yy...',
            'y.yyy.y...y.yyy..',
            'y...y.y...y.yyyy.',
            '.yyy...yyy..yyy..',
            '............yy...',
            '............y....',
        ], 1, 3, { y: C.yellow });
    }, { outline: C.ink });

    // HUD icons
    frame(bank, 'ui_heart', 11, 10, 0, 0, (pc) => heart(pc, C.bandana, C.white));
    frame(bank, 'ui_heartEmpty', 11, 10, 0, 0, (pc) => heart(pc, C.inkSoft, C.dressLight));
    frame(bank, 'ui_nonna', 15, 15, 0, 0, (pc) => iconNonna(pc, 1, 1));
    frame(bank, 'ui_meatball', 10, 10, 0, 0, (pc) => {
        ball(pc, 5, 5, 3.5, C.wood, C.woodDark, C.woodLight);
        pc.px(4, 3, C.clownRed);
    });
    for (const [id, gun] of Object.entries(GUNS)) {
        frame(bank, `ui_w_${id}`, gun.rows[0].length + 2, gun.rows.length + 2, 0, 0, (pc) => paintMap(pc, gun.rows, 1, 1));
    }
}

function boom(pc, c, i, s) {
    const R = [5, 11, 16, 18, 19, 20, 21][i] * s;
    if (i === 0) {
        star(pc, c, c, R + 2, C.fireYellow, C.fireWhite);
        pc.circle(c, c, R * 0.7, C.fireWhite);
        return;
    }
    const puffs = 7;
    const cols = i <= 2 ? [C.fireOrange, C.fireYellow, C.fireWhite]
        : i <= 3 ? [C.fireRed, C.fireOrange, C.fireYellow]
            : i <= 4 ? [C.smokeDark, C.fireRed, C.fireOrange]
                : [C.smokeDark, C.smoke, C.smokeLight];
    for (let k = 0; k < puffs; k++) {
        const a = (k / puffs) * Math.PI * 2 + hash2(k, i) * 0.6;
        const d = R * (0.45 + hash2(k, i, 3) * 0.2);
        const r = R * (0.42 + hash2(k, i, 5) * 0.18);
        pc.circle(c + Math.cos(a) * d, c + Math.sin(a) * d, r, cols[0]);
    }
    pc.circle(c, c, R * 0.62, cols[0]);
    for (let k = 0; k < puffs; k++) {
        const a = (k / puffs) * Math.PI * 2 + 0.4;
        const d = R * 0.32;
        pc.circle(c + Math.cos(a) * d, c + Math.sin(a) * d - 1, R * 0.3, cols[1]);
    }
    pc.circle(c - 1, c - 2, R * 0.3, cols[2]);
    if (i >= 5) {
        // the ring opens up as the smoke clears
        const hole = R * (i === 5 ? 0.25 : 0.5);
        clearEllipse(pc, c, c, hole, hole);
    }
}

function star(pc, cx, cy, r, outer, inner) {
    pc.poly([[cx - r, cy], [cx - r * 0.3, cy - r * 0.3], [cx, cy - r], [cx + r * 0.3, cy - r * 0.3],
        [cx + r, cy], [cx + r * 0.3, cy + r * 0.3], [cx, cy + r], [cx - r * 0.3, cy + r * 0.3]], outer);
    pc.circle(cx, cy, Math.max(1, r * 0.35), inner);
}

function blast(pc, i) {
    const len = [40, 64, 60][i];
    const spread = [10, 17, 18][i];
    const color = [C.fireWhite, C.fireYellow, C.fireOrange][i];
    pc.poly([[0, 20], [len, 20 - spread], [len - 6, 20], [len, 20 + spread]], color);
    if (i < 2) pc.poly([[0, 20], [len * 0.7, 20 - spread * 0.5], [len * 0.7, 20 + spread * 0.5]], C.fireWhite);
    for (let k = 0; k < 6; k++) {
        const x = 10 + hash2(k, i) * (len - 10);
        const y = 20 + (hash2(k, i, 2) - 0.5) * spread * 1.6;
        pc.rect(x, y, 2, 2, i === 2 ? C.smokeLight : C.fireWhite);
    }
}

function heart(pc, color, light) {
    paintMap(pc, ['.cc.cc.', 'ccccccc', 'ccccccc', '.ccccc.', '..ccc..', '...c...'], 2, 2, { c: color });
    pc.px(3, 3, light);
    pc.outline(C.ink);
}

function clearEllipse(pc, cx, cy, rx, ry) {
    for (let y = 0; y < pc.h; y++) {
        for (let x = 0; x < pc.w; x++) {
            if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1) pc.data[y * pc.w + x] = 0;
        }
    }
}
