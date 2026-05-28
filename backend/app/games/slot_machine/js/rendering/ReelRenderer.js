/**
 * Owns the visual state of one reel column and renders it. Animation phases:
 *   IDLE → ACCEL → FULL → DECEL → BOUNCE → STOP
 *
 * Public API:
 *   startSpin(targetVisible, stripLandingIndex, durationOverrideMs?)
 *   update(dt)
 *   render(ctx)
 *   isStopped()
 *   visible  → final 3 symbols once stopped
 */
import { GameConfig } from '../config/GameConfig.js';

const PHASE = Object.freeze({ IDLE: 0, ACCEL: 1, FULL: 2, DECEL: 3, BOUNCE: 4 });

export class ReelRenderer {
    constructor(options) {
        const { reelIndex, symbolRenderer, strip, x, y, w, h, cellH, reelCfg } = options;
        this.reelIndex = reelIndex;
        this.symbolRenderer = symbolRenderer;
        this.strip = strip;
        this.x = x; this.y = y; this.w = w; this.h = h;
        this.cellH = cellH;
        this.cfg = reelCfg;
        this.phase = PHASE.IDLE;
        this.offset = 0;                 // pixel offset of strip top within reel window
        this.speed = 0;                  // current px/sec (downwards)
        this.fullSpeed = reelCfg.fullSpeedPxPerSec;
        this.timeInPhase = 0;
        this.fullPhaseDurationMs = 0;
        this.landingIndex = 0;
        this.visible = [strip[0], strip[1], strip[2]];
        this._idleAnchor = 0;
        this._stripPhase = 0;
        this._bounceStartOffset = 0;
        this._bounceTargetOffset = 0;
    }

    startSpin(targetVisible, landingIndex, fullPhaseDurationMs) {
        this.phase = PHASE.ACCEL;
        this.timeInPhase = 0;
        this.speed = 0;
        this.fullPhaseDurationMs = fullPhaseDurationMs;
        this.landingIndex = landingIndex;
        this._pendingVisible = targetVisible;
    }

    update(dt) {
        this.timeInPhase += dt * 1000;
        switch (this.phase) {
            case PHASE.IDLE:   this._updateIdle(dt); break;
            case PHASE.ACCEL:  this._updateAccel(dt); break;
            case PHASE.FULL:   this._updateFull(dt); break;
            case PHASE.DECEL:  this._updateDecel(dt); break;
            case PHASE.BOUNCE: this._updateBounce(dt); break;
        }
    }

    _updateIdle(dt) {
        this._idleAnchor = (this._idleAnchor + dt) % 10000;
    }

    _updateAccel(dt) {
        const k = Math.min(this.timeInPhase / this.cfg.accelerationMs, 1);
        this.speed = this.fullSpeed * k;
        this.offset += this.speed * dt;
        this._wrapOffset();
        if (k >= 1) { this.phase = PHASE.FULL; this.timeInPhase = 0; }
    }

    _updateFull(dt) {
        this.offset += this.fullSpeed * dt;
        this._wrapOffset();
        if (this.timeInPhase >= this.fullPhaseDurationMs) {
            this.phase = PHASE.DECEL;
            this.timeInPhase = 0;
            this._snapToLanding();
        }
    }

    _updateDecel(dt) {
        const t = Math.min(this.timeInPhase / this.cfg.decelerationMs, 1);
        const e = 1 - Math.pow(1 - t, 3); // easeOutCubic
        const target = this._bounceTargetOffset + this.cellH * this.cfg.bounceOvershootSymbols;
        this.offset = this._bounceStartOffset + (target - this._bounceStartOffset) * e;
        if (t >= 1) {
            this.phase = PHASE.BOUNCE;
            this.timeInPhase = 0;
            this._bounceStartOffset = this.offset;
        }
    }

    _updateBounce(dt) {
        const t = Math.min(this.timeInPhase / this.cfg.bounceMs, 1);
        const e = 1 - Math.pow(1 - t, 2);
        this.offset = this._bounceStartOffset + (this._bounceTargetOffset - this._bounceStartOffset) * e;
        if (t >= 1) {
            this.offset = this._bounceTargetOffset;
            this.phase = PHASE.IDLE;
            this.timeInPhase = 0;
            this.visible = this._pendingVisible;
        }
    }

    _snapToLanding() {
        // Align offset to multiple of cellH near current value, then set the
        // strip such that landingIndex appears at row 0.
        // We use a virtual "scroll position" measured in cells, with strip
        // sampled by index = (offsetCells + row) mod stripLength.
        this._bounceStartOffset = this.offset;
        this._bounceTargetOffset = Math.ceil(this.offset / this.cellH) * this.cellH;
        // Snap strip so that drawing at landing reveals our visible symbols
        const offsetCells = Math.round(this._bounceTargetOffset / this.cellH);
        const desiredIndex = this.landingIndex - offsetCells;
        this._stripPhase = ((desiredIndex % this.strip.length) + this.strip.length) % this.strip.length;
    }

    _wrapOffset() {
        const stripPx = this.cellH * this.strip.length;
        if (this.offset > stripPx) this.offset -= stripPx;
    }

    isStopped() { return this.phase === PHASE.IDLE; }

    render(ctx) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(this.x, this.y, this.w, this.h);
        ctx.clip();

        const rowsVisibleExtra = Math.ceil(this.h / this.cellH) + 2;
        const offsetCells = Math.floor(this.offset / this.cellH);
        const subPixel = this.offset - offsetCells * this.cellH;

        for (let row = -1; row < rowsVisibleExtra; row++) {
            const idx = this._sampleStrip(offsetCells, row);
            const drawY = this.y + row * this.cellH - subPixel;
            this.symbolRenderer.draw(
                ctx, idx,
                this.x + GameConfig.SYMBOL.PAD,
                drawY + GameConfig.SYMBOL.PAD,
                this.w - GameConfig.SYMBOL.PAD * 2,
                this.cellH - GameConfig.SYMBOL.PAD * 2,
                { t: this._idleAnchor }
            );
        }
        ctx.restore();
    }

    _sampleStrip(offsetCells, row) {
        const len = this.strip.length;
        if (this.phase === PHASE.IDLE) {
            // After landing: row 0 → visible[0], row 1 → visible[1], row 2 → visible[2]
            if (row >= 0 && row <= 2) return this.visible[row];
            // Outside visible: sample around the strip phase
            const idx = (this._stripPhase + row + len * 10) % len;
            return this.strip[idx];
        }
        const baseIdx = (this._stripPhase ?? 0) + offsetCells + row;
        const idx = ((baseIdx % len) + len) % len;
        return this.strip[idx];
    }
}
