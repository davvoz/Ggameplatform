import { makeCanvas } from '../canvas.js';
import { drawText, LINE, textWidth } from '../PixelFont.js';

/**
 * The weekly challenge's boards (config/Props.js CHALLENGE_ADS): wide boards
 * with a text, the square one with the cur8 logo (the platform's own: a
 * ring open on the right around a dot, green at the top to red at the
 * bottom), the giant one with the logo beside the name, the banner over
 * the road, and the frame of an avatar board (the avatar itself comes from
 * Steem during the race: RaceView draws it in the frame's `AVATAR` square).
 * Painted once, the same in every world, at the size they have next to the
 * player's car, like the other props.
 */
const INK = '#0e0a1c';
const BOARD = '#1c1640';
const LEGS = '#3a3650';
const CREAM = '#f2eef6';
const GOLD = '#ffd34a';
/** The logo's colours from top to bottom, in bands as pixel art has them. */
const LOGO = ['#5fd3b0', '#9ed67a', '#d8d24a', '#f7c331', '#f5a02c', '#ec6c2c', '#e2402c'];
const DOT = ['#f7c331', '#f5a02c', '#ef8a2a'];
/** The logo's proportions, as on the platform's icon: ring and dot radii (outer = 1), and the opening's half angle. */
const RING = { inner: 0.58, dot: 0.3, opening: 0.62 };
const WORD = { width: 200, height: 112, board: 72, scale: 4 };
const GIANT = { width: 380, height: 196, board: 146, logo: 120, scale: 8, gap: 16 };
const SQUARE = { width: 170, height: 210, board: 170, logo: 136 };
/** The avatar board, square: where the portrait goes in it. */
export const AVATAR = { x: 25, y: 25, size: 190 };
const AVATAR_BOARD = { width: 240, height: 288, board: 240 };
/** The banner over the road: its posts stand off the road (the road's half width is about 100 of these pixels), its face above the cars. */
const BANNER = { width: 460, height: 176, face: 52, post: 10, scale: 3, logo: 40 };

/** The colour band of a row, `share` 0 (top) to 1 (bottom). */
const band = (colors, share) => colors[Math.min(colors.length - 1, Math.floor(share * colors.length))];

/** The cur8 logo, `size` pixels across, with its top left at (x, y). */
export function paintLogo(ctx, x, y, size) {
    const radius = size / 2;
    for (let row = 0; row < size; row++) {
        for (let column = 0; column < size; column++) {
            const dx = column + 0.5 - radius;
            const dy = row + 0.5 - radius;
            const r = Math.hypot(dx, dy) / radius;
            const open = dx > 0 && Math.abs(Math.atan2(dy, dx)) < RING.opening;
            let color = null;
            if (r < RING.dot) color = band(DOT, (dy / radius / RING.dot + 1) / 2);
            else if (r >= RING.inner && r <= 1 && !open) color = band(LOGO, row / size);
            if (!color) continue;
            ctx.fillStyle = color;
            ctx.fillRect(x + column, y + row, 1, 1);
        }
    }
}

/** A board on two legs, edged in the logo's colours along its top. */
function board(width, height, face) {
    const { canvas, ctx } = makeCanvas(width, height);
    ctx.fillStyle = LEGS;
    for (const leg of [0.18, 0.78]) ctx.fillRect(Math.round(width * leg), face - 4, 5, height - face + 4);
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, width, face);
    ctx.fillStyle = BOARD;
    ctx.fillRect(2, 2, width - 4, face - 4);
    LOGO.forEach((color, i) => {
        ctx.fillStyle = color;
        ctx.fillRect(Math.round((i * width) / LOGO.length), 0, Math.ceil(width / LOGO.length), 3);
    });
    return { canvas, ctx };
}

/** A text, as big as fits (the platform's name in gold). */
function textBoard(text) {
    const { canvas, ctx } = board(WORD.width, WORD.height, WORD.board);
    let scale = WORD.scale;
    while (scale > 1 && textWidth(text, scale) > WORD.width - 14) scale -= 1;
    const x = Math.round((WORD.width - textWidth(text, scale)) / 2);
    const top = Math.round((WORD.board - LINE * scale) / 2) + 1;
    drawText(ctx, text, x, top, { color: text.includes('CUR8') ? GOLD : CREAM, outline: INK, scale });
    return canvas;
}

