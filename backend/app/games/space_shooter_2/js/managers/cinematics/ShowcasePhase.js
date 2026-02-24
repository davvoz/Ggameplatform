/**
 * ShowcasePhase — Reusable "header + item carousel" phase.
 *
 * Eliminates all duplicated phase-rendering logic.
 * Both OpeningCinematic
 * arrays of ShowcasePhase instances and call phase.render().
 *
 * Configuration is 100 % data-driven — no `if` checks for
 * entity type, world number, or animation style.
 */
import { easeOut } from './CinematicUtils.js';
import { ITEM_SHOWCASE_TIME } from '../../WorldConfig.js';
import { title } from '../../FontConfig.js';

// ─── Header animation presets ─────────────────────────
const HEADER_ANIMS = {
    /** Smooth sine pulse (fleet, miniboss) */
    pulse: (t, freq) => 0.8 + 0.2 * Math.sin(t * (freq ?? 2.5)),
    /** Hard on-off flash (boss) */
    flash: (t, freq) => Math.sin(t * (freq ?? 4)) > 0 ? 1.0 : 0.75,
};

// ─── Item slide-in presets ────────────────────────────
const SLIDE_FNS = {
    /** All items enter left, exit right */
    leftToRight: (i, enter, exit, w) =>
        (1 - enter) * (-w * 0.4) + exit * (w * 0.4),

    /** Odd → right, even → left */
    alternating: (i, enter, exit, w) => {
        const fromLeft = i % 2 === 0;
        return fromLeft
            ? (1 - enter) * (-w * 0.5) + exit * ( w * 0.5)
            : (1 - enter) * ( w * 0.5) + exit * (-w * 0.5);
    },

    /** No horizontal slide — items scale from centre */
    center: () => 0,
};

export default class ShowcasePhase {

    /**
     * @param {Object}   config
     * @param {Object}   config.header          — { text, color, shadowColor, maxFontSize?, fontSizeRatio?, shadowBlur?, animStyle?, animFreq?, letterSpacing? }
     * @param {Array}    config.items           — entities to present
     * @param {Function} config.cardRenderer    — fn(ctx, item, x, y, alpha, scale, itemT, game, w, h, index)
     * @param {number}   config.startTime       — absolute scene time this phase starts
     * @param {number}  [config.itemDuration]    — seconds per item (default ITEM_SHOWCASE_TIME)
     * @param {number}  [config.crossfade]       — seconds of overlap (default 0.3)
     * @param {string}  [config.slideStyle]      — 'leftToRight' | 'alternating' | 'center'
     * @param {number}  [config.enterDuration]   — slide-in seconds (default 0.3)
     * @param {number}  [config.exitFromEnd]     — seconds before item end to start exit (default 0.5)
     * @param {number}  [config.exitDuration]    — exit transition seconds (default 0.5)
     * @param {number}  [config.headerY]         — header Y as fraction of h (default 0.10)
     * @param {number}  [config.itemYOffset]     — pixel offset from h/2 for item centre (default -10)
     * @param {boolean} [config.scaleItems]      — enable scale-in animation (default false)
     * @param {boolean} [config.scanLine]        — render red scan line effect (default false)
     * @param {Function}[config.onPhaseStart]    — fn(game) called once when phase starts
     * @param {Function}[config.onItemReveal]    — fn(game, index, item) called once per item reveal
     */
    constructor(config) {
        this.header        = config.header;
        this.items         = config.items         || [];
        this.cardRenderer  = config.cardRenderer;
        this.itemDuration  = config.itemDuration  ?? ITEM_SHOWCASE_TIME;
        this.startTime     = config.startTime     ?? 0;
        this.crossfade     = config.crossfade     ?? 0.3;
        this.slideStyle    = config.slideStyle     || 'alternating';
        this.enterDuration = config.enterDuration  ?? 0.3;
        this.exitFromEnd   = config.exitFromEnd    ?? 0.5;
        this.exitDuration  = config.exitDuration   ?? 0.5;
        this.headerY       = config.headerY        ?? 0.10;
        this.itemYOffset   = config.itemYOffset    ?? -10;
        this.scaleItems    = config.scaleItems     || false;
        this.scanLine      = config.scanLine       || false;
        this.onPhaseStart  = config.onPhaseStart   || null;
        this.onItemReveal  = config.onItemReveal   || null;

        this.phaseDuration = this.items.length * this.itemDuration;
    }

    get endTime() { return this.startTime + this.phaseDuration; }

    isVisible(t) {
        return this.items.length > 0 &&
               t >= this.startTime - this.crossfade &&
               t < this.endTime + this.crossfade;
    }

    // ── Sound triggers (call from parent's onUpdate) ──

