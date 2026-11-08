import { C, PARTY } from '../../config/Palette.js';
import { PixelCanvas } from '../PixelCanvas.js';
import { hash2 } from './ArtKit.js';

/**
 * The three places, painted at load. Each theme gives:
 *  sky   a 384x216 picture that never moves
 *  far   a strip that scrolls at 0.12 of the camera
 *  mid   a strip that scrolls at 0.4
 *  near  a painter for 128 px chunks of the street at full speed: facades,
 *        ground, platforms and decor, baked when the camera gets close.
 *
 * Backgrounds are kept a step darker and less saturated than the actors, so
 * Nonna, enemies and shots always stand out.
 */

export const SKY_W = 384;
export const SKY_H = 216;
const FAR_W = 768;
const MID_W = 1024;

/** Dithered vertical gradient through a list of colours. */
function bands(pc, colors, y0, y1) {
    const n = colors.length - 1;
    for (let y = y0; y < y1; y++) {
        const t = ((y - y0) / (y1 - y0)) * n;
        const i = Math.min(n - 1, Math.floor(t));
        const f = t - i;
        for (let x = 0; x < pc.w; x++) {
            // ordered dither in the middle of each band
            const threshold = ((x % 4) * 4 + (y % 4)) / 16;
            pc.data[y * pc.w + x] = 0;
            pc.px(x, y, f > threshold ? colors[i + 1] : colors[i]);
        }
    }
}

// ================================================================ TOWN

function townSky() {
    const pc = new PixelCanvas(SKY_W, SKY_H);
    bands(pc, [C.sky5, C.sky4, C.sky3, C.sky2, C.sky1, C.sky0], 0, 140);
    pc.rect(0, 140, SKY_W, 76, C.sky0);
    // the sun going down into the sea
    pc.circle(292, 122, 22, C.sky0);
    pc.circle(292, 122, 18, C.fireWhite);
    for (let y = 104; y < 140; y += 5) pc.rect(268, y, 50, 1, C.sky1);
    // long thin clouds
    for (const [x, y, w] of [[30, 40, 70], [120, 64, 50], [220, 30, 90], [40, 92, 40], [300, 76, 60]]) {
        pc.rect(x, y, w, 2, C.sky3);
        pc.rect(x + 6, y - 1, w - 14, 1, C.sky2);
    }
    return pc;
}

function townFar() {
    const pc = new PixelCanvas(FAR_W, SKY_H);
    // the sea
    pc.rect(0, 128, FAR_W, 88, C.sea);
    for (let i = 0; i < 90; i++) {
        const x = Math.floor(hash2(i, 1) * FAR_W);
        const y = 130 + Math.floor(hash2(i, 2) * 30);
        pc.rect(x, y, 3 + Math.floor(hash2(i, 3) * 6), 1, y < 140 ? C.sky1 : C.seaLight);
    }
    // the volcano, smoking: the Supremo's fireworks set it off
    pc.poly([[60, 129], [170, 62], [196, 62], [330, 129]], C.volcanoFar);
    pc.poly([[100, 129], [170, 70], [196, 70], [160, 129]], C.volcano);
    pc.rect(170, 62, 26, 3, C.volcanoShade);
    for (let i = 0; i < 9; i++) {
        pc.circle(178 + i * 6 + hash2(i, 9) * 6, 56 - i * 6, 6 + i * 1.6, i % 2 ? C.sky3 : C.sky4);
    }
    // hills with a village
    pc.poly([[380, 129], [480, 104], [600, 112], [720, 98], [768, 129]], C.volcanoShade);
    for (let i = 0; i < 24; i++) {
        const x = 440 + Math.floor(hash2(i, 4) * 300);
        const y = 110 + Math.floor(hash2(i, 5) * 14);
        pc.rect(x, y, 4, 3, C.plasterShade);
        pc.rect(x, y - 1, 4, 1, C.terracottaShade);
    }
    return pc;
}

