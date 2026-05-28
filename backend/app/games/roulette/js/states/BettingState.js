import { GameConfig } from '../config/GameConfig.js';
import { SoundEvent } from '../audio/SoundEvent.js';
import { UIPainter } from '../ui/UIPainter.js';
import { SpinState } from './SpinState.js';

const L = GameConfig.LAYOUT;
const C = GameConfig.COLOR;

/**
 * Place chips on the table, choose chip denomination, trigger spin.
 * Owns: chip-bar hit-tests, action-bar hit-tests, table cell hit-tests.
 * Does NOT do bet resolution (that's SpinState→RevealState→BetResolver).
 */
export class BettingState {
    constructor(game) {
        this._game = game;
        this._buttons = null;       // built in enter()
        this._chipHitBoxes = null;
        this._messageText = '';
        this._messageTimer = 0;
    }

    enter() {
        this._buttons = this._buildButtons();
        this._chipHitBoxes = this._game.chipRenderer.getSelectorHitBoxes();
    }
    exit() { /* no cleanup needed */ }

    update(dt) {
        if (this._messageTimer > 0) this._messageTimer -= dt;
        this._game.vfx.update(dt);
    }

    handleInput(event) {
        if (event.type !== 'down') return;
        const { x, y } = event;
        // 1. Action buttons (highest priority)
        for (const b of this._buttons) {
            if (this._inside(x, y, b)) { this._invokeButton(b); return; }
        }
        // 2. Chip selector
        for (const c of this._chipHitBoxes) {
            if (x >= c.x && x < c.x + c.w && y >= c.y && y < c.y + c.h) {
                this._game.run.selectedChipValue = c.value;
                this._game.sound.play(SoundEvent.UI_CLICK);
                return;
            }
        }
        // 3. Table cells
        const cell = this._game.tableLayout.hitTest(x, y);
        if (cell) this._placeChipOnCell(cell);
    }

    render(ctx) {
        this._game.tableRenderer.draw(ctx, this._game.run);
        this._game.wheelRenderer.draw(ctx, 0, 0, 0.85, null);
        this._game.hud.draw(ctx, this._game.run);
        this._drawPlacedChips(ctx);
        this._game.chipRenderer.drawSelectorStrip(ctx, this._game.run.selectedChipValue);
        this._drawButtonBar(ctx);
        this._game.vfx.render(ctx);
        if (this._messageTimer > 0) this._drawMessage(ctx);
    }

    // ── Internals ─────────────────────────────────────────────────────

    _placeChipOnCell(cell) {
        const amount = this._game.run.selectedChipValue;
        if (!this._game.run.canAfford(this._game.run.chips.totalWagered() + amount)) {
            return this._showMessage('Insufficient balance');
        }
        const def = cell.betDef;
        let numbers = cell.numbers;
        let multiplier = 1;
        let vfx = def.vfx ?? null;
        if (def.special && def.expandStrategy) {
            const expanded = this._game.specialExpander.expand(def, this._game.run);
            numbers = expanded.numbers;
            multiplier = expanded.multiplier;
            vfx = expanded.vfx;
            if (!numbers || numbers.length === 0) return this._showMessage('No targets yet');
        }
        this._game.run.chips.place(cell.typeId, numbers, amount, { multiplier, vfx });
        this._game.sound.play(SoundEvent.CHIP_DROP);
    }

    _drawPlacedChips(ctx) {
        for (const bet of this._game.run.chips.getBets()) {
            this._drawBetChip(ctx, bet);
        }
    }

    _drawBetChip(ctx, bet) {
        const def = this._game.data.getBet(bet.typeId);
        // For inside straights, draw chip on the matching number cell.
        if (def.id === 'straight' && bet.numbers?.length === 1) {
            const cell = this._game.tableLayout.getNumberCell(bet.numbers[0]);
            if (cell) {
                this._game.chipRenderer.drawChipAt(ctx, cell.x + cell.w - 11, cell.y + cell.h - 11, bet.amount, 9);
            }
            return;
        }
        // For outside / special bets, draw on the bet cell itself.
        const cells = this._game.tableLayout.getCells();
        const cell = cells.find(c => c.typeId === bet.typeId);
        if (cell) {
            this._game.chipRenderer.drawChipAt(ctx, cell.x + cell.w / 2, cell.y + cell.h / 2, bet.amount, 11);
        }
    }

