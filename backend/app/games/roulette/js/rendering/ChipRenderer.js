import { GameConfig } from '../config/GameConfig.js';

const C = GameConfig.COLOR;

/**
 * Draws chip discs on placed bets and the bottom chip-selector strip.
 */
export class ChipRenderer {
    constructor(dataRegistry) {
        this._chips = dataRegistry.getChipDefs();
    }

    /** Pick the largest single chip ≤ amount. Used for visual chip on a cell. */
    pickChipDef(amount) {
        let pick = this._chips[0];
        for (const c of this._chips) if (c.value <= amount && c.value >= pick.value) pick = c;
        return pick;
    }

    drawChipAt(ctx, x, y, amount, radius = 10) {
        const def = this.pickChipDef(amount);
        // Shadow
        ctx.fillStyle = C.SHADOW;
        ctx.beginPath(); ctx.arc(x + 1, y + 2, radius, 0, Math.PI * 2); ctx.fill();
        // Disc
        ctx.fillStyle = def.color;
        ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
        // Notch ring
        ctx.strokeStyle = def.border;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([2.5, 2.5]);
        ctx.beginPath(); ctx.arc(x, y, radius - 1.5, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        // Total amount label
        ctx.fillStyle = this._labelColor(def.color);
        ctx.font = 'bold 9px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this._fmt(amount), x, y);
    }

    drawSelectorStrip(ctx, selectedValue) {
        const y = GameConfig.LAYOUT.CHIP_BAR_Y;
        const h = GameConfig.LAYOUT.CHIP_BAR_H;
        const w = GameConfig.VIEW_WIDTH - 20;
        ctx.fillStyle = 'rgba(20,20,28,0.85)';
        ctx.fillRect(10, y, w, h);
        ctx.strokeStyle = C.GOLD;
        ctx.lineWidth = 1;
        ctx.strokeRect(10.5, y + 0.5, w - 1, h - 1);

        const slotW = w / this._chips.length;
        for (let i = 0; i < this._chips.length; i++) {
            const def = this._chips[i];
            const cx = 10 + slotW * (i + 0.5);
            const cy = y + h / 2;
            const isSelected = def.value === selectedValue;
            const r = isSelected ? 22 : 18;
            if (isSelected) {
                ctx.fillStyle = C.GOLD_BRIGHT;
                ctx.beginPath(); ctx.arc(cx, cy, r + 3, 0, Math.PI * 2); ctx.fill();
            }
            this._drawChipDisc(ctx, cx, cy, r, def);
        }
    }

    /** Return hit-box rects for the selector strip, in order. */
    getSelectorHitBoxes() {
        const y = GameConfig.LAYOUT.CHIP_BAR_Y;
        const h = GameConfig.LAYOUT.CHIP_BAR_H;
        const w = GameConfig.VIEW_WIDTH - 20;
        const slotW = w / this._chips.length;
        return this._chips.map((def, i) => ({
            value: def.value,
            x: 10 + slotW * i, y, w: slotW, h
        }));
    }

    _drawChipDisc(ctx, cx, cy, r, def) {
        ctx.fillStyle = C.SHADOW;
        ctx.beginPath(); ctx.arc(cx + 1, cy + 2, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = def.color;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = def.border;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.arc(cx, cy, r - 2.5, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = this._labelColor(def.color);
        ctx.font = 'bold 12px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(def.label, cx, cy);
    }

    _labelColor(bg) {
        // Crude luminance check.
        const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(bg);
        if (!m) return '#fff';
        const lum = Number.parseInt(m[1], 16) * 0.299 + Number.parseInt(m[2], 16) * 0.587 + Number.parseInt(m[3], 16) * 0.114;
        return lum > 140 ? '#1a1a1a' : '#f5f5f0';
    }

    _fmt(n) {
        if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
        return String(n);
    }
}