function townMid() {
    const pc = new PixelCanvas(MID_W, SKY_H);
    let x = 0;
    let i = 0;
    while (x < MID_W) {
        const w = 26 + Math.floor(hash2(i, 11) * 30);
        const h = 40 + Math.floor(hash2(i, 12) * 40);
        const top = 168 - h;
        const shade = [C.plasterShade, C.plasterBShade, C.stoneShade][i % 3];
        pc.rect(x, top, w, 216 - top, shade);
        pc.rect(x, top - 2, w, 3, C.terracottaShade);
        for (let wy = top + 6; wy < 160; wy += 10) {
            for (let wx = x + 4; wx < x + w - 4; wx += 8) {
                const lit = hash2(wx, wy) < 0.25;
                pc.rect(wx, wy, 3, 4, lit ? C.sky0 : C.volcanoShade);
            }
        }
        if (i % 7 === 3) {
            // bell tower
            pc.rect(x + w / 2 - 6, top - 34, 12, 34, C.stoneShade);
            pc.poly([[x + w / 2 - 8, top - 34], [x + w / 2 + 8, top - 34], [x + w / 2, top - 46]], C.terracottaShade);
            pc.rect(x + w / 2 - 2, top - 28, 4, 6, C.volcanoShade);
        }
        if (i % 5 === 1) {
            // cypress
            pc.ellipse(x + w + 3, top + 4, 3, 22, C.leafDark);
        }
        x += w;
        i++;
    }
    return pc;
}

// ================================================================ HARBOUR

function harborSky() {
    const pc = new PixelCanvas(SKY_W, SKY_H);
    bands(pc, [C.night0, C.night1, C.night2, C.night3], 0, 150);
    pc.rect(0, 150, SKY_W, 66, C.night3);
    for (let i = 0; i < 70; i++) {
        pc.px(Math.floor(hash2(i, 21) * SKY_W), Math.floor(hash2(i, 22) * 110), i % 9 === 0 ? C.moon : C.night3);
    }
    pc.circle(84, 52, 20, C.moon);
    pc.circle(78, 46, 4, C.moonShade);
    pc.circle(92, 60, 3, C.moonShade);
    pc.circle(90, 42, 2, C.moonShade);
    return pc;
}

function harborFar() {
    const pc = new PixelCanvas(FAR_W, SKY_H);
    pc.rect(0, 138, FAR_W, 78, C.waterDark);
    let x = 0;
    let i = 0;
    while (x < FAR_W) {
        const w = 14 + Math.floor(hash2(i, 31) * 26);
        const h = 16 + Math.floor(hash2(i, 32) * 46);
        pc.rect(x, 138 - h, w, h, C.night1);
        for (let k = 0; k < 4; k++) {
            if (hash2(i, k) < 0.6) pc.px(x + 2 + Math.floor(hash2(k, i) * (w - 4)), 138 - h + 3 + Math.floor(hash2(i, k + 9) * (h - 6)), C.lamp);
        }
        x += w + 2;
        i++;
    }
    // the lighthouse
    pc.poly([[600, 138], [606, 80], [614, 80], [620, 138]], C.night2);
    for (let y = 88; y < 136; y += 12) pc.rect(604, y, 14, 4, C.contRed);
    pc.rect(603, 74, 14, 6, C.lamp);
    for (let k = 0; k < 6; k++) pc.px(620 + k * 2, 77, C.moonShade);
    for (let k = 0; k < 120; k++) pc.px(Math.floor(hash2(k, 40) * FAR_W), 140 + Math.floor(hash2(k, 41) * 40), C.waterLight);
    return pc;
}

