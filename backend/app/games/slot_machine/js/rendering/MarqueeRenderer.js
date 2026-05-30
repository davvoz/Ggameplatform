/**
 * Animated header marquee.
 *
 * Owns the textual content of the top plaque:
 *   - pulsing title
 *   - a dynamic middle line that reacts to game events through a transient
 *     message queue (push from FSM states / systems)
 *   - rotating "idle tips" when the queue is empty
 *   - jackpot ticker
 *
 * The cabinet draws the plaque background; this renderer draws only text /
 * effects on top of it.
 */
import { GameConfig } from '../config/GameConfig.js';

const IDLE_TIPS = Object.freeze([
    { text: 'READY TO SPIN',                          color: GameConfig.COLOR.NEON_CYAN },
    { text: 'TAP A POWERUP TWICE TO BUY',             color: GameConfig.COLOR.NEON_LIME },
    { text: '🔒 LOCK  tap reels to freeze them for 3 spins', color: GameConfig.COLOR.NEON_CYAN },
    { text: '🌟 WILD  one reel becomes all wild',     color: GameConfig.COLOR.NEON_VIOLET },
    { text: '✨ MAG  adds +1 scatter for 5 spins',    color: GameConfig.COLOR.NEON_GOLD },
    { text: '⚡ x2  doubles every win for 3 spins',   color: GameConfig.COLOR.NEON_RED },
    { text: 'MAX BET = JACKPOT',                      color: GameConfig.COLOR.NEON_GOLD },
    { text: 'BET BIG, WIN BIG',                       color: GameConfig.COLOR.NEON_RED }
]);

const IDLE_ROTATE_MS = 3600;
const SLIDE_IN_MS    = 220;

export class MarqueeRenderer {
    t = 0;
    _idleIndex = 0;
    _idleSince = 0;
    _currentEnteredAt = 0;

    constructor() {
        this._queue = [];
        this._cachedJPFloor = -1;
        this._cachedJPStr   = '';
    }

    update(dt) {
        this.t += dt;
        const now = this.t * 1000;
        // Expire head messages whose ttl has elapsed
        while (this._queue.length > 0 && now - this._currentEnteredAt >= this._queue[0].ttlMs) {
            this._queue.shift();
            this._currentEnteredAt = now;
        }
        // Rotate idle tip when no transient message is active
        if (this._queue.length === 0) {
            this._idleSince += dt * 1000;
            if (this._idleSince >= IDLE_ROTATE_MS) {
                this._idleSince = 0;
                this._idleIndex = (this._idleIndex + 1) % IDLE_TIPS.length;
            }
        } else {
            this._idleSince = 0;
        }
    }

    /**
     * Push a transient message to the marquee.
     * @param {string} text
     * @param {string} color
     * @param {number} durationMs
     */
    push(text, color, durationMs) {
        if (this._queue.length === 0) this._currentEnteredAt = this.t * 1000;
        this._queue.push({ text, color, ttlMs: durationMs });
    }

    render(ctx, runCtx) {
        const L = GameConfig.LAYOUT;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        this._drawTitle(ctx, L);
        this._drawDynamicLine(ctx, L);
        this._drawJackpot(ctx, L, runCtx);
        ctx.restore();
    }

    _drawTitle(ctx, L) {
        const COL = GameConfig.COLOR;
        const flicker = 0.85 + (Math.sin(this.t * 17) > 0.93 ? 0 : 0.15);
        ctx.font = '900 22px system-ui,sans-serif';
        ctx.fillStyle = COL.NEON_GOLD;
        ctx.shadowColor = COL.NEON_GOLD;
        ctx.shadowBlur = 16 * flicker;
        ctx.fillText('NEON JACKPOT', GameConfig.VIEW_WIDTH / 2, L.HEADER_Y + 28);
    }

    _drawDynamicLine(ctx, L) {
        const message = this._currentMessage();
        const enterElapsed = this._queue.length > 0
            ? this.t * 1000 - this._currentEnteredAt
            : SLIDE_IN_MS;
        const t01 = Math.min(1, enterElapsed / SLIDE_IN_MS);
        const easeOut = 1 - Math.pow(1 - t01, 3);
        const yBase = L.HEADER_Y + 54;
        const offsetX = (1 - easeOut) * 80;
        const alpha = easeOut;
        const pulse = 1 + Math.sin(this.t * 6) * 0.06;

        ctx.save();
        ctx.translate(GameConfig.VIEW_WIDTH / 2 + offsetX, yBase);
        ctx.scale(pulse, pulse);
        ctx.globalAlpha = alpha;
        ctx.font = '900 14px system-ui,sans-serif';
        ctx.fillStyle = message.color;
        ctx.shadowColor = message.color;
        ctx.shadowBlur = 12;
        ctx.fillText(message.text, 0, 0);
        ctx.restore();
    }

    _drawJackpot(ctx, L, runCtx) {
        const COL = GameConfig.COLOR;
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.beginPath();
        ctx.roundRect(80, L.HEADER_Y + 72, GameConfig.VIEW_WIDTH - 160, 26, 8);
        ctx.fill();
        ctx.strokeStyle = COL.NEON_RED;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = COL.NEON_RED;
        ctx.shadowBlur = 10 + Math.sin(this.t * 4) * 4;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.font = '900 16px "Courier New",monospace';
        ctx.fillStyle = COL.NEON_RED;
        ctx.shadowColor = COL.NEON_RED;
        ctx.shadowBlur = 8;
        const jpFloor = Math.floor(runCtx.jackpotPool);
        if (this._cachedJPFloor !== jpFloor) {
            this._cachedJPFloor = jpFloor;
            this._cachedJPStr = `\u2605 JACKPOT  ${jpFloor.toLocaleString('en-US')}  \u2605`;
        }
        ctx.fillText(this._cachedJPStr, GameConfig.VIEW_WIDTH / 2, L.HEADER_Y + 85);
        ctx.shadowBlur = 0;
    }

    _currentMessage() {
        if (this._queue.length > 0) return this._queue[0];
        return IDLE_TIPS[this._idleIndex];
    }
}