/** The square board: the logo alone. */
function logoBoard() {
    const { canvas, ctx } = board(SQUARE.width, SQUARE.height, SQUARE.board);
    const margin = Math.round((SQUARE.width - SQUARE.logo) / 2);
    paintLogo(ctx, margin, margin + 1, SQUARE.logo);
    return canvas;
}

/** An avatar board without the avatar: only a dark square where it goes (RaceView draws it there). */
function avatarBoard() {
    const { canvas, ctx } = board(AVATAR_BOARD.width, AVATAR_BOARD.height, AVATAR_BOARD.board);
    ctx.fillStyle = INK;
    ctx.fillRect(AVATAR.x - 2, AVATAR.y - 2, AVATAR.size + 4, AVATAR.size + 4);
    return canvas;
}

/** The banner over the road: CUR8 WEEKLY CHALLENGE beside the logo, chequered edges, on two posts. */
function bannerBoard() {
    const { canvas, ctx } = makeCanvas(BANNER.width, BANNER.height);
    ctx.fillStyle = LEGS;
    for (const x of [0, BANNER.width - BANNER.post]) ctx.fillRect(x, 0, BANNER.post, BANNER.height);
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, BANNER.width, BANNER.face);
    ctx.fillStyle = BOARD;
    ctx.fillRect(2, 5, BANNER.width - 4, BANNER.face - 10);
    for (let x = 0; x < BANNER.width; x += 4) {
        for (const y of [0, BANNER.face - 4]) {
            ctx.fillStyle = (x / 4 + y) % 2 === 0 ? CREAM : INK;
            ctx.fillRect(x, y + 1, 4, 3);
        }
    }
    const name = 'CUR8 ';
    const rest = 'WEEKLY CHALLENGE';
    const textLeft = BANNER.logo + 8;
    const total = textLeft + textWidth(name + rest, BANNER.scale);
    const left = Math.round((BANNER.width - total) / 2);
    const middle = Math.round(BANNER.face / 2);
    paintLogo(ctx, left, middle - BANNER.logo / 2, BANNER.logo);
    const top = middle - Math.round((LINE * BANNER.scale) / 2);
    drawText(ctx, name, left + textLeft, top, { color: GOLD, outline: INK, scale: BANNER.scale });
    drawText(ctx, rest, left + textLeft + textWidth(name, BANNER.scale) + BANNER.scale, top, { color: CREAM, outline: INK, scale: BANNER.scale });
    return canvas;
}

/** The giant board: the logo beside the name. */
function giantBoard() {
    const { canvas, ctx } = board(GIANT.width, GIANT.height, GIANT.board);
    const name = textWidth('CUR8', GIANT.scale);
    const left = Math.round((GIANT.width - (GIANT.logo + GIANT.gap + name)) / 2);
    paintLogo(ctx, left, Math.round((GIANT.board - GIANT.logo) / 2) + 1, GIANT.logo);
    const nameTop = Math.round((GIANT.board - LINE * GIANT.scale) / 2) + 1;
    drawText(ctx, 'CUR8', left + GIANT.logo + GIANT.gap, nameTop, { color: CREAM, outline: INK, scale: GIANT.scale });
    return canvas;
}

/** Every text a wide board shows. */
function textsOf(ads) {
    return [...ads.finish.words, ...ads.along.boards.flatMap((board) => (board.text ? [board.text] : []))];
}

/**
 * Every board, by the look the road draws it with (a prop's `look`).
 * @param {typeof import('../../config/Props.js').CHALLENGE_ADS} ads
 */
export function paintAds(ads) {
    return {
        ...Object.fromEntries(textsOf(ads).map((text) => [`ad:${text}`, textBoard(text)])),
        adLogo: giantBoard(),
        adCur8: logoBoard(),
        adAvatar: avatarBoard(),
        adBanner: bannerBoard(),
    };
}