function harborMid() {
    const pc = new PixelCanvas(MID_W, SKY_H);
    pc.rect(0, 156, MID_W, 60, C.water);
    for (let k = 0; k < 200; k++) {
        const x = Math.floor(hash2(k, 50) * MID_W);
        const y = 158 + Math.floor(hash2(k, 51) * 40);
        pc.rect(x, y, 2 + (k % 4), 1, C.waterLight);
    }
    // cranes
    for (const cx of [80, 420, 760]) {
        pc.rect(cx, 40, 6, 120, C.night2);
        for (let y = 44; y < 158; y += 8) pc.line(cx, y, cx + 5, y + 6, C.night1);
        pc.rect(cx - 30, 36, 110, 5, C.night2);
        pc.rect(cx + 70, 41, 1, 40, C.night1);
        pc.rect(cx + 64, 81, 14, 9, C.contYellowShade);
        pc.px(cx + 3, 33, C.contRed);
    }
    // a ship with the Supremo's flag
    pc.poly([[230, 156], [380, 156], [370, 132], [240, 132]], C.night1);
    pc.rect(270, 112, 60, 20, C.night2);
    for (let k = 0; k < 6; k++) pc.rect(276 + k * 9, 118, 4, 3, C.lamp);
    pc.rect(312, 90, 2, 22, C.night2);
    pc.rect(314, 90, 12, 7, C.uni);
    pc.px(318, 93, C.gold);
    return pc;
}

// ================================================================ PALACE

function palaceSky() {
    const pc = new PixelCanvas(SKY_W, SKY_H);
    bands(pc, [C.ink, C.palaceWallShade, C.palaceWall], 0, 216);
    return pc;
}

function palaceFar() {
    const pc = new PixelCanvas(FAR_W, SKY_H);
    // arches and giant portraits of one man
    for (let x = 0; x < FAR_W; x += 128) {
        pc.rect(x + 8, 40, 112, 150, C.palaceWallShade);
        pc.ellipse(x + 64, 40, 56, 26, C.palaceWallShade);
        pc.rect(x + 34, 54, 60, 74, C.goldShade);
        pc.rect(x + 37, 57, 54, 68, C.palaceWallLight);
        // the portrait
        pc.ellipse(x + 64, 86, 15, 17, C.skinShade);
        pc.rect(x + 54, 82, 20, 4, C.inkSoft);
        pc.poly([[x + 52, 93], [x + 76, 93], [x + 80, 98], [x + 48, 98]], C.inkSoft);
        pc.rect(x + 48, 103, 32, 22, C.uniShade);
        pc.poly([[x + 56, 70], [x + 72, 70], [x + 72, 64], [x + 68, 67], [x + 64, 62], [x + 60, 67], [x + 56, 64]], C.goldShade);
        // banners
        pc.rect(x + 2, 30, 10, 60, C.crimsonShade);
        pc.poly([[x + 2, 90], [x + 12, 90], [x + 7, 96]], C.crimsonShade);
        pc.circle(x + 7, 50, 3, C.goldShade);
    }
    return pc;
}

function palaceMid() {
    const pc = new PixelCanvas(MID_W, SKY_H);
    for (let x = 0; x < MID_W; x += 96) {
        // a marble column
        pc.rect(x + 20, 20, 16, 160, C.marbleDark);
        for (let k = 0; k < 4; k++) pc.rect(x + 22 + k * 4, 24, 1, 152, C.palaceWallLight);
        pc.rect(x + 16, 16, 24, 6, C.marbleShade);
        pc.rect(x + 16, 176, 24, 6, C.marbleShade);
        // a chandelier between columns
        const cx = x + 74;
        pc.rect(cx, 0, 1, 26, C.goldShade);
        pc.ellipse(cx, 30, 14, 4, C.goldShade);
        for (let k = -2; k <= 2; k++) {
            pc.rect(cx + k * 6, 22, 2, 6, C.marble);
            pc.px(cx + k * 6, 21, C.fireYellow);
        }
        for (let k = -3; k <= 3; k++) pc.px(cx + k * 4, 35 + Math.abs(k), C.glass);
    }
    return pc;
}

// ================================================================ STREET LEVEL

/**
 * Paints the street at full scroll speed for one theme, chunk by chunk, in
 * world coordinates. Buildings come from a seeded list so chunk borders
 * always match.
 */
export class StreetPainter {
    #theme;
    #terrain;
    #level;
    #blocks = [];

    constructor(theme, level, terrain) {
        this.#theme = theme;
        this.#level = level;
        this.#terrain = terrain;
        let x = -40;
        let i = 0;
        while (x < level.length + 400) {
            const w = 64 + Math.floor(hash2(i, 77, level.id) * 70);
            this.#blocks.push({ x, w, i, h: 70 + Math.floor(hash2(i, 78, level.id) * 50) });
            x += w;
            i++;
        }
    }