    triggerSounds(t, soundsPlayed, game) {
        if (!this.items.length) return;

        // Phase-start sound
        const psKey = `ps_${this.startTime}`;
        if (t >= this.startTime && !soundsPlayed[psKey]) {
            soundsPlayed[psKey] = true;
            this.onPhaseStart?.(game);
        }

        // Per-item reveal sound
        if (this.onItemReveal) {
            for (let i = 0; i < this.items.length; i++) {
                const itemStart = this.startTime + i * this.itemDuration;
                const key = `ir_${this.startTime}_${i}`;
                if (t >= itemStart && t < itemStart + 0.05 && !soundsPlayed[key]) {
                    soundsPlayed[key] = true;
                    this.onItemReveal(game, i, this.items[i]);
                }
            }
        }
    }

    // ── Render ────────────────────────────────────────

    render(ctx, t, w, h, game) {
        if (!this.isVisible(t)) return;
        const phaseT = t - this.startTime;

        // ── Horizontal wipe line at phase start ──
        if (phaseT >= 0 && phaseT < 0.4) {
            const wipeT = phaseT / 0.4;
            const lineW = w * easeOut(wipeT);
            ctx.save();
            ctx.globalAlpha = (1 - wipeT) * 0.7;
            const hdr = this.header;
            ctx.fillStyle = hdr.color || '#ffdd55';
            ctx.fillRect((w - lineW) / 2, h * this.headerY - 1, lineW, 2);
            ctx.restore();
        }

        this._renderHeader(ctx, phaseT, w, h);
        if (this.scanLine) this._renderScanLine(ctx, phaseT, w, h);
        this._renderItems(ctx, phaseT, w, h, game);
    }

    // ── Internals ─────────────────────────────────────

    _renderHeader(ctx, phaseT, w, h) {
        if (phaseT < 0 || phaseT >= this.phaseDuration) return;
        const hdr = this.header;

        // Sharp snap-in (fast) instead of slow fade
        const enter = easeOut(Math.min(1, phaseT / (hdr.enterDuration ?? 0.15)));
        // Sharp cut-out at phase end
        const exitStart = this.phaseDuration - 0.15;
        const exit  = phaseT > exitStart
            ? Math.min(1, (phaseT - exitStart) / 0.15) : 0;
        const animFn = HEADER_ANIMS[hdr.animStyle || 'pulse'];
        const anim   = animFn(phaseT, hdr.animFreq);

        ctx.save();
        ctx.globalAlpha  = Math.max(0, enter - exit) * anim;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        const fs = Math.min(hdr.maxFontSize ?? 18, w * (hdr.fontSizeRatio ?? 0.04));
        ctx.font        = title(fs, 'bold');
        ctx.shadowColor = hdr.shadowColor ?? 'rgba(255,200,50,0.6)';
        ctx.shadowBlur  = hdr.shadowBlur  ?? 14;
        ctx.fillStyle   = hdr.color       ?? '#ffdd55';
        if (hdr.letterSpacing) ctx.letterSpacing = hdr.letterSpacing;
        ctx.fillText(hdr.text, w / 2, h * this.headerY);
        ctx.restore();
    }

    _renderScanLine(ctx, phaseT, w, h) {
        if (phaseT <= 0) return;
        const scanY = (phaseT * 100) % h;
        ctx.save();
        ctx.globalAlpha = 0.06;
        ctx.strokeStyle = '#ff2200';
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(0, scanY);
        ctx.lineTo(w, scanY);
        ctx.stroke();
        ctx.restore();
    }

    _renderItems(ctx, phaseT, w, h, game) {
        const cx    = w / 2;
        const cy    = h / 2 + this.itemYOffset;
        const slide = SLIDE_FNS[this.slideStyle] || SLIDE_FNS.alternating;

        for (let i = 0; i < this.items.length; i++) {
            const iStart = i * this.itemDuration;
            const iT     = phaseT - iStart;
            if (iT < 0 || iT > this.itemDuration + 0.15) continue;

            // Snap-in: very fast appear
            const enter = easeOut(Math.min(1, iT / Math.min(this.enterDuration, 0.15)));
            // Hard cut-out
            const exitAt  = this.itemDuration - 0.1;
            const exit    = iT > exitAt ? Math.min(1, (iT - exitAt) / 0.1) : 0;
            const alpha   = Math.min(enter, 1 - exit);
            if (alpha <= 0.01) continue;

            const x     = cx + slide(i, enter, exit, w);
            const scale = this.scaleItems ? 0.5 + enter * 0.5 - exit * 0.3 : 1;

            this.cardRenderer(ctx, this.items[i], x, cy, alpha, scale, iT, game, w, h, i);
        }
    }
}
