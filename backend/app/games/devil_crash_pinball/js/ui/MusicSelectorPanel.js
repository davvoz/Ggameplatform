import { GameConfig as C }       from '../config/GameConfig.js';
import { MusicTrackRegistry }    from '../config/MusicTrackRegistry.js';

/**
 * Canvas-drawn music selector panel displayed while the game is paused.
 *
 * Fully static: all rendering and hit-test logic is derived from
 * {@link GameConfig} constants and {@link MusicTrackRegistry}. No instance
 * is required — Game and HUD reference the class directly.
 *
 * Layout on a 480 × 720 canvas:
 *   Panel:  x=60 y=190  w=360  h=270
 *   Tracks: x=80 startY=248  w=320  h=50  gap=8 (3 rows)
 */
export class MusicSelectorPanel {

    /** @private */ static _PANEL_X       = 60;
    /** @private */ static _PANEL_Y       = 190;
    /** @private */ static _PANEL_W       = 360;
    /** @private */ static _PANEL_H       = 270;

    /** @private */ static _HEADER_Y      = 222;
    /** @private */ static _SEPARATOR_Y   = 238;

    /** @private */ static _TRACK_X       = 80;
    /** @private */ static _TRACK_W       = 320;
    /** @private */ static _TRACK_H       = 50;
    /** @private */ static _TRACK_GAP     = 8;
    /** @private */ static _TRACK_START_Y = 248;