    /** @param {PixelCanvas} pc  @param {number} x0 world x of the chunk */
    paint(pc, x0) {
        const x1 = x0 + pc.w;
        for (const b of this.#blocks) {
            if (b.x + b.w < x0 - 8 || b.x > x1 + 8) continue;
            if (this.#theme === 'town') this.#townHouse(pc, b, x0);
            else if (this.#theme === 'harbor') this.#warehouse(pc, b, x0);
            else this.#hall(pc, b, x0);
        }
        recede(pc, RECEDE[this.#theme]);
        this.#ground(pc, x0);
        for (const p of this.#level.platforms ?? []) {
            if (p.x + p.w < x0 - 4 || p.x > x1 + 4) continue;
            this.#platform(pc, p, x0);
        }
    }

    // ---- town

    #townHouse(pc, b, x0) {
        const x = b.x - x0;
        const ground = 184;
        const top = ground - b.h;
        const palette = [[C.plaster, C.plasterShade], [C.plasterB, C.plasterBShade], [C.plasterC, C.plasterCShade]][b.i % 3];
        // walls kept slightly dark: they sit behind the action
        pc.rect(x, top, b.w, b.h + 32, palette[1]);
        pc.rect(x + 2, top + 2, b.w - 4, b.h, palette[0]);
        pc.dither(x + 2, top + b.h - 20, b.w - 4, 20, palette[0], palette[1]);
        pc.rect(x - 2, top - 4, b.w + 4, 5, C.terracotta);
        pc.rect(x - 2, top, b.w + 4, 1, C.terracottaShade);
        for (let k = 0; k < b.w; k += 4) pc.px(x + k, top - 4, C.terracottaShade);
        // windows with green shutters
        for (let wy = top + 10; wy < ground - 40; wy += 26) {
            for (let wx = x + 10; wx < x + b.w - 18; wx += 22) {
                const open = hash2(wx + x0, wy) < 0.5;
                pc.rect(wx, wy, 10, 14, C.windowDark);
                pc.rect(wx + 1, wy + 1, 8, 6, C.inkSoft);
                if (open) {
                    pc.rect(wx - 4, wy, 4, 14, C.shutter);
                    pc.rect(wx + 10, wy, 4, 14, C.shutter);
                    for (let s = 2; s < 14; s += 3) {
                        pc.px(wx - 3, wy + s, C.shutterShade);
                        pc.px(wx + 12, wy + s, C.shutterShade);
                    }
                } else {
                    pc.rect(wx, wy, 10, 14, C.shutter);
                    pc.line(wx + 5, wy, wx + 5, wy + 13, C.shutterShade);
                }
                pc.rect(wx - 1, wy + 14, 12, 2, palette[1]);
                if (hash2(wx, wy, 3) < 0.4) {
                    // geraniums
                    pc.rect(wx, wy + 12, 10, 2, C.terracotta);
                    for (let f = 0; f < 4; f++) pc.px(wx + 1 + f * 3, wy + 11, f % 2 ? C.clownRed : C.leaf);
                }
            }
        }
        // ground floor: a door, a shop, or the trattoria
        const kind = b.i % 4;
        const dx = x + Math.floor(b.w / 2) - 8;
        if (kind === 0) {
            // shop with a striped awning
            pc.rect(x + 8, ground - 30, b.w - 16, 30, C.windowDark);
            for (let k = 0; k < b.w - 12; k += 6) pc.rect(x + 6 + k, ground - 38, 3, 8, k % 12 ? C.white : C.bandana);
            pc.rect(x + 6, ground - 38, b.w - 12, 1, C.bandanaShade);
            for (let k = 0; k < 3; k++) pc.circle(x + 16 + k * 10, ground - 22, 3, C.lemon);
        } else {
            pc.rect(dx, ground - 26, 16, 26, C.woodDark);
            pc.rect(dx + 2, ground - 24, 5, 24, C.wood);
            pc.rect(dx + 9, ground - 24, 5, 24, C.wood);
            pc.ellipse(dx + 8, ground - 26, 8, 4, C.woodDark);
            if (kind === 2) {
                // a poster of the Supremo, half torn
                pc.rect(x + 6, ground - 44, 14, 18, C.uni);
                pc.circle(x + 13, ground - 38, 4, C.skinShade);
                pc.rect(x + 9, ground - 37, 9, 1, C.inkSoft);
                pc.poly([[x + 14, ground - 32], [x + 20, ground - 30], [x + 20, ground - 26], [x + 12, ground - 26]], palette[0]);
            }
        }
        // bunting to the next house
        if (b.i % 2 === 0) {
            for (let k = 0; k < b.w; k += 6) {
                const sag = Math.round(Math.sin((k / b.w) * Math.PI) * 6);
                pc.px(x + k, top + 18 + sag, C.inkSoft);
                pc.poly([[x + k, top + 19 + sag], [x + k + 4, top + 19 + sag], [x + k + 2, top + 23 + sag]], PARTY[(k / 6) % 5]);
            }
        } else {
            // laundry line
            for (let k = 0; k < b.w; k++) pc.px(x + k, top + 24 + Math.round(Math.sin((k / b.w) * Math.PI) * 4), C.inkSoft);
            for (let k = 8; k < b.w - 8; k += 14) {
                const y = top + 26 + Math.round(Math.sin((k / b.w) * Math.PI) * 4);
                pc.rect(x + k, y, 7, 8, hash2(k, b.i) < 0.5 ? C.white : C.cyan);
                pc.rect(x + k, y, 7, 1, C.inkSoft);
            }
        }
    }

    // ---- harbour

    #warehouse(pc, b, x0) {
        const x = b.x - x0;
        const ground = 184;
        const top = ground - b.h + 10;
        pc.rect(x, top, b.w, b.h + 30, C.concreteShade);
        for (let k = 0; k < b.w; k += 4) pc.rect(x + k, top + 4, 1, b.h, C.night2);
        pc.poly([[x - 2, top], [x + b.w / 2, top - 14], [x + b.w + 2, top]], C.night2);
        // big sliding door and a number
        if (b.i % 2 === 0) {
            pc.rect(x + 10, ground - 50, b.w - 20, 50, C.night1);
            for (let k = 0; k < b.w - 20; k += 6) pc.rect(x + 10 + k, ground - 50, 1, 50, C.night2);
            pc.rect(x + 12, top + 10, 12, 10, C.contYellowShade);
            pc.rect(x + 15, top + 12, 2, 6, C.night1);
            pc.rect(x + 19, top + 12, 2, 6, C.night1);
        } else {
            // stacked containers in front of the wall
            const colors = [[C.contRed, C.contRedShade], [C.contBlue, C.contBlueShade], [C.contGreen, C.contGreenShade], [C.contYellow, C.contYellowShade]];
            for (let s = 0; s < 2; s++) {
                const [c, sh] = colors[(b.i + s) % 4];
                const cy = ground - 24 * (s + 1);
                pc.rect(x + 4, cy, b.w - 8, 24, sh);
                for (let k = 0; k < b.w - 8; k += 3) pc.rect(x + 4 + k, cy + 2, 1, 20, c);
            }
        }
        // a lamp post with a pool of light (dithered, no glow)
        if (b.i % 3 === 1) {
            const lx = x + b.w - 6;
            pc.rect(lx, ground - 70, 2, 70, C.night1);
            pc.rect(lx - 6, ground - 72, 8, 3, C.night1);
            pc.rect(lx - 6, ground - 69, 5, 2, C.lamp);
            for (let y = ground - 66; y < ground; y++) {
                const half = (y - (ground - 66)) * 0.35;
                for (let k = -half; k <= half; k++) if (((k | 0) + y) % 3 === 0) pc.px(lx - 4 + k, y, C.concrete);
            }
        }
    }

    // ---- palace

    #hall(pc, b, x0) {
        const x = b.x - x0;
        const ground = 184;
        pc.rect(x, 60, b.w, 130, C.palaceWall);
        pc.rect(x, 150, b.w, 34, C.palaceWallShade);
        pc.rect(x, 148, b.w, 3, C.goldShade);
        for (let k = 4; k < b.w; k += 16) pc.rect(x + k, 156, 10, 22, C.palaceWallLight);
        // curtains
        pc.rect(x, 60, 10, 110, C.crimson);
        for (let k = 0; k < 110; k += 4) pc.px(x + 3, 60 + k, C.crimsonShade);
        pc.ellipse(x + 5, 120, 6, 3, C.gold);
        // a bust of the Supremo on a pedestal, or a mirror
        if (b.i % 2 === 0) {
            const sx = x + Math.floor(b.w / 2);
            pc.rect(sx - 6, ground - 30, 12, 30, C.marble);
            pc.rect(sx - 8, ground - 32, 16, 3, C.marbleShade);
            pc.ellipse(sx, ground - 42, 7, 9, C.gold);
            pc.rect(sx - 4, ground - 44, 9, 2, C.goldShade);
            pc.rect(sx - 4, ground - 39, 8, 2, C.goldShade);
        } else {
            const mx = x + Math.floor(b.w / 2) - 14;
            pc.rect(mx, 80, 28, 50, C.gold);
            pc.rect(mx + 3, 83, 22, 44, C.palaceWallLight);
            pc.line(mx + 6, 88, mx + 12, 100, C.marble);
        }
    }

    // ---- ground for every theme

    #ground(pc, x0) {
        const t = this.#terrain;
        for (let sx = 0; sx < pc.w; sx++) {
            const wx = x0 + sx;
            const gy = Math.round(t.groundY(wx));
            for (let y = gy; y < pc.h; y++) {
                pc.px(sx, y, this.#groundColor(wx, y, y - gy));
            }
        }
    }

    #groundColor(wx, y, depth) {
        switch (this.#theme) {
            case 'town': {
                if (depth === 0) return C.stoneDark;
                if (depth < 3) return C.stone;
                // cobbles: staggered rows of rounded stones
                const row = Math.floor((y - depth + depth) / 5);
                const off = row % 2 ? 4 : 0;
                const cx = (wx + off) % 8;
                const cy = y % 5;
                if (cx === 0 || cy === 0) return C.stoneDark;
                if (cx === 1 && cy === 1) return C.plaster;
                return hash2(Math.floor((wx + off) / 8), row) < 0.5 ? C.stone : C.stoneShade;
            }
            case 'harbor': {
                if (depth === 0) return C.dockLight;
                const plank = Math.floor(wx / 3);
                if (depth % 8 === 0) return C.dockShade;
                if (wx % 24 === 0 && depth < 14) return C.night1;
                return hash2(plank, Math.floor(depth / 8)) < 0.3 ? C.dockShade : C.dock;
            }
            default: {
                if (depth === 0) return C.goldShade;
                if (depth < 3) return C.gold;
                // checkerboard marble with a red carpet runner
                if (depth >= 6 && depth < 14) return depth === 6 || depth === 13 ? C.goldShade : C.crimson;
                const check = (Math.floor(wx / 8) + Math.floor(y / 6)) % 2;
                return check ? C.checkA : C.checkB;
            }
        }
    }

