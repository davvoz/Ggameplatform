import { paintGrid } from './pixels.js';
import { paintCloud } from './StormArt.js';

/**
 * One 48 x 48 pixel icon per power. Some reuse the gifts' icons (heart,
 * bolt, star) and the storm cloud; the rest are drawn here. 0 = empty,
 * 1 = outline, 2 = shade, 3 = body, 4 = light, 5 = shine.
 */
const PX = 3;

export const ART = Object.freeze({
    shield: {
        grid: [
            '0011111111111100', '0144444444444410', '0145333333333410', '0143333333333410',
            '0143333333333410', '0143333333333410', '0143333333333410', '0123333333333210',
            '0123333333333210', '0012333333332100', '0012333333332100', '0001233333321000',
            '0000123333210000', '0000012332100000', '0000001221000000', '0000000110000000',
        ],
        colors: ['#0b2a4a', '#2a6fb0', '#5cc4ff', '#bdeeff', '#ffffff'],
    },
    crystal: {
        grid: [
            '0000000110000000', '0000001541000000', '0000015443100000', '0000154433310000',
            '0001544333331000', '0015443333333100', '0154433333333310', '1544333333333331',
            '1233333333333321', '0123333333333210', '0012333333332100', '0001233333321000',
            '0000123333210000', '0000012332100000', '0000001221000000', '0000000110000000',
        ],
        colors: ['#3a1020', '#c0501c', '#ff8a3c', '#ffc070', '#fff0d0'],
    },
    thorn: {
        grid: [
            '0000000100000000', '0000001310000000', '0001001310010000', '0013101331013100',
            '0001312332131000', '0000123333210000', '0111233443321110', '1333334554333331',
            '0111233443321110', '0000123333210000', '0001312332131000', '0013101331013100',
            '0001001310010000', '0000001310000000', '0000000100000000', '0000000000000000',
        ],
        colors: ['#10240e', '#2f6a20', '#5fae3a', '#a8e070', '#e8ffd0'],
    },
    drop: {
        grid: [
            '0000000110000000', '0000001441000000', '0000014431000000', '0000014331000000',
            '0000143333100000', '0001433333310000', '0014333333331000', '0014333333331000',
            '0143333333333100', '0143333333333100', '0143533333333100', '0145533333332100',
            '0014533333321000', '0001233333210000', '0000122222100000', '0000011111000000',
        ],
        colors: ['#3a0008', '#8a0a1e', '#d01c3a', '#ff6a7a', '#ffd0d8'],
    },
    eye: {
        grid: [
            '0000000000000000', '0000000000000000', '0000011111100000', '0001144444411000',
            '0014433333344100', '0143331111333410', '1433314451333341', '1333315551333331',
            '1433314441333341', '0143331111333410', '0014433333344100', '0001144444411000',
            '0000011111100000', '0000000000000000', '0000000000000000', '0000000000000000',
        ],
        colors: ['#1a1030', '#5a3a8a', '#e8e0ff', '#ffffff', '#ff4d6d'],
    },
});

/** Which picture each power wears, and whether it gets the "faster" arrows. */
const LOOKS = Object.freeze({
    hearts: { gift: 'heart' },
    twin: { gift: 'chain' },
    longShield: { art: 'shield' },
    quickShield: { art: 'shield', fast: true },
    stormCaller: { cloud: true, fast: true },
    crystal: { art: 'crystal' },
    quickCrystals: { art: 'crystal', fast: true },
    thorns: { art: 'thorn' },
    vampire: { art: 'drop' },
    lucky: { gift: 'nova' },
    sharpEye: { art: 'eye' },
});

/** Two white chevrons (>>) on a dark patch in the corner: "faster". */
function fastMark(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1a0a2e';
    ctx.fillRect(26, 30, 22, 18);
    ctx.fillStyle = '#ffffff';
    for (const left of [28, 37]) {
        for (const [dx, dy] of [[0, 0], [2, 2], [4, 4], [6, 6], [4, 8], [2, 10], [0, 12]]) ctx.fillRect(left + dx, 32 + dy, 3, 2);
    }
}

function copy(source) {
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    canvas.getContext('2d').drawImage(source, 0, 0);
    return canvas;
}

function picture(look, giftIcons) {
    if (look.gift) return copy(giftIcons[look.gift]);
    if (look.cloud) return paintCloud();
    return paintGrid(ART[look.art], PX);
}

/**
 * @param {Record<string, HTMLCanvasElement>} giftIcons the gifts' icons (`paintPickups`)
 * @returns {Record<string, HTMLCanvasElement>} one icon per power
 */
export function paintBoons(giftIcons) {
    return Object.fromEntries(Object.entries(LOOKS).map(([id, look]) => {
        const canvas = picture(look, giftIcons);
        if (look.fast) fastMark(canvas);
        return [id, canvas];
    }));
}
