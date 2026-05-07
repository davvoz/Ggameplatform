import CinematicScene from './CinematicScene.js';
import {
    createBgStars, updateBgStars, renderBgStars,
    renderVignette, renderSkipHint
} from './CinematicUtils.js';

/**
 * BlitzOpeningCinematic — Punchy intro for World 6 "Blitz Run".
 *
 * Tone: electric gold, chain-kill tension, no-boss arena rules.
 *
 * Phases:
 *   TITLE    (0 – 3.5s)  — "WORLD 6 / BLITZ RUN"  gold glowing
 *   SUBTITLE (3.5 – 6.5s) — "⚡ CHAIN · BANK · SURVIVE ⚡"
 *   RULES    (6.5 – 11s)  — 4 rule cards
 *   FADE     (11 – 12s)   — black fade
 *
 * Skippable after 1 second.
 */

const PHASE = {
    TITLE:    { start: 0,    duration: 3.5 },
    SUBTITLE: { start: 3.5,  duration: 3   },
    RULES:    { start: 6.5,  duration: 4.5 },
    FADE:     { start: 11,   duration: 1   }
};
const TOTAL_DURATION = 12;

const RULES = [
    { icon: '⚡', text: 'Kill enemies within 2 s to grow your chain multiplier' },
    { icon: '💰', text: 'Score is UNBANKED until you press BANK — lost on death' },
    { icon: '🏦', text: 'Banking locks in your score but resets the multiplier to ×1' },
    { icon: '☠',  text: 'On death you recover 10 % of unbanked as consolation' }
];

export default class BlitzOpeningCinematic extends CinematicScene {

    setup() {
        const g = this.game;
        this.bgStars = createBgStars(70, g.logicalWidth, g.logicalHeight);
        this.duration = TOTAL_DURATION;
        this._gridPhase = 0;
    }

    onUpdate(dt) {
        const g = this.game;
        this._gridPhase += dt * 1.2;
        updateBgStars(this.bgStars, dt, g.logicalWidth, g.logicalHeight);
    }

    onRender(ctx, w, h) {
        ctx.fillStyle = '#080808';
        ctx.fillRect(0, 0, w, h);

        renderBgStars(ctx, this.bgStars);
        this._renderGrid(ctx, w, h);

        const t = this.timer;

        if (this._inPhase(PHASE.TITLE, t))    this._renderTitle(ctx, w, h, t - PHASE.TITLE.start);
        if (this._inPhase(PHASE.SUBTITLE, t)) this._renderSubtitle(ctx, w, h, t - PHASE.SUBTITLE.start);
        if (this._inPhase(PHASE.RULES, t))    this._renderRules(ctx, w, h, t - PHASE.RULES.start);
        if (this._inPhase(PHASE.FADE, t))     this._renderFade(ctx, w, h, t - PHASE.FADE.start);

        renderVignette(ctx, w / 2, h / 2, w, h, 0.55);
        if (this.skipReady) renderSkipHint(ctx, w / 2, h, this.timer, h * 0.08);
    }

    // ── helpers ──────────────────────────────────────────────────────

    _inPhase(phase, t) {
        return t >= phase.start && t < phase.start + phase.duration;
    }

    _alpha(localT, phaseDur, rampIn = 1.5, rampOut = 1.5) {
        return Math.min(1, localT * rampIn) * Math.min(1, (phaseDur - localT) * rampOut);
    }

    _renderGrid(ctx, w, h) {
        const step = 44;
        const pulse = 0.07 + 0.06 * Math.sin(this._gridPhase);
        ctx.save();
        ctx.strokeStyle = `rgba(255, 200, 0, ${pulse})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x <= w; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
        for (let y = 0; y <= h; y += step) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
        ctx.stroke();
        ctx.restore();
    }

    _renderTitle(ctx, w, h, localT) {
        const scale  = this.game.fontScale || 1;
        const fs1    = Math.round(28 * scale);
        const fs2    = Math.round(16 * scale);
        const alpha  = this._alpha(localT, PHASE.TITLE.duration);
        const cy     = h * 0.4;

        ctx.save();
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';

        // "WORLD 6" — gold glow
        ctx.font        = `900 ${fs1}px Orbitron, sans-serif`;
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur  = 22;
        ctx.fillStyle   = `rgba(255, 215, 0, ${alpha})`;
        ctx.fillText('WORLD 6', w / 2, cy - fs1);

        // "BLITZ RUN" — orange-red accent
        ctx.font        = `700 ${fs2}px Orbitron, sans-serif`;
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur  = 16;
        ctx.fillStyle   = `rgba(255, 140, 0, ${alpha})`;
        ctx.fillText('BLITZ RUN', w / 2, cy + 6);

        ctx.restore();
    }

    _renderSubtitle(ctx, w, h, localT) {
        const scale = this.game.fontScale || 1;
        const fs    = Math.round(17 * scale);
        const fsb   = Math.round(11 * scale);
        const alpha = this._alpha(localT, PHASE.SUBTITLE.duration);

        ctx.save();
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';

        ctx.font        = `700 ${fs}px Orbitron, sans-serif`;
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur  = 14;
        ctx.fillStyle   = `rgba(255, 215, 0, ${alpha})`;
        ctx.fillText('⚡ CHAIN · BANK · SURVIVE ⚡', w / 2, h * 0.4);

        ctx.font        = `400 ${fsb}px "Space Mono", monospace`;
        ctx.fillStyle   = `rgba(220, 220, 220, ${alpha})`;
        ctx.shadowBlur  = 4;
        ctx.fillText('Kill fast. Bank smart. Lose everything.', w / 2, h * 0.5);
        ctx.restore();
    }

    _renderRules(ctx, w, h, localT) {
        const alpha   = this._alpha(localT, PHASE.RULES.duration, 1.5, 1);
        const scale   = this.game.fontScale || 1;
        const fsTitle = Math.round(12 * scale);
        const fsRule  = Math.round(10 * scale);
        const lineH   = Math.round(28 * scale);

        ctx.save();
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';

        // header
        ctx.font        = `700 ${fsTitle}px Orbitron, sans-serif`;
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur  = 10;
        ctx.fillStyle   = `rgba(255, 215, 0, ${alpha})`;
        ctx.fillText('— RULES —', w / 2, h * 0.3);

        ctx.font       = `400 ${fsRule}px "Space Mono", monospace`;
        ctx.shadowBlur = 3;

        const startY = h * 0.38;
        RULES.forEach((rule, i) => {
            // stagger entrance: each card appears 0.3s after the previous
            const entryT  = localT - i * 0.3;
            const rowAlpha = alpha * Math.min(1, Math.max(0, entryT * 3));
            ctx.fillStyle = `rgba(230, 230, 230, ${rowAlpha})`;
            ctx.fillText(`${rule.icon}  ${rule.text}`, w / 2, startY + i * lineH);
        });

        ctx.restore();
    }

    _renderFade(ctx, w, h, localT) {
        const progress = Math.min(1, localT / PHASE.FADE.duration);
        ctx.fillStyle = `rgba(0,0,0,${progress})`;
        ctx.fillRect(0, 0, w, h);
    }
}