    #platform(pc, p, x0) {
        const x = p.x - x0;
        const ground = Math.round(this.#terrain.groundY(p.x + p.w / 2));
        switch (this.#theme) {
            case 'town':
                if (p.y < 146) {
                    // balcony: slab, railing with flower pots, brackets
                    pc.rect(x - 2, p.y, p.w + 4, 4, C.stoneShade);
                    pc.rect(x - 2, p.y, p.w + 4, 1, C.stone);
                    for (let k = 0; k < p.w; k += 4) pc.rect(x + k, p.y - 9, 1, 9, C.ink);
                    pc.rect(x - 1, p.y - 10, p.w + 2, 1, C.ink);
                    pc.poly([[x + 2, p.y + 4], [x + 8, p.y + 4], [x + 2, p.y + 10]], C.stoneDark);
                    pc.poly([[x + p.w - 2, p.y + 4], [x + p.w - 8, p.y + 4], [x + p.w - 2, p.y + 10]], C.stoneDark);
                } else {
                    // market awning on poles
                    for (let k = 0; k < p.w; k += 6) pc.rect(x + k, p.y, 3, 5, k % 12 ? C.white : C.bandana);
                    pc.rect(x, p.y, p.w, 1, C.bandanaShade);
                    pc.rect(x + 1, p.y + 5, 2, ground - p.y - 5, C.woodDark);
                    pc.rect(x + p.w - 3, p.y + 5, 2, ground - p.y - 5, C.woodDark);
                    pc.rect(x + 4, ground - 10, p.w - 8, 10, C.wood);
                    for (let k = 0; k < p.w - 10; k += 5) pc.circle(x + 7 + k, ground - 12, 2, k % 10 ? C.lemon : C.fireOrange);
                }
                break;
            case 'harbor':
                // a container: solid looking, you stand on top
                pc.rect(x, p.y, p.w, 3, C.contRed);
                pc.rect(x, p.y, p.w, 1, C.clownRed);
                pc.rect(x, p.y + 3, p.w, Math.min(22, ground - p.y - 3), C.contRedShade);
                for (let k = 2; k < p.w; k += 3) pc.rect(x + k, p.y + 4, 1, Math.min(20, ground - p.y - 4), C.contRed);
                if (ground - p.y > 26) {
                    // scaffold legs below
                    pc.rect(x + 2, p.y + 25, 2, ground - p.y - 25, C.metalDark);
                    pc.rect(x + p.w - 4, p.y + 25, 2, ground - p.y - 25, C.metalDark);
                    for (let y = p.y + 27; y < ground - 4; y += 10) pc.line(x + 3, y, x + p.w - 3, y + 8, C.metalDark);
                }
                break;
            default:
                // gallery: marble ledge, gold railing, a slim column under it
                pc.rect(x - 2, p.y, p.w + 4, 5, C.marbleShade);
                pc.rect(x - 2, p.y, p.w + 4, 1, C.marble);
                for (let k = 0; k < p.w; k += 5) {
                    pc.rect(x + k, p.y - 8, 2, 8, C.gold);
                    pc.px(x + k, p.y - 8, C.goldLight);
                }
                pc.rect(x - 1, p.y - 9, p.w + 2, 2, C.goldShade);
                pc.rect(x + p.w / 2 - 3, p.y + 5, 6, ground - p.y - 5, C.marbleDark);
                pc.rect(x + p.w / 2 - 1, p.y + 5, 1, ground - p.y - 5, C.marbleShade);
                break;
        }
    }
}

