/**
 * Walks each active payline left-to-right. A line wins if the first N (≥3)
 * symbols are equal (treating star_wild as any non-special).
 *
 * Returns: { lineId, label, color, cells, length, symbolId, baseCoinsPerLine }
 */
export class PaylineEvaluator {
    constructor(dataRegistry) {
        this.data = dataRegistry;
    }

    evaluate(grid, activeLines) {
        const lines = this.data.paylines.slice(0, activeLines);
        const out = [];
        for (const line of lines) {
            const hit = this._evaluateLine(grid, line);
            if (hit) out.push(hit);
        }
        return out;
    }

    _evaluateLine(grid, line) {
        const seq = line.cells.map(([r, row]) => grid[r][row]);
        const baseId = this._firstNonWild(seq);
        if (baseId == null) return null;
        const baseSym = this.data.getSymbol(baseId);
        if (baseSym.isScatter || baseSym.isBonusTrigger) return null;

        let length = 0;
        for (const sym of seq) {
            if (this._matches(sym, baseId)) length++;
            else break;
        }
        if (length < 3) return null;

        const payoutKey = String(length);
        const base = baseSym.payout?.[payoutKey] ?? 0;
        if (base <= 0) return null;
        const winCells = line.cells.slice(0, length);
        return {
            lineId: line.id,
            label: line.label,
            color: line.color,
            cells: winCells,
            length,
            symbolId: baseId,
            baseCoinsPerLine: base
        };
    }

    _firstNonWild(seq) {
        for (const id of seq) {
            const s = this.data.getSymbol(id);
            if (!s.isWild) return id;
        }
        return seq.length > 0 ? seq[0] : null;
    }

    _matches(id, baseId) {
        if (id === baseId) return true;
        const s = this.data.getSymbol(id);
        if (s.isScatter || s.isBonusTrigger) return false;
        return s.isWild === true;
    }
}