    _drawButtonBar(ctx) {
        for (const b of this._buttons) {
            const active = b.activeCheck ? b.activeCheck() : true;
            UIPainter.button(ctx, b.x, b.y, b.w, b.h, b.label, { active });
        }
    }

    _drawMessage(ctx) {
        const W = GameConfig.VIEW_WIDTH;
        ctx.save();
        ctx.globalAlpha = Math.min(1, this._messageTimer);
        UIPainter.panel(ctx, W / 2 - 110, 90, 220, 30, { fill: 'rgba(192,57,43,0.92)', border: C.RED_BRIGHT });
        UIPainter.text(ctx, this._messageText, W / 2, 105, {
            size: 13, weight: 'bold', color: C.IVORY, align: 'center'
        });
        ctx.restore();
    }

    _showMessage(text) {
        this._messageText = text;
        this._messageTimer = 1.6;
        this._game.sound.play(SoundEvent.UI_CLICK);
    }

    _buildButtons() {
        const y = L.BUTTON_BAR_Y;
        const h = L.BUTTON_BAR_H;
        const W = GameConfig.VIEW_WIDTH;
        const gap = 8;
        const buttonW = Math.floor((W - 20 - gap * 3) / 4);
        const base = 10;
        return [
            {
                id: 'spin',  label: 'SPIN',  x: base,                              y, w: buttonW, h,
                action: () => this._spin(),
                activeCheck: () => this._game.run.chips.totalWagered() > 0
            },
            {
                id: 'clear', label: 'CLEAR', x: base + buttonW + gap,              y, w: buttonW, h,
                action: () => this._clear(),
                activeCheck: () => this._game.run.chips.totalWagered() > 0
            },
            {
                id: 'rebet', label: 'REBET', x: base + (buttonW + gap) * 2,        y, w: buttonW, h,
                action: () => this._rebet(),
                activeCheck: () => this._game.run.chips.hasLastBets() && this._game.run.chips.totalWagered() === 0
            },
            {
                id: 'half',  label: '½ MAX', x: base + (buttonW + gap) * 3,        y, w: buttonW, h,
                action: () => this._halfMax(),
                activeCheck: () => this._game.run.balance > 0
            },
        ];
    }

    _invokeButton(b) {
        const active = b.activeCheck ? b.activeCheck() : true;
        if (!active) { this._game.sound.play(SoundEvent.UI_CLICK); return; }
        b.action();
    }

    _spin() {
        const wager = this._game.run.chips.totalWagered();
        if (wager <= 0) return this._showMessage('Place a bet first');
        if (wager > this._game.run.balance) return this._showMessage('Insufficient balance');
        this._game.run.chargeWager(wager);
        this._game.run.chips.snapshot();
        this._game.sound.play(SoundEvent.SPIN_START);
        this._game.transitionTo(new SpinState(this._game));
    }

    _clear() {
        this._game.run.chips.clear();
        this._game.sound.play(SoundEvent.CHIP_CLEAR);
    }

    _rebet() {
        const total = this._game.run.chips.rebet();
        if (total > this._game.run.balance) {
            this._game.run.chips.clear();
            return this._showMessage('Not enough for rebet');
        }
        this._game.sound.play(SoundEvent.CHIP_DROP);
    }

    _halfMax() {
        const half = Math.floor(this._game.run.balance / 2);
        if (half < 1) return;
        this._game.run.selectedChipValue = this._pickChipForAmount(half);
        this._game.sound.play(SoundEvent.UI_CLICK);
    }

    _pickChipForAmount(amount) {
        const defs = this._game.data.getChipDefs();
        let pick = defs[0].value;
        for (const d of defs) if (d.value <= amount && d.value >= pick) pick = d.value;
        return pick;
    }

    _inside(x, y, b) {
        return x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h;
    }
}