/** How much each theme's facades are pushed back: [r, g, b] multipliers. */
const RECEDE = { town: [0.78, 0.74, 0.86], harbor: [0.9, 0.9, 0.95], palace: [0.82, 0.8, 0.88] };

/** Darken and cool everything painted so far: the walls step behind the actors. */
function recede(pc, [kr, kg, kb]) {
    const d = pc.data;
    for (let i = 0; i < d.length; i++) {
        const v = d[i];
        if (!v) continue;
        const r = (v & 0xff) * kr;
        const g = ((v >>> 8) & 0xff) * kg;
        const b = ((v >>> 16) & 0xff) * kb;
        d[i] = (0xff << 24 | (b & 0xff) << 16 | (g & 0xff) << 8 | (r & 0xff)) >>> 0;
    }
}

const THEMES = {
    town: { sky: townSky, far: townFar, mid: townMid },
    harbor: { sky: harborSky, far: harborFar, mid: harborMid },
    palace: { sky: palaceSky, far: palaceFar, mid: palaceMid },
};

/** @returns {{sky: PixelCanvas, far: PixelCanvas, mid: PixelCanvas}} */
export function paintBackdrop(theme) {
    const t = THEMES[theme];
    return { sky: t.sky(), far: t.far(), mid: t.mid() };
}
