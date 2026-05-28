import { GameConfig, RED_NUMBERS } from '../config/GameConfig.js';

const L = GameConfig.LAYOUT;
const C = GameConfig.COLOR;

/**
 * Computes hit boxes for every bet cell ONCE on construction.
 * Exposed via getCells() to TableRenderer (for drawing) and BettingState
 * (for click hit-test). Pure data — no canvas access here.
 *
 * Cell shape: { id, label, x, y, w, h, typeId, numbers?, color, betDef }
 *   typeId: bet id from bets.json
 *   numbers: array of numbers covered (for inside bets) — null for outside
 */
export class TableLayout {
    constructor(dataRegistry) {
        this._data = dataRegistry;
        this._cells = [];
        this._numberCells = new Map();   // n → cell (for VFX highlighting)
        this._build();
    }

    getCells() { return this._cells; }
    getNumberCell(n) { return this._numberCells.get(n); }

    hitTest(x, y) {
        // Numbers are reverse-iterated last (highest priority for inside bets)
        for (let i = this._cells.length - 1; i >= 0; i--) {
            const c = this._cells[i];
            if (x >= c.x && x < c.x + c.w && y >= c.y && y < c.y + c.h) return c;
        }
        return null;
    }

    _build() {
        const top   = L.TABLE_TOP;
        const left  = L.TABLE_LEFT;
        const right = L.TABLE_RIGHT;
        const innerW = right - left - L.ZERO_W - L.COLUMN_W;   // numbers grid width
        const cellW = Math.floor(innerW / 12);
        const numbersLeft = left + L.ZERO_W;
        const cellH = L.CELL_H;

        // Zero cell (spans 3 rows on the left).
        this._addCell({
            id: 'cell_0', label: '0', typeId: 'straight', numbers: [0],
            x: left, y: top, w: L.ZERO_W, h: cellH * 3,
            color: C.GREEN, numberValue: 0
        });
        //prefer .at(...) over [...length - index]
        this._numberCells.set(0, this._cells.at(-1));

        // Numbers grid 1..36 (12 cols x 3 rows). Top row = column 3.
        for (let r = 0; r < 3; r++) {
            for (let col = 0; col < 12; col++) {
                const n = (col * 3) + (3 - r);
                const color = RED_NUMBERS.has(n) ? C.RED : C.BLACK;
                const x = numbersLeft + col * cellW;
                const y = top + r * cellH;
                const cell = {
                    id: `cell_${n}`, label: String(n), typeId: 'straight',
                    numbers: [n], x, y, w: cellW, h: cellH,
                    color, numberValue: n
                };
                this._addCell(cell);
                this._numberCells.set(n, cell);
            }
        }

        // Column 2:1 buttons (right of grid, 3 rows).
        const colX = numbersLeft + cellW * 12;
        for (let r = 0; r < 3; r++) {
            const colIdx = 3 - r;   // top → col 3
            this._addCell({
                id: `col_${colIdx}`, label: '2:1', typeId: `column_${colIdx}`, numbers: null,
                x: colX, y: top + r * cellH, w: L.COLUMN_W, h: cellH,
                color: C.FELT_DARK
            });
        }

        // Dozens row.
        const dozenY = top + cellH * 3;
        const dozenSpan = right - left - L.COLUMN_W;
        const dozenW = Math.floor(dozenSpan / 3);
        for (let i = 0; i < 3; i++) {
            const num = i + 1;
            this._addCell({
                id: `dozen_${num}`, label: this._dozenLabel(num), typeId: `dozen_${num}`,
                numbers: null,
                x: left + i * dozenW, y: dozenY, w: dozenW, h: L.DOZEN_H,
                color: C.FELT_DARK
            });
        }

        // Outside row: 1-18 | EVEN | RED | BLACK | ODD | 19-36.
        const outsideY = dozenY + L.DOZEN_H;
        const outsideSpan = right - left - L.COLUMN_W;
        const outsideW = Math.floor(outsideSpan / 6);
        const outside = [
            { id: 'low',   label: '1-18',  color: C.FELT_DARK },
            { id: 'even',  label: 'EVEN',  color: C.FELT_DARK },
            { id: 'red',   label: 'RED',   color: C.RED       },
            { id: 'black', label: 'BLACK', color: C.BLACK     },
            { id: 'odd',   label: 'ODD',   color: C.FELT_DARK },
            { id: 'high',  label: '19-36', color: C.FELT_DARK },
        ];
        for (let i = 0; i < outside.length; i++) {
            const o = outside[i];
            this._addCell({
                id: `out_${o.id}`, label: o.label, typeId: o.id, numbers: null,
                x: left + i * outsideW, y: outsideY, w: outsideW, h: L.OUTSIDE_H,
                color: o.color
            });
        }

        // Specials shelf — small chips above the chip-bar for hot/cold/snake/etc.
        const specialsY = outsideY + L.OUTSIDE_H + 8;
        const specials = ['lucky_zero', 'hot_numbers', 'cold_numbers', 'neighbor_bet', 'snake_bet', 'mirror_bet'];
        const sw = Math.floor((right - left) / specials.length);
        for (let i = 0; i < specials.length; i++) {
            const def = this._data.getBet(specials[i]);
            this._addCell({
                id: `special_${def.id}`, label: this._specialLabel(def), typeId: def.id,
                numbers: null, x: left + i * sw, y: specialsY, w: sw, h: 28,
                color: def.color, isSpecial: true
            });
        }
    }

    _dozenLabel(n) {
        if (n === 1) return '1st 12';
        if (n === 2) return '2nd 12';
        return '3rd 12';
    }

    _specialLabel(def) {
        const map = {
            lucky_zero:   'LUCKY 0',
            hot_numbers:  'HOT',
            cold_numbers: 'COLD',
            neighbor_bet: 'NEIGH',
            snake_bet:    'SNAKE',
            mirror_bet:   'MIRROR',
        };
        return map[def.id] ?? def.label;
    }

    _addCell(cell) {
        cell.betDef = this._data.getBet(cell.typeId);
        this._cells.push(cell);
    }
}