    /** Close (✕) button — top-right corner of the panel. */
    static _CLOSE_BTN = Object.freeze({ x: 388, y: 198, w: 24, h: 24 });

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Render the overlay on the paused canvas.
     *
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} viewW
     * @param {number} viewH
     * @param {string} activePath  Path of the currently playing track.
     */
    static draw(ctx, viewW, viewH, activePath) {
        ctx.save();
        MusicSelectorPanel._drawBackdrop(ctx, viewW, viewH);
        MusicSelectorPanel._drawPanel(ctx);
        MusicSelectorPanel._drawHeader(ctx);
        MusicSelectorPanel._drawTracks(ctx, activePath);
        MusicSelectorPanel._drawCloseButton(ctx);
        ctx.restore();
    }

    /**
     * Hit-test the close (✕) button.
     * @param {number} cx
     * @param {number} cy
     * @returns {boolean}
     */
    static hitTestClose(cx, cy) {
        const r = MusicSelectorPanel._CLOSE_BTN;
        return cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h;
    }

    /**
     * Hit-test a canvas-space point against the track rows.
     *
     * Returns the 0-based track index if a row was hit, otherwise `null`.
     * Should only be called when the panel is visible (game paused).
     *
     * @param {number} cx
     * @param {number} cy
     * @returns {number|null}
     */
    static hitTest(cx, cy) {
        const tracks = MusicTrackRegistry.tracks;
        for (let i = 0; i < tracks.length; i++) {
            const r = MusicSelectorPanel._trackRect(i);
            if (cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h) {
                return i;
            }
        }
        return null;
    }

    // ── Private helpers ─────────────────────────────────────────────────────

    /** @private */
    static _trackRect(index) {
        const stride = MusicSelectorPanel._TRACK_H + MusicSelectorPanel._TRACK_GAP;
        return {
            x: MusicSelectorPanel._TRACK_X,
            y: MusicSelectorPanel._TRACK_START_Y + index * stride,
            w: MusicSelectorPanel._TRACK_W,
            h: MusicSelectorPanel._TRACK_H,
        };
    }

    /** @private */
    static _drawCloseButton(ctx) {
        const r = MusicSelectorPanel._CLOSE_BTN;
        ctx.save();
        ctx.fillStyle   = 'rgba(28, 6, 52, 0.90)';
        ctx.strokeStyle = 'rgba(136, 34, 238, 0.70)';
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.roundRect(r.x, r.y, r.w, r.h, 6);
        ctx.fill();
        ctx.stroke();
        const mx = r.x + r.w / 2;
        const my = r.y + r.h / 2;
        ctx.font         = 'bold 15px monospace';
        ctx.fillStyle    = 'rgba(200, 160, 230, 0.90)';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\u2715', mx, my);
        ctx.restore();
    }

    /** @private */
    static _drawBackdrop(ctx, viewW, viewH) {
        ctx.fillStyle = 'rgba(4, 1, 14, 0.76)';
        ctx.fillRect(0, 0, viewW, viewH);
    }

    /** @private */
    static _drawPanel(ctx) {
        const { _PANEL_X: px, _PANEL_Y: py, _PANEL_W: pw, _PANEL_H: ph } = MusicSelectorPanel;
        const grad = ctx.createLinearGradient(px, py, px, py + ph);
        grad.addColorStop(0, 'rgba(28,  8, 52, 0.97)');
        grad.addColorStop(1, 'rgba(12,  3, 28, 0.97)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(px, py, pw, ph, 14);
        ctx.fill();
        ctx.strokeStyle = 'rgba(136, 34, 238, 0.80)';
        ctx.lineWidth   = 2;
        ctx.shadowColor = '#8822ee';
        ctx.shadowBlur  = 18;
        ctx.stroke();
        ctx.shadowBlur  = 0;
    }

    /** @private */
    static _drawHeader(ctx) {
        const cx = C.VIEW_WIDTH / 2;
        ctx.font         = 'bold 17px "Orbitron", monospace';
        ctx.fillStyle    = '#e0b0ff';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor  = '#cc88ff';
        ctx.shadowBlur   = 10;
        ctx.fillText('\u266b SELECT MUSIC', cx, MusicSelectorPanel._HEADER_Y);
        ctx.shadowBlur   = 0;

        // Separator line
        const { _PANEL_X: px, _PANEL_W: pw, _SEPARATOR_Y: sy } = MusicSelectorPanel;
        ctx.strokeStyle = 'rgba(136, 34, 238, 0.45)';
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(px + 20, sy);
        ctx.lineTo(px + pw - 20, sy);
        ctx.stroke();
    }

    /** @private */
    static _drawTracks(ctx, activePath) {
        const tracks = MusicTrackRegistry.tracks;
        for (let i = 0; i < tracks.length; i++) {
            MusicSelectorPanel._drawTrackRow(ctx, i, tracks[i], tracks[i].path === activePath);
        }
    }

    /** @private */
    static _drawTrackRow(ctx, index, track, isActive) {
        const r  = MusicSelectorPanel._trackRect(index);

        // Row background
        const bg = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
        if (isActive) {
            bg.addColorStop(0, 'rgba(48, 10, 90, 0.92)');
            bg.addColorStop(1, 'rgba(28,  6, 54, 0.92)');
        } else {
            bg.addColorStop(0, 'rgba(22,  6, 42, 0.82)');
            bg.addColorStop(1, 'rgba(14,  3, 26, 0.82)');
        }
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.roundRect(r.x, r.y, r.w, r.h, 8);
        ctx.fill();

        // Border + active glow
        ctx.strokeStyle = isActive ? '#00e5ff' : 'rgba(136, 34, 238, 0.45)';
        ctx.lineWidth   = isActive ? 2 : 1;
        if (isActive) {
            ctx.shadowColor = '#00e5ff';
            ctx.shadowBlur  = 14;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        const midY = r.y + r.h / 2;

        // Track number
        ctx.font         = 'bold 13px "Orbitron", monospace';
        ctx.fillStyle    = isActive ? '#00e5ff' : '#8844aa';
        ctx.textAlign    = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${index + 1}`, r.x + 20, midY);

        // Track label
        ctx.font      = 'bold 15px "Orbitron", monospace';
        ctx.fillStyle = isActive ? '#ffffff' : '#cc99ee';
        ctx.fillText(track.label, r.x + 44, midY);

        // Playing indicator arrow
        if (isActive) {
            ctx.font        = '18px monospace';
            ctx.fillStyle   = '#00e5ff';
            ctx.textAlign   = 'center';
            ctx.shadowColor = '#00e5ff';
            ctx.shadowBlur  = 10;
            ctx.fillText('\u25b6', r.x + r.w - 22, midY);
            ctx.shadowBlur  = 0;
        }
    }
}
