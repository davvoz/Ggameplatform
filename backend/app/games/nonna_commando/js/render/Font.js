import { C } from '../config/Palette.js';
import { PixelCanvas } from './PixelCanvas.js';

/**
 * The game's own 5x7 pixel typeface. Glyphs are drawn here as text, baked
 * once per colour with a dark outline, then blitted. Chunky, readable over
 * any background, and the same on every device.
 */
const GLYPHS = {
    A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
    C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
    D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
    E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
    F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
    G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
    H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
    J: ['..###', '...#.', '...#.', '...#.', '#..#.', '#..#.', '.##..'],
    K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
    L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
    M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
    N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
    O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
    Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
    R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
    S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
    T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
    U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
    W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
    X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
    Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
    Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
    0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
    1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
    2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
    3: ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
    4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
    5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
    6: ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
    7: ['#####', '....#', '...#.', '..#..', '..#..', '..#..', '..#..'],
    8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
    9: ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
    ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
    '.': ['.', '.', '.', '.', '.', '.', '#'],
    ',': ['..', '..', '..', '..', '..', '.#', '#.'],
    '!': ['#', '#', '#', '#', '#', '.', '#'],
    '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
    ':': ['.', '#', '.', '.', '.', '#', '.'],
    '-': ['....', '....', '....', '####', '....', '....', '....'],
    '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
    '%': ['##..#', '##..#', '...#.', '..#..', '.#...', '#..##', '#..##'],
    '/': ['....#', '...#.', '...#.', '..#..', '.#...', '.#...', '#....'],
    "'": ['#', '#', '.', '.', '.', '.', '.'],
    '(': ['.#', '#.', '#.', '#.', '#.', '#.', '.#'],
    ')': ['#.', '.#', '.#', '.#', '.#', '.#', '#.'],
    '=': ['....', '....', '####', '....', '####', '....', '....'],
    '>': ['#...', '.#..', '..#.', '...#', '..#.', '.#..', '#...'],
    '<': ['...#', '..#.', '.#..', '#...', '.#..', '..#.', '...#'],
    '*': ['.....', '#.#.#', '.###.', '#####', '.###.', '#.#.#', '.....'],
    '#': ['.#.#.', '#####', '.#.#.', '.#.#.', '.#.#.', '#####', '.#.#.'],
    '&': ['.##..', '#..#.', '.##..', '.#...', '#.#.#', '#..#.', '.##.#'],
    '"': ['#.#', '#.#', '...', '...', '...', '...', '...'],
};

const HEIGHT = 7;
const SPACING = 1;
const PAD = 1;

const ROW = HEIGHT + PAD * 2;

export class Font {
    /** key -> {canvas, y}: where the glyphs of a colour are */
    #sheets = new Map();
    #index = new Map();
    #sheetW = 0;

    /**
     * Every palette colour, with and without the outline, is baked into one
     * atlas up front: a single texture that stays on the GPU, instead of a
     * small canvas uploaded the first time each colour shows up mid-fight.
     */
    constructor(colors = Object.values(C)) {
        let x = PAD;
        for (const [ch, rows] of Object.entries(GLYPHS)) {
            const w = rows[0].length;
            this.#index.set(ch, { x, w, rows });
            x += w + PAD * 2 + 1;
        }
        this.#sheetW = x;
        const keys = [...new Set(colors)].flatMap((c) => [[c, C.ink], [c, null]]);
        const atlas = new PixelCanvas(this.#sheetW, ROW * keys.length);
        const canvases = [];
        keys.forEach(([color, outline], i) => {
            const pc = this.#paint(color, outline);
            atlas.stamp(pc, 0, i * ROW);
            canvases.push([color, outline, i * ROW]);
        });
        const canvas = atlas.toCanvas();
        for (const [color, outline, y] of canvases) this.#sheets.set(`${color}|${outline}`, { canvas, y });
    }

    /** Width in pixels of a string at scale 1. */
    measure(text) {
        let w = 0;
        for (const ch of text) w += (this.#index.get(ch)?.w ?? 3) + SPACING;
        return Math.max(0, w - SPACING);
    }

    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} text uppercase
     * @param {number} x
     * @param {number} y top
     * @param {{color?: string, outline?: string|null, align?: 'left'|'center'|'right', scale?: number}} [style]
     */
    draw(ctx, text, x, y, { color = C.white, outline = C.ink, align = 'left', scale = 1 } = {}) {
        const { canvas: sheet, y: sy } = this.#sheet(color, outline);
        const width = this.measure(text) * scale;
        let cx = Math.round(align === 'center' ? x - width / 2 : align === 'right' ? x - width : x);
        const cy = Math.round(y);
        for (const ch of text) {
            const g = this.#index.get(ch);
            if (!g) {
                cx += 4 * scale;
                continue;
            }
            ctx.drawImage(sheet, g.x - PAD, sy, g.w + PAD * 2, ROW,
                cx - PAD * scale, cy - PAD * scale, (g.w + PAD * 2) * scale, (HEIGHT + PAD * 2) * scale);
            cx += (g.w + SPACING) * scale;
        }
        return width;
    }

    #sheet(color, outline) {
        const key = `${color}|${outline}`;
        let sheet = this.#sheets.get(key);
        if (!sheet) {
            // a colour outside the palette: its own small canvas
            sheet = { canvas: this.#paint(color, outline).toCanvas(), y: 0 };
            this.#sheets.set(key, sheet);
        }
        return sheet;
    }

    #paint(color, outline) {
        const pc = new PixelCanvas(this.#sheetW, ROW);
        for (const g of this.#index.values()) {
            g.rows.forEach((row, j) => {
                for (let i = 0; i < row.length; i++) if (row[i] === '#') pc.px(g.x + i, PAD + j, color);
            });
        }
        if (outline) pc.outline(outline, true);
        return pc;
    }
}

export const LINE_HEIGHT = HEIGHT + 3;
